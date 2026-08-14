import { NextRequest, NextResponse } from "next/server";

import { isValidSportKey } from "@/lib/booking";
import { fetchRosterSessionHistory } from "@/lib/supabase/roster";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

/**
 * GET — staff-only ledger of *past* court-side check-in sessions for one
 * sport's court roster: the "History" tab that sits next to roster-client.tsx's
 * live Court-Side Check-In view. Replaces lib/prime-sports.ts's mock
 * createRosterSessionHistory() with real rows, derived via
 * fetchRosterSessionHistory() (see lib/supabase/roster.ts for the full
 * status-derivation rules — roster_sessions has no explicit status column).
 *
 * Staff-only like the rest of the /api/roster-sessions family's staff-facing
 * reads (see GET /api/roster-sessions) — this is an admin-side view, no
 * guest/organizer path is needed here.
 */
export async function GET(request: NextRequest) {
  const staff = await getStaffContext();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 403 });
  }

  const sportParam = request.nextUrl.searchParams.get("sport");
  if (!isValidSportKey(sportParam)) {
    return NextResponse.json({ error: "sport must be 'pickleball' or 'badminton'." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  try {
    const sessions = await fetchRosterSessionHistory(supabase, sportParam);
    return NextResponse.json({ sessions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load roster session history." },
      { status: 500 },
    );
  }
}
