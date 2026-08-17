import { NextRequest, NextResponse } from "next/server";

import {
  hour24ToTimeSlot,
  isValidDateString,
  isValidHour24,
  isValidSportKey,
  parseDateStringLocal,
  timeSlotToHour24,
} from "@/lib/booking";
import type { SportKey } from "@/lib/prime-sports";
import { recordAuditLog } from "@/lib/supabase/audit-log";
import { resolveCourtsForSport } from "@/lib/supabase/courts";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

const MAX_RANGE_DAYS = 31;

export type AvailabilityBlockEntry = {
  date: string;
  courtIndex: number;
  hour24: number;
  reason: string | null;
};

/**
 * GET — staff-only. Loads every existing `slot_blocks` row for a sport within
 * a date range, so availability-editor.tsx's `blockedSlots` Set doesn't
 * always start empty on load/week-change/sport-switch the way it used to.
 */
export async function GET(request: NextRequest) {
  const staff = await getStaffContext();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const sportParam = params.get("sport");
  const fromParam = params.get("from");
  const toParam = params.get("to");

  if (!isValidSportKey(sportParam)) {
    return NextResponse.json({ error: "sport must be 'pickleball' or 'badminton'." }, { status: 400 });
  }
  if (!fromParam || !isValidDateString(fromParam) || !toParam || !isValidDateString(toParam)) {
    return NextResponse.json(
      { error: "from and to must both be formatted as YYYY-MM-DD." },
      { status: 400 },
    );
  }
  if (toParam < fromParam) {
    return NextResponse.json({ error: "to must not be before from." }, { status: 400 });
  }

  const rangeDays =
    Math.round(
      (parseDateStringLocal(toParam).getTime() - parseDateStringLocal(fromParam).getTime()) /
        (24 * 60 * 60 * 1000),
    ) + 1;
  if (rangeDays > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `Date range too wide — max ${MAX_RANGE_DAYS} days per request.` },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();

  let courts;
  try {
    courts = await resolveCourtsForSport(supabase, sportParam);
  } catch (error) {
    console.error("[availability-blocks] Failed to resolve courts:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not load courts for this sport. Please try again." }, { status: 500 });
  }

  const courtIds = courts.map((court) => court.id);
  if (courtIds.length === 0) {
    return NextResponse.json({ blocks: [] });
  }

  const courtIndexById = new Map(courts.map((court) => [court.id, court.courtIndex]));

  const { data: rows, error: blocksError } = await supabase
    .from("slot_blocks")
    .select("court_id, blocked_date, time_slot, reason")
    .in("court_id", courtIds)
    .gte("blocked_date", fromParam)
    .lte("blocked_date", toParam);

  if (blocksError) {
    console.error("[availability-blocks] Failed to load blocks:", blocksError.message);
    return NextResponse.json({ error: "Could not load existing blocks for this week. Please try again." }, { status: 500 });
  }

  const blocks: AvailabilityBlockEntry[] = (rows ?? []).map((row) => ({
    date: row.blocked_date,
    courtIndex: courtIndexById.get(row.court_id) ?? -1,
    hour24: timeSlotToHour24(row.time_slot),
    reason: row.reason,
  }));

  return NextResponse.json({ blocks });
}

type SaveBlockEntry = {
  date?: unknown;
  courtIndex?: unknown;
  hour24?: unknown;
};

type SaveBlocksPayload = {
  sport?: unknown;
  dates?: unknown;
  blocked?: unknown;
};

/**
 * POST — staff-only. Saves the *full* desired blocked-set for one sport
 * across one or more dates at once, matching availability-editor.tsx's
 * "Save Changes" semantics: `blockedSlots` accumulates toggles across every
 * selected date (not just the one currently on screen), so this reconciles
 * every date in `dates` in the same request — inserting newly-blocked slots
 * and deleting newly-unblocked ones — rather than only handling whichever
 * date happens to be active.
 *
 * Reconciliation is "delete everything for (these courts, these dates), then
 * insert exactly what should exist" rather than a diff — `blocked` is already
 * the complete desired state per date (not a list of changes), so a diff
 * would just be extra work for the same result. Not wrapped in a single DB
 * transaction (supabase-js's REST interface has no multi-statement
 * transaction primitive short of another plpgsql RPC — see
 * /api/payment-submissions' POST handler for the same tradeoff) — acceptable
 * here since this is a single staff member's own save, not a
 * multi-writer race like booking creation.
 */
export async function POST(request: NextRequest) {
  const staff = await getStaffContext();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 403 });
  }

  let payload: SaveBlocksPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { sport, dates, blocked } = payload;

  if (!isValidSportKey(sport)) {
    return NextResponse.json({ error: "sport must be 'pickleball' or 'badminton'." }, { status: 400 });
  }
  if (!Array.isArray(dates) || dates.length === 0 || !dates.every(isValidDateString)) {
    return NextResponse.json(
      { error: "dates must be a non-empty array of YYYY-MM-DD strings." },
      { status: 400 },
    );
  }
  if (!Array.isArray(blocked)) {
    return NextResponse.json({ error: "blocked must be an array." }, { status: 400 });
  }

  const dateSet = new Set(dates as string[]);
  const sportKey = sport as SportKey;

  const supabase = createServiceRoleClient();

  let courts;
  try {
    courts = await resolveCourtsForSport(supabase, sportKey);
  } catch (error) {
    console.error("[availability-blocks] Failed to resolve courts:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not load courts for this sport. Please try again." }, { status: 500 });
  }

  const courtIds = courts.map((court) => court.id);
  const courtIdByIndex = new Map(courts.map((court) => [court.courtIndex, court.id]));

  const normalized: { court_id: string; blocked_date: string; time_slot: string }[] = [];

  for (const raw of blocked as SaveBlockEntry[]) {
    const { date, courtIndex, hour24 } = raw ?? {};

    if (!isValidDateString(date) || !dateSet.has(date)) {
      return NextResponse.json(
        { error: "Every blocked entry's date must be one of the dates being saved." },
        { status: 400 },
      );
    }
    if (typeof courtIndex !== "number" || !Number.isInteger(courtIndex) || !courtIdByIndex.has(courtIndex)) {
      return NextResponse.json(
        { error: `One of the selected courts isn't valid for ${sportKey}. Please refresh and try again.` },
        { status: 400 },
      );
    }
    if (!isValidHour24(hour24)) {
      return NextResponse.json({ error: "hour24 is not one of the club's operating hours." }, { status: 400 });
    }

    normalized.push({
      court_id: courtIdByIndex.get(courtIndex) as string,
      blocked_date: date,
      time_slot: hour24ToTimeSlot(hour24),
    });
  }

  if (courtIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("slot_blocks")
      .delete()
      .in("court_id", courtIds)
      .in("blocked_date", Array.from(dateSet));

    if (deleteError) {
      console.error("[availability-blocks] Failed to clear existing blocks:", deleteError.message);
      return NextResponse.json({ error: "Could not save availability changes. Please try again." }, { status: 500 });
    }
  }

  if (normalized.length > 0) {
    const { error: insertError } = await supabase.from("slot_blocks").insert(
      normalized.map((entry) => ({
        ...entry,
        created_by: staff.userId,
      })),
    );

    if (insertError) {
      console.error("[availability-blocks] Failed to save new blocks:", insertError.message);
      return NextResponse.json({ error: "Could not save availability changes. Please try again." }, { status: 500 });
    }
  }

  // Best-effort side effect — never blocks the response, see
  // recordAuditLog's own doc comment. There's no single row this action maps
  // to (it's a batch reconcile across N dates), so `targetId` is a synthetic
  // id for this save rather than a real slot_blocks row — `payload_json`
  // carries the actual "what changed" detail.
  void recordAuditLog({
    staffId: staff.userId,
    action: "availability.update",
    targetTable: "slot_blocks",
    targetId: crypto.randomUUID(),
    payload: { sport: sportKey, dates: Array.from(dateSet), blockedCount: normalized.length },
  });

  const echoed: AvailabilityBlockEntry[] = normalized.map((entry) => ({
    date: entry.blocked_date,
    courtIndex: courts.find((court) => court.id === entry.court_id)?.courtIndex ?? -1,
    hour24: timeSlotToHour24(entry.time_slot),
    reason: null,
  }));

  return NextResponse.json({ blocks: echoed });
}
