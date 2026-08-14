import { NextRequest, NextResponse } from "next/server";

import { parseDateStringLocal, timeSlotToHour24 } from "@/lib/booking";
import { formatCurrency, formatHour12, formatPrimeDate } from "@/lib/prime-sports";
import { recordAuditLog } from "@/lib/supabase/audit-log";
import { sendBookingConfirmationNotifications } from "@/lib/supabase/notifications";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

/**
 * Approve a payment submission: marks the submission `approved` and moves
 * its linked booking to `confirmed`. This is the "money matched the bank
 * statement" outcome — distinct from reject/route.ts below, which cancels
 * the booking instead. Previously both the queue UI's "Match & Approve" and
 * "Reject / Cancel Booking" buttons called the exact same
 * `removeActiveSubmission()` handler; these are now two separate route
 * handlers with different DB effects.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const staff = await getStaffContext();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 403 });
  }

  const supabase = createServiceRoleClient();

  const { data: submission, error: submissionError } = await supabase
    .from("payment_submissions")
    .select("id, booking_id, status")
    .eq("id", id)
    .maybeSingle();

  if (submissionError) {
    return NextResponse.json({ error: submissionError.message }, { status: 500 });
  }
  if (!submission) {
    return NextResponse.json({ error: "Payment submission not found." }, { status: 404 });
  }
  if (submission.status !== "pending") {
    return NextResponse.json(
      { error: `This submission was already ${submission.status}.` },
      { status: 409 },
    );
  }

  const { error: submissionUpdateError } = await supabase
    .from("payment_submissions")
    .update({ status: "approved" })
    .eq("id", id);

  if (submissionUpdateError) {
    return NextResponse.json({ error: submissionUpdateError.message }, { status: 500 });
  }

  const { data: bookingRow, error: bookingUpdateError } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", submission.booking_id)
    .select("id, status, booking_date, time_slot, price_php, customers(full_name, email, phone), courts(name)")
    .single();

  if (bookingUpdateError) {
    return NextResponse.json({ error: bookingUpdateError.message }, { status: 500 });
  }

  const booking = bookingRow as unknown as {
    id: string;
    status: string;
    booking_date: string;
    time_slot: string;
    price_php: number | string | null;
    customers: { full_name: string; email: string; phone: string } | null;
    courts: { name: string } | null;
  };

  // Best-effort side effect — never blocks the response, see recordAuditLog's
  // own doc comment.
  void recordAuditLog({
    staffId: staff.userId,
    action: "payment_submission.approve",
    targetTable: "payment_submissions",
    targetId: submission.id,
    payload: {
      bookingId: submission.booking_id,
      submissionFromStatus: "pending",
      submissionToStatus: "approved",
      bookingToStatus: booking.status,
    },
  });

  // Best-effort side effect, same non-blocking contract as recordAuditLog
  // above — a failed/unconfigured notification (see lib/email.ts /
  // lib/sms.ts's honest-degradation behavior) must never fail this request.
  void sendBookingConfirmationNotifications({
    bookingId: booking.id,
    event: "booking_confirmed",
    customerName: booking.customers?.full_name ?? "there",
    email: booking.customers?.email ?? null,
    phone: booking.customers?.phone ?? null,
    courtName: booking.courts?.name ?? "your court",
    bookingDateLabel: formatPrimeDate(parseDateStringLocal(booking.booking_date)),
    timeSlotLabel: formatHour12(timeSlotToHour24(booking.time_slot)),
    pricePhpLabel: formatCurrency(Number(booking.price_php ?? 0)),
  });

  return NextResponse.json({
    submission: { id: submission.id, status: "approved" },
    booking: { id: booking.id, status: booking.status },
  });
}
