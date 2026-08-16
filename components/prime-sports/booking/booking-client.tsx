'use client';

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import BookingSteps from "@/components/prime-sports/booking/booking-steps";
import {
  BookingLineItem,
  useReservation,
} from "@/components/prime-sports/booking/reservation-provider";
import { useToast } from "@/components/prime-sports/toast/toast-provider";
import type { AvailabilityCourt, AvailabilityDay, SlotAvailability } from "@/lib/booking";
import { toDateString } from "@/lib/booking";
import { useRealtimeRefresh } from "@/lib/supabase/realtime";
import {
  BookingStepStatus,
  SportKey,
  formatCurrency,
  formatPrimeDate,
  getHourlyRate,
  getRateKey,
  getSport,
  getSportCourtLabel,
  getWeekStart,
  isDaytimeHour,
  monthNames,
  operatingHours,
  primeButtonPrimaryClass,
  primeContainerClasses,
  primeMetaLabelClass,
  primeMonoValueClass,
  primePlaceholderClass,
  primeSectionEyebrowClass,
  primeSectionHeaderRowClass,
  primeSectionTitleClass,
  primeSurfacePanelClass,
  primeToolbarIconButtonClass,
  sports,
  timeSlots,
  weekDayNames,
} from "@/lib/prime-sports";

function toDateKey(date: Date) {
  return date.toDateString();
}

/** Pure fetch+reshape helper (no setState of its own) so both the
 *  date/sport-change effect and the realtime-triggered refresh below can
 *  share one implementation without either of them calling a
 *  state-setting function reference directly from inside a bare
 *  `useEffect(...)` body — see the inline-IIFE convention already used by
 *  reservation-provider.tsx / verification-queue.tsx for why that matters
 *  under this project's react-hooks lint rules. Returns an empty map on any
 *  failure; callers treat that the same as "no live data yet", not as an
 *  error to surface — addBooking()'s own 409 handling remains the actual
 *  correctness guarantee either way. */
async function loadAvailabilityMap(date: Date, sport: SportKey): Promise<Map<number, Record<number, SlotAvailability>>> {
  const next = new Map<number, Record<number, SlotAvailability>>();

  try {
    const response = await fetch(
      `/api/availability?date=${encodeURIComponent(toDateString(date))}&sport=${encodeURIComponent(sport)}`,
    );

    if (!response.ok) {
      return next;
    }

    const data = (await response.json()) as { courts?: AvailabilityCourt[]; days?: AvailabilityDay[] };
    const courtIndexById = new Map((data.courts ?? []).map((court) => [court.id, court.courtIndex]));

    for (const day of data.days ?? []) {
      for (const slot of day.slots) {
        const perCourt: Record<number, SlotAvailability> = {};

        for (const [courtId, status] of Object.entries(slot.courts)) {
          const courtIndex = courtIndexById.get(courtId);
          if (courtIndex !== null && courtIndex !== undefined) {
            perCourt[courtIndex] = status;
          }
        }

        next.set(slot.hour24, perCourt);
      }
    }
  } catch {
    // Offline/unreachable API — non-fatal, see doc comment above.
  }

  return next;
}

type RateTier = { daytime: number; evening: number };
type UniformRates = { weekday: RateTier; weekend: RateTier };

function sameItem(a: BookingLineItem, b: BookingLineItem) {
  return (
    toDateKey(a.date) === toDateKey(b.date) &&
    a.sport === b.sport &&
    a.courtIndex === b.courtIndex &&
    a.timeIndex === b.timeIndex
  );
}

// Court columns are sized off the real court count (not hardcoded to 4) so an added
// court just widens the table instead of squeezing existing columns — the drag-scroll
// container below absorbs the overflow instead of the page layout shifting.
const TIME_COLUMN_PX = 90;
const COURT_COLUMN_PX = 150;

export default function BookingClient() {
  const router = useRouter();
  const { showToast } = useToast();
  const { contact, bookings: selections, addBooking, removeBooking } = useReservation();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(today));
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);
  const [activeSport, setActiveSport] = useState<SportKey>("pickleball");
  const dragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [lastSyncedSelections, setLastSyncedSelections] = useState(selections);
  const [hasJumpedToHydratedWeek, setHasJumpedToHydratedWeek] = useState(false);
  // Per-hour24, per-courtIndex live status for the active date/sport — other
  // guests' held/confirmed slots, not this session's own selections (those
  // are tracked separately via `selections` and always render as "selected").
  // Refetched on date/sport change and again whenever the realtime
  // subscription below signals a `bookings`/`slot_holds` change.
  const [availabilityByHour, setAvailabilityByHour] = useState<Map<number, Record<number, SlotAvailability>>>(
    new Map(),
  );
  // Real pricing from the `rate_cards` table — same GET /api/rate-cards
  // pricing-cards.tsx already reads for the homepage marketing display.
  // Starts `null` and is populated on mount; `getDisplayRate()` below falls
  // back to the old hardcoded `getHourlyRate()` table (the same
  // seed-with-a-fallback convention checkout-client.tsx's FALLBACK_CHANNELS
  // already uses for payment channels) until this arrives or if the fetch
  // ever fails, so the price shown here can never silently drift from what
  // /api/bookings actually stamps once real rates are loaded.
  const [rates, setRates] = useState<UniformRates | null>(null);

  // Adjusting state during render (not in an effect) when `selections`
  // changes is the pattern React's docs recommend for this — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  // Any selection's date is folded into `selectedDates` if it's missing (so
  // its chip/count shows up) — this matters for slots rehydrated from the
  // server after a refresh, which never went through handleDayClick locally.
  if (selections !== lastSyncedSelections) {
    setLastSyncedSelections(selections);

    if (selections.length > 0) {
      setSelectedDates((prev) => {
        const existingKeys = new Set(prev.map((d) => toDateKey(d)));
        const missing: Date[] = [];
        const seen = new Set<string>();

        for (const selection of selections) {
          const key = toDateKey(selection.date);
          if (!existingKeys.has(key) && !seen.has(key)) {
            seen.add(key);
            missing.push(selection.date);
          }
        }

        if (missing.length === 0) {
          return prev;
        }

        return [...prev, ...missing].sort((a, b) => a.getTime() - b.getTime());
      });

      setActiveDateKey((prev) => prev ?? toDateKey(selections[0].date));

      // Only jump the visible week once, right after rehydration — otherwise
      // this would yank the calendar back every time a slot is added while
      // the user is deliberately browsing a different week.
      if (!hasJumpedToHydratedWeek) {
        setHasJumpedToHydratedWeek(true);
        const earliest = selections.reduce((min, item) => (item.date < min ? item.date : min), selections[0].date);
        setWeekStart(getWeekStart(earliest));
      }
    }
  }

  // GET /api/rate-cards once on mount — the same endpoint/response shape
  // pricing-cards.tsx already consumes. Non-fatal on failure: getDisplayRate()
  // below just keeps using its getHourlyRate() fallback.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/rate-cards");
        const data = await response.json().catch(() => null);
        if (!cancelled && response.ok && data?.rates) {
          setRates(data.rates as UniformRates);
        }
      } catch {
        // Network error — getDisplayRate() keeps falling back to getHourlyRate().
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Switching sport swaps to a narrower/wider grid — reset horizontal scroll so the
  // new column set never opens mid-scroll or partially off-screen.
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [activeSport]);

  const activeDate = selectedDates.find((date) => toDateKey(date) === activeDateKey) ?? null;
  const activeSportCourts = getSport(activeSport).courtNames;
  const gridTemplateColumns = `${TIME_COLUMN_PX}px repeat(${activeSportCourts.length}, minmax(${COURT_COLUMN_PX}px, 1fr))`;
  const minTableWidth = TIME_COLUMN_PX + activeSportCourts.length * COURT_COLUMN_PX;

  // GET /api/availability for just the active date/sport — the same
  // court/rate-card/booking data the backend already computes, scoped down
  // to what this view needs to gray out slots someone else already holds or
  // has confirmed. Failures here are non-fatal: the grid just keeps showing
  // the last-known state, and addBooking()'s existing 409 handling below
  // remains the actual source of truth for whether a click succeeds.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const next = activeDate
        ? await loadAvailabilityMap(activeDate, activeSport)
        : new Map<number, Record<number, SlotAvailability>>();

      if (!cancelled) {
        setAvailabilityByHour(next);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeDate, activeSport]);

  // Live updates: someone else booking/holding/cancelling a slot — or staff
  // blocking/unblocking one from the admin "Edit Availability" screen — on
  // this date should regray/reopen the grid without the guest needing to
  // reselect a date or refresh. Falls back to polling internally if the
  // realtime channel never subscribes (or drops) — see
  // lib/supabase/realtime.ts. This callback isn't invoked from a bare
  // `useEffect` body in this component (it fires from inside
  // useRealtimeRefresh's own effect instead), so it can safely
  // await-then-setState the same way the effect above does.
  useRealtimeRefresh("booking-availability", ["bookings", "slot_holds", "slot_blocks"], () => {
    if (!activeDate) {
      return;
    }

    void (async () => {
      const next = await loadAvailabilityMap(activeDate, activeSport);
      setAvailabilityByHour(next);
    })();
  });

  // Click-and-drag horizontal scrolling for mouse users (touch/trackpad already scroll
  // natively via overflow-x-auto). A capturing click handler swallows the click that
  // would otherwise fire on a slot button when the pointer-up ends an actual drag.
  function handleSlotGridPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") {
      return;
    }

    dragRef.current = { isDown: true, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft, moved: false };
  }

  function handleSlotGridPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag.isDown) {
      return;
    }

    const delta = event.clientX - drag.startX;
    if (Math.abs(delta) > 3) {
      drag.moved = true;
    }

    event.currentTarget.scrollLeft = drag.scrollLeft - delta;
  }

  function handleSlotGridPointerUp() {
    dragRef.current.isDown = false;
  }

  function handleSlotGridClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (dragRef.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      dragRef.current.moved = false;
    }
  }

  // Same signature shape as getHourlyRate(date, hour24) so every existing
  // call site below swaps in with no other change — reads the real
  // `rate_cards` values once loaded, falling back to the old hardcoded table
  // only until then (see the `rates` state doc comment above).
  function getDisplayRate(date: Date, hour24: number) {
    if (!rates) {
      return getHourlyRate(date, hour24);
    }

    const dayType = getRateKey(date);
    const timeOfDay = isDaytimeHour(hour24) ? "daytime" : "evening";
    return rates[dayType][timeOfDay];
  }

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });

  const endOfWeek = new Date(weekStart);
  endOfWeek.setDate(weekStart.getDate() + 6);
  const canGoBack = new Date(weekStart).setDate(weekStart.getDate() - 7) >= today.getTime();
  const isReady = selections.length > 0;
  const containerClassName = primeContainerClasses.default;
  const dateDone = selectedDates.length > 0;
  const slotDone = selections.length > 0;
  const total = selections.reduce((sum, item) => sum + getDisplayRate(item.date, operatingHours[item.timeIndex]), 0);
  const stepStatuses: BookingStepStatus[] = [
    "done",
    dateDone ? "done" : "current",
    slotDone ? "done" : dateDone ? "current" : "upcoming",
    "upcoming",
  ];

  function handleDayClick(date: Date) {
    const key = toDateKey(date);
    const alreadySelected = selectedDates.some((d) => toDateKey(d) === key);

    if (!alreadySelected) {
      setSelectedDates((prev) => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
      setActiveDateKey(key);
      showToast({ title: "Date added", description: formatPrimeDate(date) });
      return;
    }

    if (activeDateKey === key) {
      const toRemove = selections.filter((s) => toDateKey(s.date) === key);
      const remaining = selectedDates.filter((d) => toDateKey(d) !== key);
      setSelectedDates(remaining);
      setActiveDateKey(remaining.length ? toDateKey(remaining[0]) : null);
      toRemove.forEach((item) => {
        void removeBooking(item);
      });
      showToast({
        title: "Date removed",
        description: toRemove.length
          ? `${formatPrimeDate(date)} · ${toRemove.length} slot${toRemove.length > 1 ? "s" : ""} cleared`
          : formatPrimeDate(date),
      });
      return;
    }

    setActiveDateKey(key);
  }

  async function handleSlotClick(courtIndex: number, timeIndex: number) {
    if (!activeDate) {
      return;
    }

    const candidate: BookingLineItem = { date: activeDate, sport: activeSport, courtIndex, timeIndex };
    const existing = selections.find((s) => sameItem(s, candidate));

    if (existing) {
      await removeBooking(existing);
      return;
    }

    const liveStatus = availabilityByHour.get(operatingHours[timeIndex])?.[courtIndex] ?? "open";
    if (liveStatus !== "open") {
      // Belt-and-suspenders alongside the disabled button below — the
      // authoritative check either way is addBooking()'s 409 handling via
      // the bookings table's unique composite index, this just avoids a
      // pointless round-trip when the live grid already shows it's taken.
      showToast({ title: "Slot unavailable", description: "That slot was just taken — pick another." });
      return;
    }

    if (!contact) {
      showToast({
        title: "Contact details needed",
        description: "Please fill out your contact details before picking a slot.",
      });
      router.push("/reserve");
      return;
    }

    const rate = getDisplayRate(activeDate, operatingHours[timeIndex]);
    const result = await addBooking(candidate);

    if (!result.ok) {
      showToast({ title: "Slot unavailable", description: result.error });
      return;
    }

    showToast({
      title: "Slot added",
      description: `${getSportCourtLabel(activeSport, courtIndex)} · ${timeSlots[timeIndex]} · ${formatCurrency(rate)}`,
    });
  }

  function removeSelection(item: BookingLineItem) {
    void removeBooking(item);
  }

  const sortedSelections = [...selections].sort(
    (a, b) =>
      a.date.getTime() - b.date.getTime() ||
      a.timeIndex - b.timeIndex ||
      a.sport.localeCompare(b.sport) ||
      a.courtIndex - b.courtIndex,
  );

  return (
    // Cream band: everything from the step timeline down to (but not including) the
    // footer — the page title above this stays on the default dark background.
    <div className="bg-foreground text-canvas" data-nav-theme="light">
      <BookingSteps statuses={stepStatuses} backHref="/reserve" backLabel="Back to Details" />

      <section className={`${containerClassName} py-10`} data-od-id="booking-calendar">
        <div className={primeSectionHeaderRowClass}>
          <div>
            <p className={primeSectionEyebrowClass}>Rolling Week</p>
            <h2 className={primeSectionTitleClass}>Select one or more dates</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={primeToolbarIconButtonClass}
              id="prevWeek"
              aria-label="Previous week"
              disabled={!canGoBack}
              onClick={() => {
                if (!canGoBack) {
                  return;
                }

                const previous = new Date(weekStart);
                previous.setDate(previous.getDate() - 7);
                setWeekStart(previous);
              }}
            >
              ←
            </button>
            <span className={primeMonoValueClass} id="weekRange">
              {formatPrimeDate(weekStart)} — {formatPrimeDate(endOfWeek)}
            </span>
            <button
              type="button"
              className={primeToolbarIconButtonClass}
              id="nextWeek"
              aria-label="Next week"
              onClick={() => {
                const next = new Date(weekStart);
                next.setDate(next.getDate() + 7);
                setWeekStart(next);
              }}
            >
              →
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 max-[640px]:grid-cols-1" id="weekGrid">
          {weekDays.map((date, index) => {
            const isPast = date < today;
            const key = toDateKey(date);
            const isSelected = selectedDates.some((d) => toDateKey(d) === key);
            const isActive = activeDateKey === key;
            const countForDay = selections.filter((s) => toDateKey(s.date) === key).length;

            const stateClass = isPast
              ? "cursor-not-allowed border-border bg-surface-muted text-inactive opacity-60"
              : isActive
                ? "border-accent-secondary bg-accent text-canvas shadow-[var(--shadow-sm)]"
                : isSelected
                  ? "border-accent-secondary bg-surface text-foreground"
                  : "border-border bg-surface text-foreground hover:-translate-y-px hover:border-accent-secondary";

            return (
              <button
                key={key}
                type="button"
                className={`relative flex min-h-[84px] flex-col justify-center gap-1 rounded-[var(--radius)] border px-2 py-3.5 text-center transition ${stateClass}`}
                disabled={isPast}
                onClick={() => handleDayClick(date)}
              >
                {countForDay > 0 ? (
                  <span className="absolute -right-2 -top-2 inline-flex size-5 items-center justify-center rounded-full bg-accent-secondary text-[10px] font-bold text-canvas shadow-[var(--shadow-sm)]">
                    {countForDay}
                  </span>
                ) : null}
                <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${isActive ? "opacity-70" : "opacity-60"}`}>
                  {weekDayNames[index]}
                </span>
                <span className="[font-family:var(--font-mono)] text-[22px] font-semibold leading-none tabular-nums">{date.getDate()}</span>
                <span className={`text-[10px] uppercase tracking-[0.06em] ${isActive ? "opacity-70" : "opacity-50"}`}>
                  {monthNames[date.getMonth()]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={`${containerClassName} py-10`} data-od-id="booking-slots">
        <div className={primeSectionHeaderRowClass}>
          <div>
            <p className={primeSectionEyebrowClass}>Hourly Availability · 6:00 AM – 2:00 AM</p>
            <h2 className={primeSectionTitleClass}>
              {activeDate ? `Select courts & hours for ${formatPrimeDate(activeDate)}` : "Select courts & hours"}
            </h2>
          </div>
          <div className="flex flex-wrap gap-5">
            <span className="inline-flex items-center gap-2 text-xs opacity-80">
              <span className="size-4 rounded border border-border bg-surface" />Open
            </span>
            <span className="inline-flex items-center gap-2 text-xs opacity-80">
              <span className="size-4 rounded border border-accent-secondary bg-accent" />Selected
            </span>
            <span className="inline-flex items-center gap-2 text-xs opacity-80">
              <span className="size-4 rounded border border-border bg-surface-muted opacity-60" />Unavailable
            </span>
          </div>
        </div>

        <div role="tablist" aria-label="Sport" className="mb-6 inline-flex flex-wrap gap-1 rounded-[var(--radius)] border border-border bg-surface-muted p-1 text-foreground">
          {sports.map((sport) => {
            const isActive = sport.key === activeSport;

            return (
              <button
                key={sport.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`rounded-[calc(var(--radius)-2px)] px-4 py-2 text-xs font-bold uppercase tracking-[0.05em] transition ${
                  isActive
                    ? sport.key === "badminton"
                      ? "bg-accent text-canvas shadow-[var(--shadow-sm)]"
                      : "bg-accent-secondary text-canvas shadow-[var(--shadow-sm)]"
                    : "text-foreground/70 hover:text-foreground"
                }`}
                onClick={() => setActiveSport(sport.key)}
              >
                {sport.label}
                <span className="ml-1.5 opacity-70">({sport.courtNames.length})</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-[1.7fr_1fr] items-start gap-8 max-[980px]:grid-cols-1">
          <div className="min-w-0">
            {activeDate ? (
              <div
                ref={scrollContainerRef}
                className="cursor-grab overflow-x-auto select-none rounded-[var(--radius)] border border-border bg-surface active:cursor-grabbing"
                onPointerDown={handleSlotGridPointerDown}
                onPointerMove={handleSlotGridPointerMove}
                onPointerUp={handleSlotGridPointerUp}
                onPointerLeave={handleSlotGridPointerUp}
                onClickCapture={handleSlotGridClickCapture}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeSport}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    style={{ minWidth: `${minTableWidth}px` }}
                    id="slotGrid"
                  >
                    <div className="grid gap-px bg-border" style={{ gridTemplateColumns }}>
                      <div className="bg-surface-muted px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.06em] text-foreground">Time</div>
                      {activeSportCourts.map((court) => (
                        <div key={court} className="bg-surface-muted px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.06em] text-foreground">
                          {court}
                        </div>
                      ))}
                    </div>
                    {timeSlots.map((time, timeIndex) => {
                      const rate = getDisplayRate(activeDate, operatingHours[timeIndex]);

                      return (
                        <div key={time} className="grid gap-px bg-border" style={{ gridTemplateColumns }}>
                          <div className="bg-surface-muted px-2 py-2.5 text-center text-xs [font-family:var(--font-mono)] font-semibold text-foreground tabular-nums">{time}</div>
                          {activeSportCourts.map((court, courtIndex) => {
                            const selected = selections.some(
                              (s) => sameItem(s, { date: activeDate, sport: activeSport, courtIndex, timeIndex }),
                            );
                            const liveStatus: SlotAvailability =
                              availabilityByHour.get(operatingHours[timeIndex])?.[courtIndex] ?? "open";
                            const isTakenByOther = !selected && liveStatus !== "open";

                            return (
                              <button
                                key={`${court}-${time}`}
                                type="button"
                                disabled={isTakenByOther}
                                aria-disabled={isTakenByOther}
                                className={`min-h-11 px-2 py-2.5 text-center text-xs font-semibold [font-family:var(--font-mono)] tabular-nums transition ${
                                  selected
                                    ? "bg-accent text-canvas"
                                    : isTakenByOther
                                      ? "cursor-not-allowed bg-surface-muted text-inactive opacity-60"
                                      : "bg-surface text-foreground hover:bg-[rgba(212,163,89,0.12)] hover:text-foreground"
                                }`}
                                onClick={() => void handleSlotClick(courtIndex, timeIndex)}
                              >
                                {selected ? "✓ " : ""}
                                {isTakenByOther
                                  ? liveStatus === "booked"
                                    ? "Booked"
                                    : liveStatus === "blocked"
                                      ? "Closed"
                                      : "Held"
                                  : formatCurrency(rate)}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            ) : (
              <div className="rounded-[var(--radius)] border border-dashed border-border bg-surface-muted p-10 text-center text-sm text-foreground opacity-60">
                Select one or more dates above, then tap a date to view and book its hourly availability.
              </div>
            )}
          </div>

          <div className={`${primeSurfacePanelClass} sticky top-24 self-start`} data-od-id="booking-summary">
            <p className={primeSectionEyebrowClass}>Your Selections</p>
            <h3 className={primeSectionTitleClass}>Booking Summary</h3>

            <div className="mt-5">
              {sortedSelections.length === 0 ? (
                <p className="text-sm">
                  <span className={primePlaceholderClass}>[No slots selected yet — pick a date and tap an open hour]</span>
                </p>
              ) : (
                <ul className="flex max-h-[420px] flex-col gap-2.5 overflow-y-auto pr-1" data-od-id="booking-cart">
                  {sortedSelections.map((item) => {
                    const rate = getDisplayRate(item.date, operatingHours[item.timeIndex]);
                    const key = `${toDateKey(item.date)}-${item.sport}-${item.courtIndex}-${item.timeIndex}`;
                    const label = getSportCourtLabel(item.sport, item.courtIndex);

                    return (
                      <li key={key} className="rounded-[var(--radius)] border border-border bg-canvas px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{label}</span>
                          <button
                            type="button"
                            aria-label={`Remove ${label} · ${timeSlots[item.timeIndex]} on ${formatPrimeDate(item.date)}`}
                            className={primeToolbarIconButtonClass}
                            onClick={() => removeSelection(item)}
                          >
                            ✕
                          </button>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-xs opacity-70">
                          <span className="[font-family:var(--font-mono)] tabular-nums">
                            {formatPrimeDate(item.date)} · {timeSlots[item.timeIndex]}
                          </span>
                          <span className="[font-family:var(--font-mono)] font-semibold tabular-nums opacity-100">
                            {formatCurrency(rate)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-5 border-t border-border pt-5">
              <p className={primeMetaLabelClass}>Total Amount</p>
              <p className="m-0 text-2xl font-bold [font-family:var(--font-mono)] tabular-nums">
                {isReady ? formatCurrency(total) : <span className={primePlaceholderClass}>[Total]</span>}
              </p>
              <button
                type="button"
                className={`${primeButtonPrimaryClass} mt-4 w-full justify-center`}
                aria-disabled={!isReady}
                disabled={!isReady}
                onClick={() => {
                  if (!selections.length) {
                    return;
                  }

                  // Selections are already persisted as `held` bookings one
                  // at a time as they're picked (see addBooking() in
                  // reservation-provider.tsx) — nothing left to sync here.
                  showToast({
                    title: "Schedule confirmed",
                    description: `${selections.length} slot${selections.length > 1 ? "s" : ""} · proceeding to payment.`,
                    variant: "success",
                  });
                  router.push("/checkout");
                }}
              >
                Proceed to Checkout →
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}