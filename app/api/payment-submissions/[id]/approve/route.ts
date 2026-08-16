import { NextRequest, NextResponse } from "next/server";

import { parseDateStringLocal, timeSlotToHour24 } from "@/lib/booking";
import { formatCurrency, formatHour12, formatPrimeDate } from "@/lib/prime-sports";
import { getSiteUrl } from "@/lib/site-url";
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
    .select(
      "id, court_id, status, booking_date, time_slot, price_php, customers(full_name, email, phone), courts(name)",
    )
    .single();

  if (bookingUpdateError) {
    return NextResponse.json({ error: bookingUpdateError.message }, { status: 500 });
  }

  const booking = bookingRow as unknown as {
    id: string;
    court_id: string;
    status: string;
    booking_date: string;
    time_slot: string;
    price_php: number | string | null;
    customers: { full_name: string; email: string; phone: string } | null;
    courts: { name: string } | null;
  };

  // slot_holds isn't freed on approval (only on reject/cancel/no_show — see
  // lib/supabase/slot-holds.ts), so the guest's session_token from checkout
  // is still sitting on this exact slot right now. That's the same token
  // reservation-provider.tsx already persists to localStorage and threads
  // through every other guest-checkout write, and it's the right thing to
  // embed in a shareable "check in your group" link: whoever holds it has
  // already proven ownership of this booking once, at checkout time. Missing
  // (extremely unlikely — the hold row this reads from is only ever
  // deleted on reject/cancel/no_show, none of which apply to a submission
  // that just got approved) degrades honestly to no roster link in the
  // email, not a broken one.
  const { data: slotHold } = await supabase
    .from("slot_holds")
    .select("session_token")
    .eq("court_id", booking.court_id)
    .eq("booking_date", booking.booking_date)
    .eq("time_slot", booking.time_slot)
    .maybeSingle();

  const rosterCheckinUrl = slotHold?.session_token
    ? `${getSiteUrl()}/roster/${booking.id}?token=${encodeURIComponent(slotHold.session_token)}`
    : null;

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
    rosterCheckinUrl,
  });

  return NextResponse.json({
    submission: { id: submission.id, status: "approved" },
    booking: { id: booking.id, status: booking.status },
  });
}
