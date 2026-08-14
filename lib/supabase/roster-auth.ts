// Shared "who may manage this roster session" check for the roster-sessions
// Route Handlers. Mirrors the dual-mode shape /api/payment-submissions
// already uses (staff via cookie session, guest via session_token proof) —
// see the RLS comment in the Phase 2 roster migration for why the guest half
// of this isn't (and can't be) a real Postgres RLS policy.

import type { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStaffContext, type StaffContext } from "@/lib/supabase/staff-auth";
import { verifySlotHoldOwnership } from "@/lib/supabase/slot-holds";

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

export type RosterAuthResult =
  | { ok: true; staff: StaffContext | null }
  | { ok: false; status: number; error: string };

/**
 * Authorizes a request against the booking a roster session belongs to:
 * either a signed-in staff member (any role — matches the audit's "staff:
 * verify payments, manage roster" baseline; roster-client.tsx is only
 * reachable via the staff-only /admin/roster route today), or the guest
 * organizer who holds the session_token recorded on that booking's
 * slot_holds row — the same ownership proof every other guest-checkout write
 * in this app uses (bookings PATCH, payment-submissions, waiver acceptance).
 *
 * No customer-facing UI calls the guest path yet, but the schema-level
 * "organizer can manage their own session's roster" requirement is real, so
 * this exists ahead of that surface landing rather than being staff-only in
 * practice by omission.
 */
export async function authorizeBookingForRoster(
  supabase: ServiceRoleClient,
  bookingId: string,
  sessionToken: unknown,
): Promise<RosterAuthResult> {
  const staff = await getStaffContext();
  if (staff) {
    return { ok: true, staff };
  }

  if (typeof sessionToken !== "string" || !sessionToken.trim()) {
    return { ok: false, status: 403, error: "Staff sign-in or sessionToken is required." };
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, court_id, booking_date, time_slot")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }
  if (!booking) {
    return { ok: false, status: 404, error: "Booking not found." };
  }

  let isOwner: boolean;
  try {
    isOwner = await verifySlotHoldOwnership(
      supabase,
      { courtId: booking.court_id, bookingDate: booking.booking_date, timeSlot: booking.time_slot },
      sessionToken,
    );
  } catch (verifyError) {
    return {
      ok: false,
      status: 500,
      error: verifyError instanceof Error ? verifyError.message : "Failed to verify slot ownership.",
    };
  }

  if (!isOwner) {
    return { ok: false, status: 403, error: "Not authorized to manage this roster session." };
  }

  return { ok: true, staff: null };
}

/** Resolves the `booking_id` a roster session belongs to, so callers keyed
 *  by session id (the entries routes) can reuse authorizeBookingForRoster
 *  without duplicating the lookup. Returns null if the session doesn't
 *  exist. */
export async function getRosterSessionBookingId(
  supabase: ServiceRoleClient,
  sessionId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("roster_sessions")
    .select("booking_id")
    .eq("id", sessionId)
    .maybeSingle();

  return data?.booking_id ?? null;
}
