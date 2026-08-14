import { NextRequest, NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { fetchRosterSessionDetail } from "@/lib/supabase/roster";
import { authorizeBookingForRoster, getRosterSessionBookingId } from "@/lib/supabase/roster-auth";

export const dynamic = "force-dynamic";

type TogglePayload = {
  checkedIn?: unknown;
  sessionToken?: unknown;
};

/** PATCH — toggles a single player's checked-in state, replacing
 *  roster-client.tsx's local `setPlayers()` toggle handler. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const { id: sessionId, entryId } = await params;

  let payload: TogglePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { checkedIn, sessionToken } = payload;

  if (typeof checkedIn !== "boolean") {
    return NextResponse.json({ error: "checkedIn must be a boolean." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const bookingId = await getRosterSessionBookingId(supabase, sessionId);
  if (!bookingId) {
    return NextResponse.json({ error: "Roster session not found." }, { status: 404 });
  }

  const auth = await authorizeBookingForRoster(supabase, bookingId, sessionToken);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: entry, error: entryError } = await supabase
    .from("roster_entries")
    .select("id")
    .eq("id", entryId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (entryError) {
    return NextResponse.json({ error: entryError.message }, { status: 500 });
  }
  if (!entry) {
    return NextResponse.json({ error: "Player not found in this roster session." }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("roster_entries")
    .update({ checked_in: checkedIn, check_in_time: checkedIn ? new Date().toISOString() : null })
    .eq("id", entryId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  try {
    const detail = await fetchRosterSessionDetail(supabase, sessionId);
    return NextResponse.json({ session: detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load roster session." },
      { status: 500 },
    );
  }
}

/** DELETE — removes a player from the roster, replacing roster-client.tsx's
 *  local `setPlayers()` filter-out handler. sessionToken (for the guest
 *  organizer path) travels as a query param, matching GET /api/bookings's
 *  convention for session-token-bearing GET/DELETE requests that don't
 *  otherwise need a JSON body. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const { id: sessionId, entryId } = await params;
  const sessionToken = request.nextUrl.searchParams.get("sessionToken");

  const supabase = createServiceRoleClient();

  const bookingId = await getRosterSessionBookingId(supabase, sessionId);
  if (!bookingId) {
    return NextResponse.json({ error: "Roster session not found." }, { status: 404 });
  }

  const auth = await authorizeBookingForRoster(supabase, bookingId, sessionToken);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: entry, error: entryError } = await supabase
    .from("roster_entries")
    .select("id")
    .eq("id", entryId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (entryError) {
    return NextResponse.json({ error: entryError.message }, { status: 500 });
  }
  if (!entry) {
    return NextResponse.json({ error: "Player not found in this roster session." }, { status: 404 });
  }

  const { error: deleteError } = await supabase.from("roster_entries").delete().eq("id", entryId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  try {
    const detail = await fetchRosterSessionDetail(supabase, sessionId);
    return NextResponse.json({ session: detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load roster session." },
      { status: 500 },
    );
  }
}
