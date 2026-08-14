import { NextRequest, NextResponse } from "next/server";

import { isValidPaymentChannel, isValidReferenceSource, type PaymentSubmissionQueueItem } from "@/lib/payments";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifySlotHoldOwnership } from "@/lib/supabase/slot-holds";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

// Receipts sit in a private Storage bucket (see the Phase 2 payments
// migration) — staff need a short-lived signed URL, not the raw path, to
// actually view one.
const RECEIPT_SIGNED_URL_TTL_SECONDS = 300;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

type CreateSubmissionPayload = {
  sessionToken?: unknown;
  bookingIds?: unknown;
  channel?: unknown;
  referenceNo?: unknown;
  receiptImageUrl?: unknown;
  notes?: unknown;
  referenceSource?: unknown;
};

export async function POST(request: NextRequest) {
  let payload: CreateSubmissionPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { sessionToken, bookingIds, channel, referenceNo, receiptImageUrl, notes, referenceSource } = payload;

  if (!isNonEmptyString(sessionToken)) {
    return NextResponse.json({ error: "sessionToken is required." }, { status: 400 });
  }
  if (!Array.isArray(bookingIds) || bookingIds.length === 0 || !bookingIds.every(isNonEmptyString)) {
    return NextResponse.json({ error: "bookingIds must be a non-empty array of booking ids." }, { status: 400 });
  }
  if (!isValidPaymentChannel(channel)) {
    return NextResponse.json({ error: "channel must be one of: gcash, maya, bank_transfer." }, { status: 400 });
  }
  if (!isNonEmptyString(referenceNo)) {
    return NextResponse.json({ error: "referenceNo is required." }, { status: 400 });
  }
  if (receiptImageUrl !== undefined && receiptImageUrl !== null && typeof receiptImageUrl !== "string") {
    return NextResponse.json({ error: "receiptImageUrl must be a string." }, { status: 400 });
  }
  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    return NextResponse.json({ error: "notes must be a string." }, { status: 400 });
  }
  // Optional — omitted/undefined defaults to "manual" (same as the column's
  // own DB default), matching every checkout flow that predates the Phase 3
  // OCR integration and never sends this field at all.
  if (referenceSource !== undefined && !isValidReferenceSource(referenceSource)) {
    return NextResponse.json({ error: "referenceSource must be one of: manual, ocr." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const created: { id: string; bookingId: string; status: string }[] = [];

  // Processed sequentially rather than as one atomic transaction — a single
  // checkout can cover several bookings (booking-client.tsx allows picking
  // multiple slots before checkout), and supabase-js's REST interface has no
  // multi-statement transaction primitive short of writing another plpgsql
  // RPC. If a later booking in the list fails validation, submissions
  // already created for earlier bookings in this same request are not
  // rolled back — each is still a fully valid, independently correct
  // payment_submissions row, just not "all or nothing" across the batch.
  for (const bookingId of bookingIds as string[]) {
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, court_id, booking_date, time_slot, status, price_php")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message, created }, { status: 500 });
    }
    if (!booking) {
      return NextResponse.json({ error: `Booking ${bookingId} not found.`, created }, { status: 404 });
    }

    let isOwner: boolean;
    try {
      isOwner = await verifySlotHoldOwnership(
        supabase,
        { courtId: booking.court_id, bookingDate: booking.booking_date, timeSlot: booking.time_slot },
        sessionToken,
      );
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to verify slot ownership.", created },
        { status: 500 },
      );
    }
    if (!isOwner) {
      return NextResponse.json({ error: `Not authorized to submit payment for booking ${bookingId}.`, created }, { status: 403 });
    }
    if (booking.status !== "held" && booking.status !== "pending_payment") {
      return NextResponse.json(
        { error: `Booking ${bookingId} is ${booking.status} and can't accept a new payment submission.`, created },
        { status: 409 },
      );
    }

    const { data: submission, error: insertError } = await supabase
      .from("payment_submissions")
      .insert({
        booking_id: bookingId,
        reference_no: referenceNo.trim(),
        amount_php: booking.price_php ?? 0,
        channel,
        receipt_image_url: receiptImageUrl ?? null,
        notes: notes ?? null,
        reference_source: referenceSource ?? "manual",
      })
      .select("id, booking_id, status")
      .single();

    if (insertError) {
      const isDuplicate = insertError.code === "23505";
      return NextResponse.json(
        {
          error: isDuplicate
            ? `That reference number was already submitted for booking ${bookingId}.`
            : insertError.message,
          created,
        },
        { status: isDuplicate ? 409 : 500 },
      );
    }

    if (booking.status !== "pending_payment") {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "pending_payment" })
        .eq("id", bookingId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message, created }, { status: 500 });
      }
    }

    created.push({ id: submission.id, bookingId: submission.booking_id, status: submission.status });
  }

  return NextResponse.json({ submissions: created }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const staff = await getStaffContext();

  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 403 });
  }

  const statusParam = request.nextUrl.searchParams.get("status") ?? "pending";
  const validStatuses = ["pending", "approved", "rejected"];

  if (!validStatuses.includes(statusParam)) {
    return NextResponse.json({ error: `status must be one of: ${validStatuses.join(", ")}.` }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: rows, error } = await supabase
    .from("payment_submissions")
    .select(
      "id, booking_id, reference_no, amount_php, channel, receipt_image_url, submitted_at, status, notes, reference_source, bookings(booking_date, time_slot, court_id, customer_id, courts(name), customers(full_name, email, phone))",
    )
    .eq("status", statusParam)
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items: PaymentSubmissionQueueItem[] = await Promise.all(
    (rows ?? []).map(async (row) => {
      const booking = (row as unknown as {
        bookings: {
          booking_date: string;
          time_slot: string;
          court_id: string;
          customer_id: string | null;
          courts: { name: string } | null;
          customers: { full_name: string; email: string; phone: string } | null;
        } | null;
      }).bookings;

      let receiptImageUrl: string | null = null;
      if (row.receipt_image_url) {
        const { data: signed } = await supabase.storage
          .from("receipts")
          .createSignedUrl(row.receipt_image_url, RECEIPT_SIGNED_URL_TTL_SECONDS);
        receiptImageUrl = signed?.signedUrl ?? null;
      }

      return {
        id: row.id,
        bookingId: row.booking_id,
        customerName: booking?.customers?.full_name ?? "Unknown",
        reference: row.reference_no,
        courtName: booking?.courts?.name ?? "Unknown court",
        bookingDate: booking?.booking_date ?? "",
        timeSlot: booking?.time_slot ?? "",
        amountPhp: Number(row.amount_php),
        channel: row.channel,
        submittedAt: row.submitted_at,
        phone: booking?.customers?.phone ?? "",
        email: booking?.customers?.email ?? "",
        notes: row.notes,
        receiptImageUrl,
        status: row.status,
        referenceSource: row.reference_source,
      } satisfies PaymentSubmissionQueueItem;
    }),
  );

  return NextResponse.json({ submissions: items });
}
