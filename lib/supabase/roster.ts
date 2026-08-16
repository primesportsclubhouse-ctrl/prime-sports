// Supabase-touching roster-session read helper shared across the
// /api/roster-sessions Route Handlers, so each one doesn't reimplement the
// same "session + court + entries" join. Split out from lib/roster.ts, which
// stays Supabase-client-free — same separation lib/booking.ts /
// lib/supabase/slot-holds.ts already establish.

import { parseCourtName, parseDateStringLocal, timeSlotToHour24 } from "@/lib/booking";
import {
  formatHour12,
  formatPrimeDate,
  getSport,
  type RosterSessionHistoryEntry,
  type RosterSessionStatus,
  type SportKey,
} from "@/lib/prime-sports";
import type { createServiceRoleClient } from "@/lib/supabase/service-role";
import { DEFAULT_ROSTER_CAPACITY, type RosterBookingSummary, type RosterSessionDetail } from "@/lib/roster";

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

export async function fetchRosterSessionDetail(
  supabase: ServiceRoleClient,
  sessionId: string,
): Promise<RosterSessionDetail | null> {
  const { data: session, error: sessionError } = await supabase
    .from("roster_sessions")
    .select("id, booking_id, court_id, active, started_at, ended_at, courts(name, capacity)")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message);
  }
  if (!session) {
    return null;
  }

  const { data: entries, error: entriesError } = await supabase
    .from("roster_entries")
    .select("id, player_name, checked_in, check_in_time")
    .eq("session_id", sessionId)
    .order("check_in_time", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });

  if (entriesError) {
    throw new Error(entriesError.message);
  }

  const court = (session as unknown as { courts: { name: string; capacity: number } | null }).courts;

  return {
    id: session.id,
    bookingId: session.booking_id,
    courtId: session.court_id,
    courtName: court?.name ?? "Unknown court",
    active: session.active,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    capacity: court?.capacity ?? DEFAULT_ROSTER_CAPACITY,
    entries: (entries ?? []).map((entry) => ({
      id: entry.id,
      playerName: entry.player_name,
      checkedIn: entry.checked_in,
      checkInTime: entry.check_in_time,
    })),
  };
}

/**
 * Looks up a `roster_sessions` row by the `booking_id` it belongs to (rather
 * than by the session's own id, which the entries/[id] route family assumes
 * the caller already has) — every other lookup in this file assumes you
 * start from a session id, but the public check-in page
 * (app/(public)/roster/[bookingId]/page.tsx) only ever knows its bookingId,
 * since that's all a booker's shareable link can reasonably encode. Returns
 * `null` — not an error — when staff hasn't activated a session for this
 * booking yet; that's the expected, common "still waiting" state, not a
 * failure.
 */
export async function fetchRosterSessionDetailByBookingId(
  supabase: ServiceRoleClient,
  bookingId: string,
): Promise<RosterSessionDetail | null> {
  const { data: session, error } = await supabase
    .from("roster_sessions")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!session) {
    return null;
  }

  return fetchRosterSessionDetail(supabase, session.id);
}

/** The booking-summary half of GET /api/roster-sessions/by-booking/[id] —
 *  split out from fetchRosterSessionDetailByBookingId above since a booking
 *  is always resolvable even before any roster session exists for it (the
 *  public check-in page needs to show "which court, which time" even while
 *  it's still waiting for staff to activate check-in). */
export async function fetchRosterBookingSummary(
  supabase: ServiceRoleClient,
  bookingId: string,
): Promise<RosterBookingSummary | null> {
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, booking_date, time_slot, status, courts(name), customers(full_name)")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!booking) {
    return null;
  }

  const court = (booking as unknown as { courts: { name: string } | null }).courts;
  const customer = (booking as unknown as { customers: { full_name: string } | null }).customers;

  return {
    bookingId: booking.id,
    courtName: court?.name ?? "Unknown court",
    bookingDate: booking.booking_date,
    timeSlot: booking.time_slot,
    customerName: customer?.full_name ?? null,
    status: booking.status,
  };
}

type HistorySessionRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  courts: { name: string; capacity: number } | null;
  bookings: {
    status: string;
    booking_date: string;
    time_slot: string;
    customers: { full_name: string } | null;
  } | null;
};

/**
 * Real replacement for lib/prime-sports.ts's mock createRosterSessionHistory()
 * — the "History" tab next to roster-client.tsx's live Court-Side Check-In
 * view. Scoped to one sport's own court roster via `parseCourtName` (the same
 * (sport, courtIndex) <-> `courts.name` mapping /api/availability already
 * uses), so switching the roster tabs' sport shows a genuinely distinct log.
 *
 * `roster_sessions` has no explicit status column — a session is only ever
 * "over" if `ended_at` is set, or its booking landed `cancelled`/`no_show`
 * (a booking cancelled before anyone ever activated its session still
 * belongs in history, even with `ended_at` still null). Status itself is
 * derived the same way:
 *   - `cancelled`  — booking.status = 'cancelled'
 *   - `no-show`    — booking.status = 'no_show', OR the session ended with
 *                    zero checked-in entries
 *   - `completed`  — the session ended, the booking isn't cancelled/no_show,
 *                    and at least one entry was checked in
 *
 * `durationMinutes` is the real `ended_at - started_at` elapsed time; for the
 * rare cancelled/no_show booking whose session never actually started (no
 * `ended_at` at all), this reports 0 rather than guessing at a scheduled
 * duration that was never used.
 */
export async function fetchRosterSessionHistory(
  supabase: ServiceRoleClient,
  sportKey: SportKey,
): Promise<RosterSessionHistoryEntry[]> {
  const sport = getSport(sportKey);

  const { data: allCourts, error: courtsError } = await supabase.from("courts").select("id, name, capacity");

  if (courtsError) {
    throw new Error(courtsError.message);
  }

  const courtIds = (allCourts ?? [])
    .filter((court) => parseCourtName(court.name)?.sport === sportKey)
    .map((court) => court.id);

  if (courtIds.length === 0) {
    return [];
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("roster_sessions")
    .select(
      "id, started_at, ended_at, courts(name, capacity), bookings(status, booking_date, time_slot, customers(full_name))",
    )
    .in("court_id", courtIds)
    .order("started_at", { ascending: false });

  if (sessionsError) {
    throw new Error(sessionsError.message);
  }

  const rows = (sessions ?? []) as unknown as HistorySessionRow[];
  const sessionIds = rows.map((row) => row.id);
  const checkedInCountBySession = new Map<string, number>();

  if (sessionIds.length > 0) {
    const { data: entries, error: entriesError } = await supabase
      .from("roster_entries")
      .select("session_id")
      .in("session_id", sessionIds)
      .eq("checked_in", true);

    if (entriesError) {
      throw new Error(entriesError.message);
    }

    for (const entry of entries ?? []) {
      checkedInCountBySession.set(entry.session_id, (checkedInCountBySession.get(entry.session_id) ?? 0) + 1);
    }
  }

  const history: RosterSessionHistoryEntry[] = [];

  for (const row of rows) {
    const booking = row.bookings;
    const bookingStatus = booking?.status ?? null;
    const isCancelledOrNoShowBooking = bookingStatus === "cancelled" || bookingStatus === "no_show";

    // Not history yet — a session tied to a still-live booking with no
    // ended_at is the current Court-Side Check-In view, not a past session.
    if (!row.ended_at && !isCancelledOrNoShowBooking) {
      continue;
    }

    const checkedInCount = checkedInCountBySession.get(row.id) ?? 0;

    let status: RosterSessionStatus;
    if (bookingStatus === "cancelled") {
      status = "cancelled";
    } else if (bookingStatus === "no_show") {
      status = "no-show";
    } else {
      status = checkedInCount === 0 ? "no-show" : "completed";
    }

    const durationMinutes = row.ended_at
      ? Math.max(0, Math.round((new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()) / 60000))
      : 0;

    const court = row.courts;
    const parsedCourt = court?.name ? parseCourtName(court.name) : null;
    const shortCourt =
      parsedCourt && parsedCourt.sport === sportKey
        ? sport.courtNames[parsedCourt.courtIndex] ?? court?.name ?? "Unknown court"
        : court?.name ?? "Unknown court";

    history.push({
      id: row.id,
      sport: sportKey,
      date: booking?.booking_date ? formatPrimeDate(parseDateStringLocal(booking.booking_date)) : "—",
      court: shortCourt,
      timeSlot: booking?.time_slot ? formatHour12(timeSlotToHour24(booking.time_slot)) : "—",
      organizer: booking?.customers?.full_name ?? "Guest",
      playersCheckedIn: checkedInCount,
      capacity: court?.capacity ?? DEFAULT_ROSTER_CAPACITY,
      durationMinutes,
      status,
    });
  }

  return history;
}
