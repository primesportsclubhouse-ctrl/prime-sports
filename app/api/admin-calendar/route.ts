import { NextRequest, NextResponse } from "next/server";

import {
  formatDateTimeLabel,
  isValidDateString,
  isValidSportKey,
  timeSlotToHour24,
  todayDateString,
} from "@/lib/booking";
import { channelToDisplayKey, type PaymentChannelKey } from "@/lib/payments";
import { CalendarBooking, formatCurrency, operatingHours } from "@/lib/prime-sports";
import { resolveCourtsForSport } from "@/lib/supabase/courts";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

const DASH = "—";

/**
 * GET — staff-only "one date, one sport, every court/time-slot cell" view
 * backing the Master Booking Calendar (components/prime-sports/admin/
 * master-calendar.tsx). Replaces createAdminBookings()'s deterministic fake
 * grid with real bookings joined to their customer + latest payment
 * submission.
 *
 * Only `pending_payment` and `confirmed` bookings are shown as reservations
 * (mapped onto the dialog's existing pending/!pending distinction) —
 * `draft`/`held` rows are a customer mid-checkout who hasn't submitted a
 * payment yet, not a real reservation the front desk should be shown as
 * occupying a cell; `cancelled`/`no_show` free the slot entirely, matching
 * how /api/availability already treats those two statuses.
 *
 * Response is pre-shaped as `Record<"${timeIndex}-${courtIndex}",
 * CalendarBooking>`, matching master-calendar.tsx's existing key format
 * exactly (timeIndex into lib/prime-sports.ts's `timeSlots`/`operatingHours`,
 * courtIndex into that sport's `courtNames`) so the component's render loop
 * needs no changes beyond swapping its data source.
 */
export async function GET(request: NextRequest) {
  const staff = await getStaffContext();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const dateParam = params.get("date");
  const sportParam = params.get("sport");

  if (dateParam && !isValidDateString(dateParam)) {
    return NextResponse.json({ error: "date must be formatted as YYYY-MM-DD." }, { status: 400 });
  }
  if (!isValidSportKey(sportParam)) {
    return NextResponse.json({ error: "sport must be 'pickleball' or 'badminton'." }, { status: 400 });
  }

  const date = dateParam ?? todayDateString();
  const supabase = createServiceRoleClient();

  let resolvedCourts;
  try {
    resolvedCourts = await resolveCourtsForSport(supabase, sportParam);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve courts." },
      { status: 500 },
    );
  }

  const courtIndexByCourtId = new Map(resolvedCourts.map((court) => [court.id, court.courtIndex]));
  const courtIds = resolvedCourts.map((court) => court.id);

  if (courtIds.length === 0) {
    return NextResponse.json({ date, sport: sportParam, bookings: {} });
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id, court_id, time_slot, status, price_php, customers(full_name, phone, email)")
    .eq("booking_date", date)
    .in("court_id", courtIds)
    .in("status", ["pending_payment", "confirmed"]);

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500 });
  }

  const bookingIds = (bookings ?? []).map((booking) => booking.id);

  // Latest payment_submissions row per booking (a booking can, in principle,
  // have more than one submission — e.g. a rejected attempt followed by a
  // resubmission — so this always surfaces the most recent one, not just
  // whichever the query happens to return first).
  const latestSubmissionByBookingId = new Map<
    string,
    { reference_no: string; channel: PaymentChannelKey; submitted_at: string }
  >();

  if (bookingIds.length > 0) {
    const { data: submissions, error: submissionsError } = await supabase
      .from("payment_submissions")
      .select("booking_id, reference_no, channel, submitted_at")
      .in("booking_id", bookingIds)
      .order("submitted_at", { ascending: false });

    if (submissionsError) {
      return NextResponse.json({ error: submissionsError.message }, { status: 500 });
    }

    for (const submission of submissions ?? []) {
      if (!latestSubmissionByBookingId.has(submission.booking_id)) {
        latestSubmissionByBookingId.set(submission.booking_id, submission);
      }
    }
  }

  const result: Record<string, CalendarBooking> = {};

  for (const booking of bookings ?? []) {
    const courtIndex = courtIndexByCourtId.get(booking.court_id);
    if (courtIndex === undefined) {
      continue;
    }

    const hour24 = timeSlotToHour24(booking.time_slot);
    const timeIndex = operatingHours.indexOf(hour24);
    if (timeIndex === -1) {
      continue;
    }

    const customer = (booking as unknown as { customers: { full_name: string; phone: string; email: string } | null })
      .customers;
    const submission = latestSubmissionByBookingId.get(booking.id);

    const calendarBooking: CalendarBooking = {
      name: customer?.full_name ?? DASH,
      pending: booking.status === "pending_payment",
      ref: submission?.reference_no ?? DASH,
      amount: booking.price_php !== null ? formatCurrency(Number(booking.price_php)) : DASH,
      channel: submission ? channelToDisplayKey(submission.channel) : DASH,
      phone: customer?.phone ?? DASH,
      email: customer?.email ?? DASH,
      submitted: submission ? formatDateTimeLabel(submission.submitted_at) : DASH,
    };

    result[`${timeIndex}-${courtIndex}`] = calendarBooking;
  }

  return NextResponse.json({ date, sport: sportParam, bookings: result });
}
