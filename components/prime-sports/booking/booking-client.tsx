'use client';

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import BookingSteps from "@/components/prime-sports/booking/booking-steps";
import {
  BookingLineItem,
  useReservation,
} from "@/components/prime-sports/booking/reservation-provider";
import { useToast } from "@/components/prime-sports/toast/toast-provider";
import {
  BookingStepStatus,
  SportKey,
  formatCurrency,
  formatPrimeDate,
  getHourlyRate,
  getSport,
  getSportCourtLabel,
  getWeekStart,
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
  const { setBookings } = useReservation();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(today));
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);
  const [selections, setSelections] = useState<BookingLineItem[]>([]);
  const [activeSport, setActiveSport] = useState<SportKey>("pickleball");
  const dragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

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
  const total = selections.reduce((sum, item) => sum + getHourlyRate(item.date, operatingHours[item.timeIndex]), 0);
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
      const removedCount = selections.filter((s) => toDateKey(s.date) === key).length;
      const remaining = selectedDates.filter((d) => toDateKey(d) !== key);
      setSelectedDates(remaining);
      setSelections((prev) => prev.filter((s) => toDateKey(s.date) !== key));
      setActiveDateKey(remaining.length ? toDateKey(remaining[0]) : null);
      showToast({
        title: "Date removed",
        description: removedCount
          ? `${formatPrimeDate(date)} · ${removedCount} slot${removedCount > 1 ? "s" : ""} cleared`
          : formatPrimeDate(date),
      });
      return;
    }

    setActiveDateKey(key);
  }

  function handleSlotClick(courtIndex: number, timeIndex: number) {
    if (!activeDate) {
      return;
    }

    const candidate: BookingLineItem = { date: activeDate, sport: activeSport, courtIndex, timeIndex };
    const exists = selections.some((s) => sameItem(s, candidate));

    if (exists) {
      setSelections((prev) => prev.filter((s) => !sameItem(s, candidate)));
      return;
    }

    setSelections((prev) => [...prev, candidate]);
    const rate = getHourlyRate(activeDate, operatingHours[timeIndex]);
    showToast({
      title: "Slot added",
      description: `${getSportCourtLabel(activeSport, courtIndex)} · ${timeSlots[timeIndex]} · ${formatCurrency(rate)}`,
    });
  }

  function removeSelection(item: BookingLineItem) {
    setSelections((prev) => prev.filter((s) => !sameItem(s, item)));
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
                      const rate = getHourlyRate(activeDate, operatingHours[timeIndex]);

                      return (
                        <div key={time} className="grid gap-px bg-border" style={{ gridTemplateColumns }}>
                          <div className="bg-surface-muted px-2 py-2.5 text-center text-xs [font-family:var(--font-mono)] font-semibold text-foreground tabular-nums">{time}</div>
                          {activeSportCourts.map((court, courtIndex) => {
                            const selected = selections.some(
                              (s) => sameItem(s, { date: activeDate, sport: activeSport, courtIndex, timeIndex }),
                            );

                            return (
                              <button
                                key={`${court}-${time}`}
                                type="button"
                                className={`min-h-11 px-2 py-2.5 text-center text-xs font-semibold [font-family:var(--font-mono)] tabular-nums transition ${selected ? "bg-accent text-canvas" : "bg-surface text-foreground hover:bg-[rgba(212,163,89,0.12)] hover:text-foreground"}`}
                                onClick={() => handleSlotClick(courtIndex, timeIndex)}
                              >
                                {selected ? "✓ " : ""}
                                {formatCurrency(rate)}
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
                    const rate = getHourlyRate(item.date, operatingHours[item.timeIndex]);
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

                  setBookings(selections);
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