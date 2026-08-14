export type PrimeNavLink = {
  href: string;
  label: string;
};

export type ContainerVariant = "default" | "narrow" | "wide";

export type BookingStepStatus = "upcoming" | "current" | "done";

export type SlotSelection = {
  courtIndex: number;
  timeIndex: number;
};

export type QueueSubmission = {
  id: number;
  name: string;
  ref: string;
  court: string;
  time: string;
  amount: string;
  channel: string;
  submitted: string;
  phone: string;
  email: string;
  notes: string;
};

export const primeNavLinks: PrimeNavLink[] = [
  { href: "/", label: "Home" },
  { href: "/reserve", label: "Reserve" },
  { href: "/checkout", label: "Checkout" },
];

export const primeContainerClasses: Record<ContainerVariant, string> = {
  default: "mx-auto w-full max-w-[1200px] px-6 max-[640px]:px-4",
  narrow: "mx-auto w-full max-w-[680px] px-5",
  wide: "mx-auto w-full max-w-[1400px] px-6 max-[640px]:px-4",
};

export function getPrimeContainerClassName(variant: ContainerVariant = "default") {
  return primeContainerClasses[variant];
}

export const primeHeadingBaseClass =
  "[font-family:var(--font-heading)] uppercase tracking-[0.06em]";

export const primeMonoValueClass =
  "[font-family:var(--font-mono)] font-medium tabular-nums";

export const primeEditorialAccentClass =
  "[font-family:var(--font-accent),var(--font-display-fallback),serif] italic font-normal";

export const primeButtonBaseClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius)] border border-transparent px-5 text-sm font-medium whitespace-nowrap transition duration-150 hover:-translate-y-px disabled:pointer-events-none disabled:opacity-40";

export const primeButtonPrimaryClass = `${primeButtonBaseClass} bg-accent text-foreground shadow-[var(--shadow-sm)] hover:border-accent-secondary hover:bg-[#b33229] hover:shadow-[var(--shadow-md)]`;

export const primeButtonOutlineClass = `${primeButtonBaseClass} border-foreground bg-transparent text-foreground hover:border-accent-secondary hover:bg-[rgba(212,163,89,0.12)] hover:text-accent-secondary`;

export const primeButtonNavyClass = `${primeButtonBaseClass} border border-accent-secondary bg-accent-secondary text-canvas shadow-[var(--shadow-sm)] hover:bg-[#bf914b] hover:shadow-[var(--shadow-md)]`;

export const primeButtonLargeClass = "min-h-14 px-8 text-[15px]";

export const primeSectionEyebrowClass =
  "mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-accent";

export const primeSectionTitleClass =
  `${primeHeadingBaseClass} text-[clamp(22px,3vw,30px)] font-extrabold leading-[1.08]`;

export const primeSectionHeaderRowClass =
  "mb-6 flex flex-wrap items-end justify-between gap-3";

// Both panels paint their own dark `bg-surface` — `text-foreground` is pinned here rather
// than left to inherit, so they stay self-contained wherever they land (including on a
// light-themed section, where the ambient ink flips to dark).
export const primeSurfacePanelClass =
  "rounded-[var(--radius)] border border-border bg-surface p-6 text-foreground shadow-[var(--shadow-sm)]";

export const primeSurfaceCardClass =
  "rounded-[var(--radius)] border border-border bg-surface text-foreground shadow-[var(--shadow-sm)]";

/** A thin dashed gold rule along a card's top edge — reads as painted court
 *  boundary line, not a flat "accent top-border" template default. Render as an
 *  absolutely positioned decorative strip (never `border-t`) on a `relative
 *  overflow-hidden` card; the host card supplies its own border/radius/shadow.
 *  Gold-only by design — red stays reserved for actions, never a passive flag. */
export const primeSidelineStripeClass =
  "pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[repeating-linear-gradient(90deg,var(--accent-secondary)_0px_10px,transparent_10px_18px)]";

export const primeToolbarIconButtonClass =
  "inline-flex min-h-8 min-w-8 items-center justify-center rounded-[var(--radius)] border border-border bg-surface-muted text-sm text-foreground hover:border-accent-secondary hover:bg-surface disabled:pointer-events-none disabled:opacity-40";

export const primeToolbarTextButtonClass =
  "inline-flex min-h-[30px] min-w-[30px] items-center justify-center rounded-[var(--radius)] border border-border bg-surface-muted px-3 text-sm text-foreground hover:border-accent-secondary hover:bg-surface disabled:pointer-events-none disabled:opacity-40";

export const primeStatusPillBaseClass =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em]";

export const primeMetaLabelClass =
  "mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted";

export const primePlaceholderClass = `${primeEditorialAccentClass} text-muted/55`;

export const courtNames = ["Court A", "Court B", "Court C", "Court D"];

export type SportKey = "pickleball" | "badminton";

export type SportDefinition = {
  key: SportKey;
  label: string;
  accentClass: string;
  courtNames: string[];
};

function buildCourtNames(count: number) {
  return Array.from({ length: count }, (_, index) => `Court ${index + 1}`);
}

/** The booking flow's own sport → court roster, separate from the legacy flat
 *  `courtNames` above (which stays untouched for the admin dashboard and mock
 *  generators below). Pickleball/Badminton share the same operating hours and
 *  rate schedule — only the court roster differs per sport. */
export const sports: SportDefinition[] = [
  {
    key: "pickleball",
    label: "Pickleball",
    accentClass: "text-accent-secondary",
    courtNames: buildCourtNames(7),
  },
  {
    key: "badminton",
    label: "Badminton",
    accentClass: "text-accent",
    courtNames: buildCourtNames(4),
  },
];

export function getSport(key: SportKey) {
  return sports.find((sport) => sport.key === key) ?? sports[0];
}

/** "Pickleball · Court 1" — used anywhere sports could mix in a flat list (the
 *  booking cart, the checkout summary). Grid column headers use the active
 *  sport's short `courtNames` directly since the selected tab already
 *  disambiguates which sport is being viewed. */
export function getSportCourtLabel(sportKey: SportKey, courtIndex: number) {
  const sport = getSport(sportKey);
  return `${sport.label} · ${sport.courtNames[courtIndex] ?? "Court"}`;
}

export function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString("en-PH")}`;
}

export type RateKey = "weekday" | "weekend";

export type RateWindow = {
  label: string;
  range: string;
  rate: number;
};

/** Same schedule applies to every court — daytime runs 6AM–4PM, nighttime 4PM–2AM.
 *  This is the single source of truth for court rates — the homepage pricing cards
 *  and the booking flow both read from here so the numbers can never drift apart. */
export const rateWindows: Record<RateKey, RateWindow[]> = {
  weekday: [
    { label: "Daytime Rate", range: "6:00 AM – 4:00 PM", rate: 450 },
    { label: "Nighttime Rate", range: "4:00 PM – 2:00 AM", rate: 550 },
  ],
  weekend: [
    { label: "Daytime Rate", range: "6:00 AM – 4:00 PM", rate: 550 },
    { label: "Nighttime Rate", range: "4:00 PM – 2:00 AM", rate: 650 },
  ],
};

export function getRateKey(date: Date): RateKey {
  const day = date.getDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

export function isDaytimeHour(hour24: number) {
  return hour24 >= 6 && hour24 < 16;
}

export function getHourlyRate(date: Date, hour24: number) {
  const windows = rateWindows[getRateKey(date)];
  return isDaytimeHour(hour24) ? windows[0].rate : windows[1].rate;
}

/** Operating hours run 6:00 AM to 2:00 AM the next day — each entry is the 24-hour
 *  start hour of an hourly slot, so the last slot (1:00 AM) closes out at 2:00 AM. */
export const operatingHours = Array.from({ length: 20 }, (_, index) => (6 + index) % 24);

export function formatHour12(hour24: number) {
  const period = hour24 < 12 ? "AM" : "PM";
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour}:00 ${period}`;
}

export const timeSlots = operatingHours.map(formatHour12);

export const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const weekDayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function formatPrimeDate(date: Date) {
  return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

export function getWeekStart(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() - ((value.getDay() + 6) % 7));
  return value;
}

export function createQrPixelGrid(seed: number, size = 21) {
  const grid = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const hash = (row * 31 + col * 17 + seed * 7) % 5;
      grid[row][col] = hash < 2;
    }
  }

  const stampFinder = (originRow: number, originCol: number) => {
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        const isBorder = row === 0 || row === 6 || col === 0 || col === 6;
        const isCore = row >= 2 && row <= 4 && col >= 2 && col <= 4;
        grid[originRow + row][originCol + col] = isBorder || isCore;
      }
    }
  };

  stampFinder(0, 0);
  stampFinder(0, size - 7);
  stampFinder(size - 7, 0);

  return grid;
}

export type CalendarBooking = {
  name: string;
  pending: boolean;
  ref: string;
  amount: string;
  channel: string;
  phone: string;
  email: string;
  notes: string;
  submitted: string;
};

const calendarBookingNames = [
  "[Rivera]",
  "[Cruz]",
  "[Santos]",
  "[Reyes]",
  "[Tan]",
  "[Lim]",
  "[Garcia]",
  "[Mendoza]",
  "[Aquino]",
  "[Bautista]",
];

const calendarBookingChannels = ["GCash", "Maya", "Bank Transfer"];

/** `courtCount` scopes the mock data to whichever sport's court roster is active
 *  (7 for Pickleball, 4 for Badminton); `seedOffset` gives each sport its own
 *  distinct-looking mock schedule instead of reusing identical hash patterns. */
export function createAdminBookings(courtCount: number, seedOffset = 0) {
  const bookings: Record<string, CalendarBooking> = {};

  timeSlots.forEach((_, timeIndex) => {
    for (let courtIndex = 0; courtIndex < courtCount; courtIndex += 1) {
      const hash = (timeIndex * 5 + courtIndex * 7 + 3 + seedOffset) % 10;

      if (hash < 5) {
        const pending = hash === 2;
        const rate = getHourlyRate(new Date(), operatingHours[timeIndex]);

        bookings[`${timeIndex}-${courtIndex}`] = {
          name: calendarBookingNames[(timeIndex + courtIndex + seedOffset) % calendarBookingNames.length],
          pending,
          ref: `PRS-${100000 + ((timeIndex * 37 + courtIndex * 53 + seedOffset * 11) % 900000)}`,
          amount: formatCurrency(rate),
          channel: calendarBookingChannels[(timeIndex + courtIndex) % calendarBookingChannels.length],
          phone: "[Phone]",
          email: "[Email]",
          notes: "[Customer note]",
          submitted: "[Xm ago]",
        };
      }
    }
  });

  return bookings;
}

export type QueueHistoryStatus = "approved" | "rejected";

export type QueueHistoryEntry = QueueSubmission & {
  status: QueueHistoryStatus;
  resolvedBy: string;
  resolvedAt: string;
};

const queueHistoryStaff = ["A. Domingo", "R. Cabrera", "J. Villanueva", "M. Ferrer"];

const queueHistoryNames = [
  "[Rivera, M.]",
  "[Cruz, D.]",
  "[Santos, J.]",
  "[Reyes, K.]",
  "[Tan, R.]",
  "[Lim, C.]",
  "[Garcia, N.]",
  "[Mendoza, L.]",
  "[Aquino, P.]",
  "[Bautista, F.]",
  "[Ocampo, S.]",
  "[Del Rosario, E.]",
];

/** Deterministic mock ledger of already-resolved verification submissions — the
 *  "History" tab that sits next to the live Pending queue. About 1-in-3 land as
 *  rejected, newest first, going back a couple of weeks. */
export function createVerificationHistory(count = 22): QueueHistoryEntry[] {
  return Array.from({ length: count }, (_, index) => {
    const hash = (index * 13 + 5) % 10;
    const status: QueueHistoryStatus = hash < 3 ? "rejected" : "approved";
    const daysAgo = Math.floor(index / 2) + 1;
    const courtIndex = index % courtNames.length;
    const timeIndex = (index * 3) % operatingHours.length;
    const rate = getHourlyRate(new Date(), operatingHours[timeIndex]);

    return {
      id: 1000 + index,
      name: queueHistoryNames[index % queueHistoryNames.length],
      ref: `PRS-${730000 + index * 37}`,
      court: courtNames[courtIndex],
      time: formatHour12(operatingHours[timeIndex]),
      amount: formatCurrency(rate),
      channel: calendarBookingChannels[index % calendarBookingChannels.length],
      submitted: `${daysAgo + 1}d ago`,
      phone: "[Phone]",
      email: "[Email]",
      notes: "[Customer note]",
      status,
      resolvedBy: queueHistoryStaff[index % queueHistoryStaff.length],
      resolvedAt: daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`,
    };
  });
}

export type RosterSessionStatus = "completed" | "cancelled" | "no-show";

export type RosterSessionHistoryEntry = {
  id: string;
  sport: SportKey;
  date: string;
  court: string;
  timeSlot: string;
  organizer: string;
  playersCheckedIn: number;
  capacity: number;
  durationMinutes: number;
  status: RosterSessionStatus;
};

// createRosterSessionHistory() (deterministic mock ledger of past court-side
// check-in sessions) was removed here — roster-history.tsx now reads real
// rows via GET /api/roster-sessions/history (see the Phase 2 roster schema +
// lib/supabase/roster.ts's fetchRosterSessionHistory()). RosterSessionStatus
// / RosterSessionHistoryEntry stay exported: the real data is shaped to fit
// them exactly (id widened from the old mock's `number` to a real `string`
// roster_sessions.id).

export type NextRosterSession = {
  sport: SportKey;
  court: string;
  date: string;
  timeSlot: string;
  organizer: string;
  capacity: number;
  playersCheckedIn: number;
  startsIn: string;
};

/** Deterministic mock "what's coming up next" for the Roster page's Next
 *  Session panel — one upcoming booking per sport, so the panel visibly
 *  changes when the roster tabs switch sport. */
export function createNextRosterSession(sportKey: SportKey): NextRosterSession {
  const sport = getSport(sportKey);
  const isPickleball = sportKey === "pickleball";
  const courtIndex = isPickleball ? 2 : 1;
  const timeIndex = isPickleball ? 6 : 9;

  return {
    sport: sportKey,
    court: sport.courtNames[courtIndex] ?? sport.courtNames[0],
    date: formatPrimeDate(new Date()),
    timeSlot: formatHour12(operatingHours[timeIndex]),
    organizer: isPickleball ? "[Rivera, M.]" : "[Cruz, D.]",
    capacity: 10,
    playersCheckedIn: isPickleball ? 3 : 0,
    startsIn: isPickleball ? "Starts in 25 min" : "Starts in 1h 10m",
  };
}

// createVerificationQueue() (fake pending-submissions data) was removed here
// — verification-queue.tsx now reads real rows via GET /api/payment-submissions
// (see the Phase 2 payments migration + lib/payments.ts). QueueSubmission
// itself stays exported: QueueHistoryEntry above still extends it for the
// (still-mock, out of this slice's scope) resolved-submissions History tab.