import { NextRequest, NextResponse } from "next/server";

import { recordAuditLog } from "@/lib/supabase/audit-log";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { freeSlotHold } from "@/lib/supabase/slot-holds";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

/**
 * Reject a payment submission: marks the submission `rejected` and cancels
 * its linked booking (there's no "needs new payment" state in the
 * `booking_status` enum, and the queue UI's button is literally labeled
 * "Reject / Cancel Booking" — cancelling is the correct existing intent).
 * Cancelling also frees the underlying slot_holds row immediately, same as
 * a customer-initiated cancel via PATCH /api/bookings/[id], so the slot is
 * bookable again right away instead of sitting held until the TTL expires.
 * This is a genuinely different code path from approve/route.ts, not a
 * copy of it with a different label.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const staff = await getStaffContext();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 403 });
  }

  let notes: string | null = null;
  try {
    const body = await request.json();
    if (typeof body?.notes === "string") {
      notes = body.notes;
    }
  } catch {
    // No body / not JSON — rejection notes are optional.
  }

  const supabase = createServiceRoleClient();

  const { data: submission, error: submissionError } = await supabase
    .from("payment_submissions")
    .select("id, booking_id, status, notes")
    .eq("id", id)
    .maybeSingle();

  if (submissionError) {
    console.error(`[payment-submissions/${id}/reject] Failed to load submission:`, submissionError.message);
    return NextResponse.json({ error: "Could not load that submission. Please try again." }, { status: 500 });
  }
  if (!submission) {
    return NextResponse.json({ error: "Payment submission not found." }, { status: 404 });
  }
  if (submission.status !== "pending") {
    const statusLabel = submission.status === "approved" ? "approved" : "rejected";
    return NextResponse.json(
      { error: `This submission was already ${statusLabel} — refresh the queue to see its current state.` },
      { status: 409 },
    );
  }

  const { error: submissionUpdateError } = await supabase
    .from("payment_submissions")
    .update({ status: "rejected", notes: notes ?? submission.notes })
    .eq("id", id);

  if (submissionUpdateError) {
    console.error(`[payment-submissions/${id}/reject] Failed to update submission status:`, submissionUpdateError.message);
    return NextResponse.json({ error: "Could not reject this submission. Please try again." }, { status: 500 });
  }

  const { data: booking, error: bookingSelectError } = await supabase
    .from("bookings")
    .select("id, court_id, booking_date, time_slot")
    .eq("id", submission.booking_id)
    .maybeSingle();

  if (bookingSelectError) {
    console.error(`[payment-submissions/${id}/reject] Failed to load linked booking:`, bookingSelectError.message);
    return NextResponse.json({ error: "Submission rejected, but the booking couldn't be loaded. Please check it manually." }, { status: 500 });
  }
  if (!booking) {
    return NextResponse.json({ error: "Linked booking not found." }, { status: 404 });
  }

  const { data: updatedBooking, error: bookingUpdateError } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", booking.id)
    .select("id, status")
    .single();

  if (bookingUpdateError) {
    console.error(`[payment-submissions/${id}/reject] Failed to cancel booking:`, bookingUpdateError.message);
    return NextResponse.json({ error: "Submission rejected, but the booking couldn't be cancelled. Please cancel it manually." }, { status: 500 });
  }

  await freeSlotHold(supabase, { courtId: booking.court_id, bookingDate: booking.booking_date, timeSlot: booking.time_slot });

  // Best-effort side effect — never blocks the response, see recordAuditLog's
  // own doc comment.
  void recordAuditLog({
    staffId: staff.userId,
    action: "payment_submission.reject",
    targetTable: "payment_submissions",
    targetId: submission.id,
    payload: {
      bookingId: submission.booking_id,
      submissionFromStatus: "pending",
      submissionToStatus: "rejected",
      bookingToStatus: updatedBooking.status,
      notes,
    },
  });

  return NextResponse.json({ submission: { id: submission.id, status: "rejected" }, booking: updatedBooking });
}
