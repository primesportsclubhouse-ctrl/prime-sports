import { NextRequest, NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { fetchRosterBookingSummary, fetchRosterSessionDetailByBookingId } from "@/lib/supabase/roster";
import { authorizeBookingForRoster } from "@/lib/supabase/roster-auth";

export const dynamic = "force-dynamic";

/**
 * GET — the lookup nothing exposed before this: the public, booking-scoped
 * check-in page (app/(public)/roster/[bookingId]/page.tsx) only ever knows
 * its own `bookingId` and `sessionToken` (the same token
 * reservation-provider.tsx already persists to localStorage and threads
 * through every other guest-checkout write — bookings PATCH, waiver
 * acceptance, payment submissions), never a `roster_sessions.id`.
 *
 * Dual-mode auth like the rest of the /api/roster-sessions family
 * (authorizeBookingForRoster): a signed-in staff member, or the guest
 * organizer proven via the session_token still recorded on the booking's
 * slot_holds row (that row isn't freed on payment approval — see
 * lib/supabase/slot-holds.ts — so the token used throughout checkout stays
 * valid for a confirmed booking too).
 *
 * `token` (not `sessionToken`) is the query param name here, deliberately:
 * it's the exact same value, but this route is the one meant to be hit from
 * a plain shareable URL (`/roster/[bookingId]?token=...`), so it matches
 * that URL's own vocabulary rather than the JSON-body-shaped `sessionToken`
 * convention the mutation routes (POST/PATCH/DELETE) use.
 *
 * Returns `{ booking, session }` — `session` is `null` if staff hasn't
 * activated a roster session for this booking yet (the expected, common
 * "still waiting" state, not an error). 404 if the booking itself doesn't
 * exist, 403 if authorization fails.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;
  const token = request.nextUrl.searchParams.get("token");

  const supabase = createServiceRoleClient();

  const auth = await authorizeBookingForRoster(supabase, bookingId, token);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const booking = await fetchRosterBookingSummary(supabase, bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const session = await fetchRosterSessionDetailByBookingId(supabase, bookingId);

    return NextResponse.json({ booking, session });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load roster check-in." },
      { status: 500 },
    );
  }
}
