import { NextRequest, NextResponse } from "next/server";

import { parseDateStringLocal, timeSlotToHour24 } from "@/lib/booking";
import { isValidPaymentChannel, isValidReferenceSource, type PaymentSubmissionQueueItem } from "@/lib/payments";
import { formatCurrency, formatHour12, formatPrimeDate } from "@/lib/prime-sports";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifySlotHoldOwnership } from "@/lib/supabase/slot-holds";
import { sendBookingSubmittedNotification } from "@/lib/supabase/notifications";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

// Receipts sit in a private Storage bucket (see the Phase 2 payments
// migration) — staff need a short-lived signed URL, not the raw path, to
// actually view one.
const RECEIPT_SIGNED_URL_TTL_SECONDS = 300;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** "Court 3 on 20 Aug 2026 at 9:00 AM" — human-readable stand-in for a raw
 *  booking id whenever an error message needs to refer to which reservation
 *  it's about. A customer submitting for verification can see their own
 *  slots right there on the checkout page, but has no way to recognize a
 *  UUID as "theirs." */
function friendlySlotLabel(booking: { booking_date: string; time_slot: string }) {
  const date = formatPrimeDate(parseDateStringLocal(booking.booking_date));
  const time = formatHour12(timeSlotToHour24(booking.time_slot));
  return `${date} at ${time}`;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "not yet reserved",
  confirmed: "already confirmed",
  cancelled: "no longer reserved — it was cancelled",
  no_show: "no longer available",
};

/** Once a payment is submitted, `bookings_slot_unique_idx` — not this hold —
 *  is what actually prevents the slot being double-booked (the bookings row
 *  itself is now `pending_payment`, which already blocks a fresh insert for
 *  the same court/date/time). The hold's only remaining job past this point
 *  is letting this browser session recover its own reservation via
 *  GET /api/bookings, which requires an *active* hold to identify "which
 *  bookings belong to this session" (bookings has no session_token column —
 *  see reservation-provider.tsx's fetchFromServer). Manual staff review can
 *  reasonably take longer than the original ~15-minute decision window, so
 *  without extending it here, a customer who checks back on checkout later
 *  would find their own already-submitted reservation has silently vanished
 *  from their view, even though it's still very much alive and awaiting
 *  review. 30 days comfortably covers any realistic review turnaround. */
const PENDING_REVIEW_HOLD_EXTENSION_MS = 30 * 24 * 60 * 60 * 1000;

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
  // Accumulated across the loop below to fire one "booking submitted" email
  // for the whole batch once every submission has been created — see
  // sendBookingSubmittedNotification() after the loop. `customerContact`
  // only needs to be captured once since every booking in one checkout
  // submission belongs to the same guest/session.
  const submittedSlots: { courtName: string; bookingDateLabel: string; timeSlotLabel: string; pricePhpLabel: string }[] = [];
  let customerContact: { name: string; email: string | null } | null = null;

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
      .select("id, court_id, booking_date, time_slot, status, price_php, courts(name), customers(full_name, email)")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError) {
      console.error(`[payment-submissions] Failed to load booking ${bookingId}:`, bookingError.message);
      return NextResponse.json({ error: "Could not load one of your reserved slots. Please try again.", created }, { status: 500 });
    }
    if (!booking) {
      return NextResponse.json(
        { error: "One of your reserved slots could not be found — it may have expired. Please head back to Schedule and pick it again.", created },
        { status: 404 },
      );
    }

    let isOwner: boolean;
    try {
      isOwner = await verifySlotHoldOwnership(
        supabase,
        { courtId: booking.court_id, bookingDate: booking.booking_date, timeSlot: booking.time_slot },
        sessionToken,
      );
    } catch (error) {
      console.error(
        `[payment-submissions] Ownership check failed for booking ${bookingId}:`,
        error instanceof Error ? error.message : error,
      );
      return NextResponse.json(
        { error: "Could not verify your reservation. Please refresh and try again.", created },
        { status: 500 },
      );
    }
    if (!isOwner) {
      return NextResponse.json(
        { error: "That reservation doesn't belong to your current session. Please head back to Schedule and try again.", created },
        { status: 403 },
      );
    }
    if (booking.status !== "held" && booking.status !== "pending_payment") {
      const statusLabel = STATUS_LABELS[booking.status] ?? "no longer available";
      return NextResponse.json(
        { error: `Your ${friendlySlotLabel(booking)} slot is ${statusLabel} and can't accept a new payment submission.`, created },
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

      if (isDuplicate) {
        return NextResponse.json(
          {
            error: `That reference number was already submitted for your ${friendlySlotLabel(booking)} slot. Please double-check it or use a different one.`,
            created,
          },
          { status: 409 },
        );
      }

      console.error(`[payment-submissions] Insert failed for booking ${bookingId}:`, insertError.message);
      return NextResponse.json({ error: "Could not save your payment submission. Please try again.", created }, { status: 500 });
    }

    // Best-effort — logged, not fatal, since the submission itself already
    // succeeded either way. See PENDING_REVIEW_HOLD_EXTENSION_MS above.
    const { error: holdExtendError } = await supabase
      .from("slot_holds")
      .update({ expires_at: new Date(Date.now() + PENDING_REVIEW_HOLD_EXTENSION_MS).toISOString() })
      .eq("court_id", booking.court_id)
      .eq("booking_date", booking.booking_date)
      .eq("time_slot", booking.time_slot);

    if (holdExtendError) {
      console.error(`[payment-submissions] Failed to extend hold for booking ${bookingId}:`, holdExtendError.message);
    }

    if (booking.status !== "pending_payment") {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "pending_payment" })
        .eq("id", bookingId);

      if (updateError) {
        console.error(`[payment-submissions] Failed to update booking ${bookingId} to pending_payment:`, updateError.message);
        return NextResponse.json(
          { error: "Your reference was saved, but we couldn't update the booking status. Please contact staff to confirm.", created },
          { status: 500 },
        );
      }
    }

    const bookingJoins = booking as unknown as {
      courts: { name: string } | null;
      customers: { full_name: string; email: string } | null;
    };

    submittedSlots.push({
      courtName: bookingJoins.courts?.name ?? "your court",
      bookingDateLabel: formatPrimeDate(parseDateStringLocal(booking.booking_date)),
      timeSlotLabel: formatHour12(timeSlotToHour24(booking.time_slot)),
      pricePhpLabel: formatCurrency(Number(booking.price_php ?? 0)),
    });

    if (!customerContact && bookingJoins.customers) {
      customerContact = { name: bookingJoins.customers.full_name, email: bookingJoins.customers.email };
    }

    created.push({ id: submission.id, bookingId: submission.booking_id, status: submission.status });
  }

  // Best-effort side effect, same non-blocking contract as every other
  // fire-and-forget notification in this app (see sendBookingConfirmationNotifications
  // in approve/route.ts) — a failed/unconfigured email must never fail this
  // request, and the submission is already fully saved above regardless.
  // Distinct from that later "booking confirmed" email: this one fires now,
  // right after the guest submits proof of payment, not once staff approve it.
  if (customerContact) {
    void sendBookingSubmittedNotification({
      bookingIds: created.map((item) => item.bookingId),
      customerName: customerContact.name,
      email: customerContact.email,
      referenceNo: referenceNo.trim(),
      slots: submittedSlots,
    });
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
    console.error("[payment-submissions] Failed to load the queue:", error.message);
    return NextResponse.json({ error: "Could not load the verification queue. Please try again." }, { status: 500 });
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
