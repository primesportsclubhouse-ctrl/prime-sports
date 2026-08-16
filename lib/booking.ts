// Shared server-side helpers for the booking flow's backend: availability
// computation, court name <-> (sport, courtIndex) mapping, and the payload
// shapes the /api/availability and /api/bookings route handlers pass around.
// Deterministic/pure only — no Supabase client here, so this stays importable
// from both route handlers and (eventually) other server code without
// dragging in request-scoped state.

import {
  getRateKey,
  getSport,
  isDaytimeHour,
  operatingHours,
  sports,
  type RateKey,
  type SportKey,
} from "@/lib/prime-sports";

export const HOLD_TTL_MINUTES = 15;

export type BookingStatus =
  | "draft"
  | "held"
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "no_show";

// "blocked" is staff-closed (see the slot_blocks migration and
// admin/availability-editor.tsx) — distinct from "held"/"booked", which are
// both customer-driven occupancy. Priority when more than one could apply to
// the same slot: booked > held > blocked > open (an existing confirmed
// booking always wins display over a block added after the fact — see
// /api/availability's status derivation).
export type SlotAvailability = "open" | "held" | "booked" | "blocked";

/** Mirrors the `staff_role` enum from the Phase 1 migration. */
export type StaffRole = "staff" | "manager" | "admin";

export type RateTimeOfDay = "daytime" | "evening";

/** Mirrors the `rate_day_type` enum added by the rate-card pricing editor
 *  migration (20260816000000_phase2_rate_cards_day_type.sql) — same
 *  weekday/weekend split lib/prime-sports.ts's `RateKey` already models for
 *  the (now-retired-from-pricing-duty) hardcoded rate table. */
export type RateDayType = RateKey;

/**
 * "Pickleball Court 1" — the single source of truth for how a (sport,
 * courtIndex) pair is named in the `courts` table. Keep in sync with the
 * literal names inserted by
 * supabase/migrations/20260813000100_phase2_seed_reference_data.sql.
 */
export function getCourtName(sportKey: SportKey, courtIndex: number) {
  const sport = getSport(sportKey);
  return `${sport.label} ${sport.courtNames[courtIndex] ?? "Court"}`;
}

/** Reverses getCourtName() — used to map a `courts.name` value read back
 *  from the database into the { sport, courtIndex } shape the frontend's
 *  BookingLineItem already works with, so no UI code needs to change. */
export function parseCourtName(name: string): { sport: SportKey; courtIndex: number } | null {
  for (const sport of sports) {
    const prefix = `${sport.label} `;
    if (!name.startsWith(prefix)) {
      continue;
    }

    const courtIndex = sport.courtNames.findIndex((courtName) => name === `${prefix}${courtName}`);
    if (courtIndex !== -1) {
      return { sport: sport.key, courtIndex };
    }
  }

  return null;
}

export function isValidSportKey(value: unknown): value is SportKey {
  return value === "pickleball" || value === "badminton";
}

/** Every hour24 value the club actually operates on (6AM..1AM, wrapping past
 *  midnight) — anything outside this set is rejected rather than silently
 *  coerced, since it wouldn't correspond to any real slot in the UI grid. */
export function isValidHour24(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && operatingHours.includes(value);
}

export function hour24ToTimeSlot(hour24: number) {
  return `${String(hour24).padStart(2, "0")}:00:00`;
}

export function timeSlotToHour24(timeSlot: string) {
  return Number.parseInt(timeSlot.slice(0, 2), 10);
}

/** Matches the daytime/evening boundary lib/prime-sports.ts's isDaytimeHour
 *  already defines (6AM-4PM daytime, 4PM-2AM evening) — rate_cards.time_of_day
 *  is tagged against that same convention, so reuse it rather than
 *  redefining the boundary here. */
export function deriveTimeOfDay(hour24: number): RateTimeOfDay {
  return isDaytimeHour(hour24) ? "daytime" : "evening";
}

/** Same weekday/weekend boundary lib/prime-sports.ts's `getRateKey()` already
 *  defines — reused rather than redefined here so `rate_cards.day_type`
 *  lookups can never drift from that single boundary definition. Takes a
 *  `Date`, not a date string, matching `getRateKey()`'s own signature —
 *  callers holding a `YYYY-MM-DD` string should run it through
 *  `parseDateStringLocal()` first. */
export function deriveDayType(date: Date): RateDayType {
  return getRateKey(date);
}

export function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** `new Date("YYYY-MM-DD")` parses as UTC midnight, which then prints the
 *  *previous* local day west of UTC. Parsing the parts manually and building
 *  the Date from local-time components keeps "day of week" and "is this in
 *  the past" checks aligned with what the browser-side calendar shows. */
export function parseDateStringLocal(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map((part) => Number.parseInt(part, 10));
  return new Date(year, month - 1, day);
}

export function todayDateString() {
  return toDateString(new Date());
}

export function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Every hourly slot between a day's open/close time, matching the shape of
 *  the frontend's `operatingHours` constant (hour24 values, wrapping past
 *  midnight when close_time <= open_time — e.g. 06:00 -> 02:00 next day). */
export function generateDaySlots(openTime: string, closeTime: string, slotDurationMinutes: number) {
  const openHour = timeSlotToHour24(openTime);
  const closeHour = timeSlotToHour24(closeTime);
  const slotsPerDay = closeHour > openHour ? closeHour - openHour : 24 - openHour + closeHour;
  const slotCount = Math.round((slotsPerDay * 60) / slotDurationMinutes);

  return Array.from({ length: slotCount }, (_, index) => {
    const hour24 = (openHour + index * (slotDurationMinutes / 60)) % 24;
    return hour24;
  });
}

export type AvailabilityCourt = {
  id: string;
  name: string;
  sport: SportKey | null;
  courtIndex: number | null;
};

export type AvailabilitySlot = {
  hour24: number;
  timeSlot: string;
  timeOfDay: RateTimeOfDay;
  ratePhp: number | null;
  courts: Record<string, SlotAvailability>;
};

export type AvailabilityDay = {
  date: string;
  dayOfWeek: number;
  slots: AvailabilitySlot[];
};

/** Minimal shape needed to identify a booking's underlying (court, date,
 *  time) slot — enough to look up/free the `slot_holds` row tied to it,
 *  without importing a full Supabase-generated row type. Consumed by the
 *  Supabase-touching helpers in lib/supabase/slot-holds.ts — kept as a type
 *  here (not the DB calls themselves) so this file stays client-free. */
export type BookingSlotKey = {
  courtId: string;
  bookingDate: string;
  timeSlot: string;
};
