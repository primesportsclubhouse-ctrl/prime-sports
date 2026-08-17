import { NextRequest, NextResponse } from "next/server";

import {
  type AvailabilityCourt,
  type AvailabilityDay,
  type AvailabilitySlot,
  type SlotAvailability,
  deriveDayType,
  deriveTimeOfDay,
  generateDaySlots,
  hour24ToTimeSlot,
  isValidDateString,
  isValidSportKey,
  parseCourtName,
  parseDateStringLocal,
  todayDateString,
  toDateString,
} from "@/lib/booking";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Uses `request.nextUrl` (a request-scoped API), which already opts this out
// of static/build-time evaluation per Next's Route Handler caching rules —
// `force-dynamic` here just makes that explicit rather than incidental.
export const dynamic = "force-dynamic";

const MAX_RANGE_DAYS = 14;

function addDays(dateStr: string, days: number) {
  const date = parseDateStringLocal(dateStr);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const courtIdParam = params.get("courtId");
  const sportParam = params.get("sport");
  const dateParam = params.get("date");
  const fromParam = params.get("from");
  const toParam = params.get("to");

  if (sportParam && !isValidSportKey(sportParam)) {
    return NextResponse.json({ error: "sport must be 'pickleball' or 'badminton'." }, { status: 400 });
  }

  let from = todayDateString();
  let to = from;

  if (dateParam) {
    if (!isValidDateString(dateParam)) {
      return NextResponse.json({ error: "date must be formatted as YYYY-MM-DD." }, { status: 400 });
    }
    from = dateParam;
    to = dateParam;
  } else if (fromParam || toParam) {
    if (!fromParam || !isValidDateString(fromParam) || !toParam || !isValidDateString(toParam)) {
      return NextResponse.json(
        { error: "from and to must both be formatted as YYYY-MM-DD." },
        { status: 400 },
      );
    }
    from = fromParam;
    to = toParam;
  }

  if (to < from) {
    return NextResponse.json({ error: "to must not be before from." }, { status: 400 });
  }

  const dateList: string[] = [];
  for (let cursor = from; cursor <= to && dateList.length < MAX_RANGE_DAYS; cursor = addDays(cursor, 1)) {
    dateList.push(cursor);
  }

  if (dateList.length === 0 || dateList[dateList.length - 1] !== to) {
    return NextResponse.json(
      { error: `Date range too wide — max ${MAX_RANGE_DAYS} days per request.` },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();

  const { data: allCourts, error: courtsError } = await supabase
    .from("courts")
    .select("id, name")
    .order("name");

  if (courtsError) {
    return NextResponse.json({ error: courtsError.message }, { status: 500 });
  }

  let resolvedCourts: AvailabilityCourt[] = (allCourts ?? []).map((court) => {
    const parsed = parseCourtName(court.name);
    return { id: court.id, name: court.name, sport: parsed?.sport ?? null, courtIndex: parsed?.courtIndex ?? null };
  });

  if (courtIdParam) {
    resolvedCourts = resolvedCourts.filter((court) => court.id === courtIdParam);
    if (resolvedCourts.length === 0) {
      return NextResponse.json({ error: "Court not found." }, { status: 404 });
    }
  } else if (sportParam) {
    resolvedCourts = resolvedCourts.filter((court) => court.sport === sportParam);
  }

  const courtIds = resolvedCourts.map((court) => court.id);

  if (courtIds.length === 0) {
    return NextResponse.json({ courts: [], days: [] });
  }

  const [operatingHoursRes, rateCardsRes, bookingsRes, holdsRes, blocksRes] = await Promise.all([
    supabase.from("operating_hours").select("day_of_week, open_time, close_time, slot_duration_min"),
    supabase
      .from("rate_cards")
      .select("court_id, day_type, time_of_day, rate_php, effective_from")
      .in("court_id", courtIds),
    // Only 'pending_payment'/'confirmed' count as "booked" — 'draft'/'held'
    // is a slot someone has picked but not yet submitted for verification,
    // which is what the separate `heldKeys` (from slot_holds, below) already
    // exists to represent. Matching on "not cancelled/no_show" here too would
    // make 'held' bookings win over `heldKeys` in the priority check further
    // down (they're created in the same transaction, so one always implies
    // the other), permanently collapsing "held" into "booked" and making
    // that branch of the public grid's booked/held/blocked/open display
    // unreachable — see the 20260817000000 migration for the matching fix
    // to create_booking_draft() itself.
    supabase
      .from("bookings")
      .select("court_id, booking_date, time_slot")
      .in("court_id", courtIds)
      .gte("booking_date", from)
      .lte("booking_date", to)
      .in("status", ["pending_payment", "confirmed"]),
    supabase
      .from("slot_holds")
      .select("court_id, booking_date, time_slot")
      .in("court_id", courtIds)
      .gte("booking_date", from)
      .lte("booking_date", to)
      .gt("expires_at", new Date().toISOString()),
    // Staff-blocked slots (see the availability_slot_blocks migration and
    // components/prime-sports/admin/availability-editor.tsx) — a 4th status
    // distinct from booked/held/open so the public grid can tell "someone
    // else has this" apart from "staff closed this."
    supabase
      .from("slot_blocks")
      .select("court_id, blocked_date, time_slot")
      .in("court_id", courtIds)
      .gte("blocked_date", from)
      .lte("blocked_date", to),
  ]);

  if (operatingHoursRes.error) {
    return NextResponse.json({ error: operatingHoursRes.error.message }, { status: 500 });
  }
  if (rateCardsRes.error) {
    return NextResponse.json({ error: rateCardsRes.error.message }, { status: 500 });
  }
  if (bookingsRes.error) {
    return NextResponse.json({ error: bookingsRes.error.message }, { status: 500 });
  }
  if (holdsRes.error) {
    return NextResponse.json({ error: holdsRes.error.message }, { status: 500 });
  }
  if (blocksRes.error) {
    return NextResponse.json({ error: blocksRes.error.message }, { status: 500 });
  }

  const operatingHoursByDay = new Map<number, { open_time: string; close_time: string; slot_duration_min: number }>();
  for (const row of operatingHoursRes.data ?? []) {
    if (!operatingHoursByDay.has(row.day_of_week)) {
      operatingHoursByDay.set(row.day_of_week, row);
    }
  }

  const rateCardsByCourt = new Map<
    string,
    { day_type: string; time_of_day: string; rate_php: number; effective_from: string }[]
  >();
  for (const row of rateCardsRes.data ?? []) {
    const list = rateCardsByCourt.get(row.court_id) ?? [];
    list.push(row);
    rateCardsByCourt.set(row.court_id, list);
  }

  // Filters on both the weekday/weekend axis (`dayType`) and the
  // daytime/evening axis (`timeOfDay`) — see the rate-card pricing editor
  // migration (20260816000000_phase2_rate_cards_day_type.sql) for why the
  // weekday/weekend axis exists on rate_cards at all now.
  function findRate(courtId: string, dayType: string, timeOfDay: string, date: string) {
    const rows = (rateCardsByCourt.get(courtId) ?? []).filter(
      (row) => row.day_type === dayType && row.time_of_day === timeOfDay,
    );
    if (rows.length === 0) {
      return null;
    }

    const applicable = rows.filter((row) => row.effective_from <= date);
    const pool = applicable.length > 0 ? applicable : rows;
    const best = pool.reduce((latest, row) => (row.effective_from > latest.effective_from ? row : latest));
    return Number(best.rate_php);
  }

  const bookedKeys = new Set(
    (bookingsRes.data ?? []).map((row) => `${row.court_id}|${row.booking_date}|${row.time_slot}`),
  );
  const heldKeys = new Set(
    (holdsRes.data ?? []).map((row) => `${row.court_id}|${row.booking_date}|${row.time_slot}`),
  );
  const blockedKeys = new Set(
    (blocksRes.data ?? []).map((row) => `${row.court_id}|${row.blocked_date}|${row.time_slot}`),
  );

  const days: AvailabilityDay[] = dateList.map((date) => {
    const parsedDate = parseDateStringLocal(date);
    const dayOfWeek = parsedDate.getDay();
    const dayType = deriveDayType(parsedDate);
    const hours = operatingHoursByDay.get(dayOfWeek);

    if (!hours) {
      return { date, dayOfWeek, slots: [] };
    }

    const hour24List = generateDaySlots(hours.open_time, hours.close_time, hours.slot_duration_min);

    const slots: AvailabilitySlot[] = hour24List.map((hour24) => {
      const timeSlot = hour24ToTimeSlot(hour24);
      const timeOfDay = deriveTimeOfDay(hour24);
      const courtsStatus: Record<string, SlotAvailability> = {};

      for (const court of resolvedCourts) {
        const key = `${court.id}|${date}|${timeSlot}`;
        // Priority order matters: an existing confirmed/held booking always
        // wins display over a block added afterward (create_booking_draft()
        // already refuses to create a *new* booking on a blocked slot, but a
        // slot can still have been booked before staff blocked it).
        courtsStatus[court.id] = bookedKeys.has(key)
          ? "booked"
          : heldKeys.has(key)
            ? "held"
            : blockedKeys.has(key)
              ? "blocked"
              : "open";
      }

      // Rate is advertised the same regardless of which court in the list is
      // asked about (single shared schedule across all courts), so use the
      // first resolved court as the representative lookup.
      const ratePhp = resolvedCourts.length > 0 ? findRate(resolvedCourts[0].id, dayType, timeOfDay, date) : null;

      return { hour24, timeSlot, timeOfDay, ratePhp, courts: courtsStatus };
    });

    return { date, dayOfWeek, slots };
  });

  return NextResponse.json({ courts: resolvedCourts, days });
}
