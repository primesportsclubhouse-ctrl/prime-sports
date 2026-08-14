import { NextRequest, NextResponse } from "next/server";

import { recordAuditLog } from "@/lib/supabase/audit-log";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { fetchRosterSessionDetail } from "@/lib/supabase/roster";
import { authorizeBookingForRoster, getRosterSessionBookingId } from "@/lib/supabase/roster-auth";

export const dynamic = "force-dynamic";

type UpdatePayload = {
  active?: unknown;
  sessionToken?: unknown;
};

/** GET — refetches a single roster session's current state (session +
 *  entries). Dual-mode auth like the rest of this route family. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = createServiceRoleClient();

  const bookingId = await getRosterSessionBookingId(supabase, id);
  if (!bookingId) {
    return NextResponse.json({ error: "Roster session not found." }, { status: 404 });
  }

  const sessionToken = request.nextUrl.searchParams.get("sessionToken");
  const auth = await authorizeBookingForRoster(supabase, bookingId, sessionToken);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const detail = await fetchRosterSessionDetail(supabase, id);
    if (!detail) {
      return NextResponse.json({ error: "Roster session not found." }, { status: 404 });
    }
    return NextResponse.json({ session: detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load roster session." },
      { status: 500 },
    );
  }
}

/**
 * PATCH — toggles a session's active state. `active: false` is
 * roster-client.tsx's "End Session" button (sets `ended_at`, but keeps every
 * entry so far — unlike the old local-state `resetSession()`, which threw
 * the whole roster away); `active: true` reactivates it.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let payload: UpdatePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { active, sessionToken } = payload;

  if (typeof active !== "boolean") {
    return NextResponse.json({ error: "active must be a boolean." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const bookingId = await getRosterSessionBookingId(supabase, id);
  if (!bookingId) {
    return NextResponse.json({ error: "Roster session not found." }, { status: 404 });
  }

  const auth = await authorizeBookingForRoster(supabase, bookingId, sessionToken);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { error: updateError } = await supabase
    .from("roster_sessions")
    .update({ active, ended_at: active ? null : new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Best-effort side effect, staff-initiated actions only (auth.staff is null
  // for the guest-organizer path — see authorizeBookingForRoster's doc
  // comment) — never blocks the response, see recordAuditLog's own doc
  // comment.
  if (auth.staff) {
    void recordAuditLog({
      staffId: auth.staff.userId,
      action: active ? "roster_session.reactivate" : "roster_session.end",
      targetTable: "roster_sessions",
      targetId: id,
      payload: { bookingId, active },
    });
  }

  try {
    const detail = await fetchRosterSessionDetail(supabase, id);
    return NextResponse.json({ session: detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load roster session." },
      { status: 500 },
    );
  }
}
