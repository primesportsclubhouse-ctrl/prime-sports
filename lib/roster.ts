// Shared server-side types/validation for the roster-sessions slice: pure
// mapping only, no Supabase client here — mirrors the separation lib/
// booking.ts and lib/payments.ts already establish, so route handlers stay
// the only place request-scoped Supabase clients get created.

/** Mirrors roster-client.tsx's `CAPACITY` constant and `courts.capacity`'s
 *  default — used purely as a display fallback before a specific court's
 *  real capacity has loaded; the enforced value always comes from the API
 *  response (ultimately sourced from `courts.capacity`), never this
 *  constant. See enforce_roster_capacity() in the Phase 2 roster migration
 *  for where the cap is actually enforced. */
export const DEFAULT_ROSTER_CAPACITY = 10;

export type RosterEntryItem = {
  id: string;
  playerName: string;
  checkedIn: boolean;
  checkInTime: string | null;
};

export type RosterSessionDetail = {
  id: string;
  bookingId: string;
  courtId: string;
  courtName: string;
  active: boolean;
  startedAt: string;
  endedAt: string | null;
  capacity: number;
  entries: RosterEntryItem[];
};

/** One row in the "pick a booking to check in" list — every confirmed
 *  booking for the requested date, plus whichever roster session (if any)
 *  already exists for it. Grouping/labeling by `courtName` (which already
 *  encodes the sport, e.g. "Pickleball Court 1") is what keeps same-date/
 *  same-time bookings on different sports/courts visibly distinct in the
 *  picker, on top of them already being structurally separate sessions. */
export type RosterBookingOption = {
  bookingId: string;
  courtId: string;
  courtName: string;
  bookingDate: string;
  timeSlot: string;
  customerName: string | null;
  session: {
    id: string;
    active: boolean;
    capacity: number;
    playerCount: number;
    checkedInCount: number;
  } | null;
};

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
