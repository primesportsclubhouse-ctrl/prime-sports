// Supabase-touching slot_holds helpers shared across route handlers that
// need to prove guest-checkout ownership or free a slot early. Split out
// from lib/booking.ts, which is deliberately Supabase-client-free — see the
// header comment there.

import type { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { BookingSlotKey } from "@/lib/booking";

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

/** Guest bookings have no auth session — ownership is proven the same way
 *  /api/bookings/[id]'s PATCH handler already proves it: holding the
 *  session token recorded on the still-live `slot_holds` row for this exact
 *  slot. Shared here so /api/payment-submissions and the waiver route don't
 *  each reimplement the same check. */
export async function verifySlotHoldOwnership(
  supabase: ServiceRoleClient,
  slot: BookingSlotKey,
  sessionToken: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("slot_holds")
    .select("id")
    .eq("court_id", slot.courtId)
    .eq("booking_date", slot.bookingDate)
    .eq("time_slot", slot.timeSlot)
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

/** Cancelling/no-showing a booking frees its slot immediately rather than
 *  waiting out the hold's TTL. Shared between /api/bookings/[id]'s PATCH
 *  handler and /api/payment-submissions/[id]/reject, which both need to do
 *  this exact cleanup. */
export async function freeSlotHold(supabase: ServiceRoleClient, slot: BookingSlotKey): Promise<void> {
  await supabase
    .from("slot_holds")
    .delete()
    .eq("court_id", slot.courtId)
    .eq("booking_date", slot.bookingDate)
    .eq("time_slot", slot.timeSlot);
}
