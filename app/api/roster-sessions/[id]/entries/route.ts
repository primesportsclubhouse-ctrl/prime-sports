import { NextRequest, NextResponse } from "next/server";

import { isNonEmptyString } from "@/lib/roster";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { fetchRosterSessionDetail } from "@/lib/supabase/roster";
import { authorizeBookingForRoster, getRosterSessionBookingId } from "@/lib/supabase/roster-auth";

export const dynamic = "force-dynamic";

type AddPlayerPayload = {
  playerName?: unknown;
  sessionToken?: unknown;
};

/**
 * POST — adds a player to a roster session, replacing roster-client.tsx's
 * `getRandomName()` placeholder generator: the organizer/staff member now
 * types the actual player's name and it's persisted here.
 *
 * The 10-player cap is enforced twice: the pre-check below (fast, friendly
 * 409) and, underneath it, the `roster_entries_capacity_guard` trigger from
 * the Phase 2 roster migration (the actual concurrency-safe guarantee — see
 * that migration's comments for why the app-layer check alone isn't
 * trustworthy under concurrent requests).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;

  let payload: AddPlayerPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { playerName, sessionToken } = payload;

  if (!isNonEmptyString(playerName)) {
    return NextResponse.json({ error: "playerName is required." }, { status: 400 });
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

  const { data: session, error: sessionError } = await supabase
    .from("roster_sessions")
    .select("active")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }
  if (!session) {
    return NextResponse.json({ error: "Roster session not found." }, { status: 404 });
  }
  // Matches roster-client.tsx's existing `!sessionActive` guard on
  // addPlayer() — enforced server-side too, not just by disabling the button.
  if (!session.active) {
    return NextResponse.json(
      { error: "Session is not active — activate it before adding players." },
      { status: 409 },
    );
  }

  // head:true returns the row count on the response's `count` field, not
  // `data` (which stays null) — this is a fast pre-check, not the real
  // enforcement (that's the DB trigger insert below relies on).
  const { count: currentCount, error: countError } = await supabase
    .from("roster_entries")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const { data: courtCapacityRow } = await supabase
    .from("roster_sessions")
    .select("courts(capacity)")
    .eq("id", sessionId)
    .maybeSingle();
  const capacity =
    (courtCapacityRow as unknown as { courts: { capacity: number } | null } | null)?.courts?.capacity ?? 10;

  if ((currentCount ?? 0) >= capacity) {
    return NextResponse.json(
      { error: "Court at capacity — remove a player before adding another." },
      { status: 409 },
    );
  }

  const nowIso = new Date().toISOString();
  const { error: insertError } = await supabase.from("roster_entries").insert({
    session_id: sessionId,
    player_name: playerName.trim(),
    checked_in: true,
    check_in_time: nowIso,
  });

  if (insertError) {
    // errcode 23514 (check_violation) is the capacity trigger firing — the
    // app-layer count check above should already have caught this, but a
    // concurrent add from another tab could still race past it.
    const atCapacity = insertError.code === "23514";
    return NextResponse.json(
      {
        error: atCapacity
          ? "Court at capacity — remove a player before adding another."
          : insertError.message,
      },
      { status: atCapacity ? 409 : 500 },
    );
  }

  try {
    const detail = await fetchRosterSessionDetail(supabase, sessionId);
    return NextResponse.json({ session: detail }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load roster session." },
      { status: 500 },
    );
  }
}
