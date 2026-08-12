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

export function createAdminBookings() {
  const names = [
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

  const bookings: Record<string, { name: string; pending: boolean }> = {};

  timeSlots.forEach((time, timeIndex) => {
    courtNames.forEach((court, courtIndex) => {
      const hash = (timeIndex * 5 + courtIndex * 7 + 3) % 10;
      if (hash < 5) {
        const pending = hash === 2;
        bookings[`${timeIndex}-${courtIndex}`] = {
          name: names[(timeIndex + courtIndex) % names.length],
          pending,
        };
      }
    });
  });

  return bookings;
}

export function createVerificationQueue(): QueueSubmission[] {
  return [
    {
      id: 1,
      name: "[Rivera, M.]",
      ref: "PRS-742193",
      court: "Court A",
      time: "09:00",
      amount: "[Rate]",
      channel: "GCash",
      submitted: "[Xm ago]",
      phone: "[Phone]",
      email: "[Email]",
      notes: "[Customer note]",
    },
    {
      id: 2,
      name: "[Santos, J.]",
      ref: "PRS-742208",
      court: "Court C",
      time: "13:00",
      amount: "[Rate]",
      channel: "Bank Transfer",
      submitted: "[Xm ago]",
      phone: "[Phone]",
      email: "[Email]",
      notes: "[Customer note]",
    },
    {
      id: 3,
      name: "[Tan, R.]",
      ref: "PRS-742187",
      court: "Court B",
      time: "15:00",
      amount: "[Rate]",
      channel: "Maya",
      submitted: "[Xm ago]",
      phone: "[Phone]",
      email: "[Email]",
      notes: "[Customer note]",
    },
    {
      id: 4,
      name: "[Aquino, P.]",
      ref: "PRS-742155",
      court: "Court D",
      time: "10:00",
      amount: "[Rate]",
      channel: "GCash",
      submitted: "[Xm ago]",
      phone: "[Phone]",
      email: "[Email]",
      notes: "[Customer note]",
    },
  ];
}