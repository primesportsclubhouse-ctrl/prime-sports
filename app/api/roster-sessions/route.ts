import { NextRequest, NextResponse } from "next/server";

import { isValidDateString, todayDateString } from "@/lib/booking";
import { DEFAULT_ROSTER_CAPACITY, isNonEmptyString, type RosterBookingOption } from "@/lib/roster";
import { recordAuditLog } from "@/lib/supabase/audit-log";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { fetchRosterSessionDetail } from "@/lib/supabase/roster";
import { authorizeBookingForRoster } from "@/lib/supabase/roster-auth";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

type ActivatePayload = {
  bookingId?: unknown;
  sessionToken?: unknown;
};

/**
 * GET — staff-only "pick a booking to check in" list: every confirmed
 * booking for the requested date (default today), plus whichever roster
 * session (if any) already exists for it. Replaces roster-client.tsx's
 * single hardcoded placeholder session header with real, per-booking data.
 *
 * Deliberately keyed by `booking_id`, never by (date, time_slot) alone —
 * two courts running at the same date/time (e.g. a Pickleball Court 1
 * booking and a Badminton Court 2 booking both at 6:00 PM) are different
 * bookings, so they show up here as separate rows with separate sessions,
 * never merged.
 */
export async function GET(request: NextRequest) {
  const staff = await getStaffContext();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 403 });
  }

  const dateParam = request.nextUrl.searchParams.get("date");
  if (dateParam && !isValidDateString(dateParam)) {
    return NextResponse.json({ error: "date must be formatted as YYYY-MM-DD." }, { status: 400 });
  }
  const date = dateParam ?? todayDateString();

  const supabase = createServiceRoleClient();

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id, court_id, booking_date, time_slot, courts(name), customers(full_name)")
    .eq("booking_date", date)
    .eq("status", "confirmed")
    .order("time_slot", { ascending: true });

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500 });
  }

  const bookingIds = (bookings ?? []).map((booking) => booking.id);

  const sessionByBookingId = new Map<
    string,
    { id: string; active: boolean; capacity: number }
  >();
  const countsBySessionId = new Map<string, { total: number; checkedIn: number }>();

  if (bookingIds.length > 0) {
    const { data: sessions, error: sessionsError } = await supabase
      .from("roster_sessions")
      .select("id, booking_id, active, courts(capacity)")
      .in("booking_id", bookingIds);

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }

    const sessionIds = (sessions ?? []).map((session) => session.id);

    if (sessionIds.length > 0) {
      const { data: entries, error: entriesError } = await supabase
        .from("roster_entries")
        .select("session_id, checked_in")
        .in("session_id", sessionIds);

      if (entriesError) {
        return NextResponse.json({ error: entriesError.message }, { status: 500 });
      }

      for (const entry of entries ?? []) {
        const counts = countsBySessionId.get(entry.session_id) ?? { total: 0, checkedIn: 0 };
        counts.total += 1;
        if (entry.checked_in) {
          counts.checkedIn += 1;
        }
        countsBySessionId.set(entry.session_id, counts);
      }
    }

    for (const session of sessions ?? []) {
      const capacity =
        (session as unknown as { courts: { capacity: number } | null }).courts?.capacity ??
        DEFAULT_ROSTER_CAPACITY;
      sessionByBookingId.set(session.booking_id, { id: session.id, active: session.active, capacity });
    }
  }

  const options: RosterBookingOption[] = (bookings ?? []).map((booking) => {
    const courtName = (booking as unknown as { courts: { name: string } | null }).courts?.name ?? "Unknown court";
    const customerName =
      (booking as unknown as { customers: { full_name: string } | null }).customers?.full_name ?? null;
    const session = sessionByBookingId.get(booking.id);
    const counts = session ? countsBySessionId.get(session.id) ?? { total: 0, checkedIn: 0 } : null;

    return {
      bookingId: booking.id,
      courtId: booking.court_id,
      courtName,
      bookingDate: booking.booking_date,
      timeSlot: booking.time_slot,
      customerName,
      session: session
        ? {
            id: session.id,
            active: session.active,
            capacity: session.capacity,
            playerCount: counts?.total ?? 0,
            checkedInCount: counts?.checkedIn ?? 0,
          }
        : null,
    };
  });

  return NextResponse.json({ date, bookings: options });
}

/**
 * POST — activates (or reactivates) a roster session for a confirmed
 * booking. Dual-mode like /api/payment-submissions: a signed-in staff
 * member, or the guest organizer proven via the session_token recorded on
 * the booking's slot_holds row (authorizeBookingForRoster). Only the staff
 * path is exercised by roster-client.tsx today (it only renders inside the
 * staff-only /admin/roster route), but the guest path is real, not a stub.
 */
export async function POST(request: NextRequest) {
  let payload: ActivatePayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { bookingId, sessionToken } = payload;

  if (!isNonEmptyString(bookingId)) {
    return NextResponse.json({ error: "bookingId is required." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const auth = await authorizeBookingForRoster(supabase, bookingId, sessionToken);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, court_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.status !== "confirmed") {
    return NextResponse.json(
      { error: "Only confirmed bookings can start a court-side check-in session." },
      { status: 409 },
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("roster_sessions")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  let sessionId: string;

  if (existing) {
    // Reactivating a previously ended session — resume rather than start a
    // second row (booking_id is unique on roster_sessions), so any players
    // already checked in earlier are still there.
    const { error: updateError } = await supabase
      .from("roster_sessions")
      .update({ active: true, ended_at: null })
      .eq("id", existing.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    sessionId = existing.id;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("roster_sessions")
      .insert({ booking_id: bookingId, court_id: booking.court_id, active: true })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    sessionId = inserted.id;
  }

  // Best-effort side effect, staff-initiated actions only (auth.staff is null
  // for the guest-organizer path — see authorizeBookingForRoster's doc
  // comment) — never blocks the response, see recordAuditLog's own doc
  // comment.
  if (auth.staff) {
    void recordAuditLog({
      staffId: auth.staff.userId,
      action: existing ? "roster_session.reactivate" : "roster_session.activate",
      targetTable: "roster_sessions",
      targetId: sessionId,
      payload: { bookingId, courtId: booking.court_id },
    });
  }

  try {
    const detail = await fetchRosterSessionDetail(supabase, sessionId);
    return NextResponse.json({ session: detail }, { status: existing ? 200 : 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load roster session." },
      { status: 500 },
    );
  }
}
