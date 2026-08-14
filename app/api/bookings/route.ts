import { NextRequest, NextResponse } from "next/server";

import {
  HOLD_TTL_MINUTES,
  getCourtName,
  hour24ToTimeSlot,
  isValidDateString,
  isValidHour24,
  isValidSportKey,
  parseCourtName,
  parseDateStringLocal,
  todayDateString,
} from "@/lib/booking";
import { getHourlyRate } from "@/lib/prime-sports";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type ContactPayload = {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
};

type CreateBookingPayload = {
  sessionToken?: unknown;
  contact?: ContactPayload;
  sport?: unknown;
  courtIndex?: unknown;
  bookingDate?: unknown;
  hour24?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Finds-or-creates the customer row for a guest booking. Not itself the
 *  concurrency-critical path (that's the slot/booking uniqueness handled in
 *  create_booking_draft()) — a duplicate-email race here just means two
 *  concurrent first-time bookings from the same address, which we resolve by
 *  re-reading the row the other request just inserted. */
async function upsertCustomer(
  supabase: ReturnType<typeof createServiceRoleClient>,
  contact: { fullName: string; email: string; phone: string },
) {
  const { data: existing, error: selectError } = await supabase
    .from("customers")
    .select("id")
    .ilike("email", contact.email)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("customers")
      .update({ full_name: contact.fullName, phone: contact.phone })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return existing.id as string;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("customers")
    .insert({ full_name: contact.fullName, email: contact.email, phone: contact.phone })
    .select("id")
    .single();

  if (!insertError) {
    return inserted.id as string;
  }

  // Unique violation on the lower(email) index — someone else's concurrent
  // request won the race between our select and insert. Fall back to the
  // row that now exists instead of failing the whole booking attempt.
  if (insertError.code === "23505") {
    const { data: retried, error: retryError } = await supabase
      .from("customers")
      .select("id")
      .ilike("email", contact.email)
      .single();

    if (retryError) {
      throw new Error(retryError.message);
    }

    return retried.id as string;
  }

  throw new Error(insertError.message);
}

export async function POST(request: NextRequest) {
  let payload: CreateBookingPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const sessionToken = payload.sessionToken;
  const contactPayload = payload.contact ?? {};
  const fullName = contactPayload.fullName;
  const email = contactPayload.email;
  const phone = contactPayload.phone;
  const sport = payload.sport;
  const courtIndex = payload.courtIndex;
  const bookingDate = payload.bookingDate;
  const hour24 = payload.hour24;

  if (!isNonEmptyString(sessionToken)) {
    return NextResponse.json({ error: "sessionToken is required." }, { status: 400 });
  }
  if (!isNonEmptyString(fullName) || !isNonEmptyString(email) || !isNonEmptyString(phone)) {
    return NextResponse.json(
      { error: "contact.fullName, contact.email, and contact.phone are required." },
      { status: 400 },
    );
  }
  if (!isValidSportKey(sport)) {
    return NextResponse.json({ error: "sport must be 'pickleball' or 'badminton'." }, { status: 400 });
  }
  if (typeof courtIndex !== "number" || !Number.isInteger(courtIndex) || courtIndex < 0) {
    return NextResponse.json({ error: "courtIndex must be a non-negative integer." }, { status: 400 });
  }
  if (!isValidDateString(bookingDate)) {
    return NextResponse.json({ error: "bookingDate must be formatted as YYYY-MM-DD." }, { status: 400 });
  }
  if (bookingDate < todayDateString()) {
    return NextResponse.json({ error: "bookingDate cannot be in the past." }, { status: 400 });
  }
  if (!isValidHour24(hour24)) {
    return NextResponse.json({ error: "hour24 is not one of the club's operating hours." }, { status: 400 });
  }

  const courtName = getCourtName(sport, courtIndex);
  const timeSlot = hour24ToTimeSlot(hour24);
  const pricePhp = getHourlyRate(parseDateStringLocal(bookingDate), hour24);

  const supabase = createServiceRoleClient();

  const { data: court, error: courtError } = await supabase
    .from("courts")
    .select("id, name")
    .eq("name", courtName)
    .maybeSingle();

  if (courtError) {
    return NextResponse.json({ error: courtError.message }, { status: 500 });
  }
  if (!court) {
    return NextResponse.json(
      { error: `No court configured for ${sport} index ${courtIndex}. Contact staff.` },
      { status: 404 },
    );
  }

  let customerId: string;
  try {
    customerId = await upsertCustomer(supabase, {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save contact details." },
      { status: 500 },
    );
  }

  const { data: rawBooking, error: draftError } = await supabase
    .rpc("create_booking_draft", {
      p_court_id: court.id,
      p_booking_date: bookingDate,
      p_time_slot: timeSlot,
      p_session_token: sessionToken,
      p_customer_id: customerId,
      p_price_php: pricePhp,
      p_hold_ttl_minutes: HOLD_TTL_MINUTES,
    })
    .single();

  if (draftError) {
    const isConflict = draftError.code === "23505";
    return NextResponse.json(
      {
        error: isConflict
          ? "That slot was just taken by someone else — pick another time."
          : draftError.message,
      },
      { status: isConflict ? 409 : 500 },
    );
  }

  // The Supabase client here has no generated Database schema types, so an
  // RPC returning a table-row type comes back as `unknown` rather than a
  // structural type — this is the one narrowing point for that row shape.
  const booking = rawBooking as {
    id: string;
    booking_date: string;
    time_slot: string;
    status: string;
    price_php: number;
  };

  return NextResponse.json(
    {
      booking: {
        id: booking.id,
        courtId: court.id,
        courtName: court.name,
        sport,
        courtIndex,
        bookingDate: booking.booking_date,
        timeSlot: booking.time_slot,
        hour24,
        status: booking.status,
        pricePhp: Number(booking.price_php),
      },
    },
    { status: 201 },
  );
}

export async function GET(request: NextRequest) {
  const sessionToken = request.nextUrl.searchParams.get("sessionToken");

  if (!isNonEmptyString(sessionToken)) {
    return NextResponse.json({ error: "sessionToken is required." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Bookings aren't directly linked to the hold that created them (no FK —
  // see the slot_holds migration), so "which bookings belong to this
  // browser session" is recovered by joining through the still-active hold
  // that shares the same (court, date, time) key. Holds are short-lived by
  // design, so this only recovers bookings from the current session's
  // in-progress flow — which is exactly the refresh-survival window this is
  // for, not a permanent booking history.
  const { data: holds, error: holdsError } = await supabase
    .from("slot_holds")
    .select("court_id, booking_date, time_slot")
    .eq("session_token", sessionToken)
    .gt("expires_at", new Date().toISOString());

  if (holdsError) {
    return NextResponse.json({ error: holdsError.message }, { status: 500 });
  }

  if (!holds || holds.length === 0) {
    return NextResponse.json({ contact: null, bookings: [] });
  }

  const courtIds = Array.from(new Set(holds.map((hold) => hold.court_id)));

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id, court_id, booking_date, time_slot, status, price_php, waiver_accepted, customer_id, courts(name)")
    .in("court_id", courtIds)
    .not("status", "in", "(cancelled,no_show)");

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500 });
  }

  const holdKeys = new Set(holds.map((hold) => `${hold.court_id}|${hold.booking_date}|${hold.time_slot}`));

  const matched = (bookings ?? []).filter((booking) =>
    holdKeys.has(`${booking.court_id}|${booking.booking_date}|${booking.time_slot}`),
  );

  let contact: { fullName: string; email: string; phone: string } | null = null;
  const firstCustomerId = matched.find((booking) => booking.customer_id)?.customer_id;

  if (firstCustomerId) {
    const { data: customer } = await supabase
      .from("customers")
      .select("full_name, email, phone")
      .eq("id", firstCustomerId)
      .maybeSingle();

    if (customer) {
      contact = { fullName: customer.full_name, email: customer.email, phone: customer.phone };
    }
  }

  const results = matched
    .map((booking) => {
      const courtName = (booking as unknown as { courts: { name: string } | null }).courts?.name;
      const parsed = courtName ? parseCourtName(courtName) : null;

      if (!parsed) {
        return null;
      }

      return {
        id: booking.id,
        courtId: booking.court_id,
        courtName,
        sport: parsed.sport,
        courtIndex: parsed.courtIndex,
        bookingDate: booking.booking_date,
        timeSlot: booking.time_slot,
        hour24: Number.parseInt(booking.time_slot.slice(0, 2), 10),
        status: booking.status,
        pricePhp: Number(booking.price_php),
        waiverAccepted: booking.waiver_accepted,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return NextResponse.json({ contact, bookings: results });
}
