'use client';

import { useEffect, useRef, useState } from "react";

import { useToast } from "@/components/prime-sports/toast/toast-provider";
import {
  formatHour12,
  formatPrimeDate,
  getSport,
  getWeekStart,
  monthNames,
  operatingHours,
  primeButtonPrimaryClass,
  primeContainerClasses,
  primeMonoValueClass,
  primeSectionTitleClass,
  primeSurfaceCardClass,
  primeToolbarIconButtonClass,
  SportKey,
  sports,
  weekDayNames,
} from "@/lib/prime-sports";

const TIME_COLUMN_PX = 70;
const COURT_COLUMN_PX = 170;

function toDateKey(date: Date) {
  return date.toDateString();
}

function slotKey(dateKey: string, sport: SportKey, timeIndex: number, courtIndex: number) {
  return `${dateKey}-${sport}-${timeIndex}-${courtIndex}`;
}

export default function AvailabilityEditor() {
  const { showToast } = useToast();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(today));
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);
  const [activeSport, setActiveSport] = useState<SportKey>("pickleball");
  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const dragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const activeDate = selectedDates.find((date) => toDateKey(date) === activeDateKey) ?? null;

  // Switching the active date or sport swaps to a different grid — reset
  // horizontal scroll so the new column set never opens mid-scroll.
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [activeDateKey, activeSport]);

  const activeSportDefinition = getSport(activeSport);
  const activeSportCourts = activeSportDefinition.courtNames;
  const gridTemplateColumns = `${TIME_COLUMN_PX}px repeat(${activeSportCourts.length}, minmax(${COURT_COLUMN_PX}px, 1fr))`;
  const minTableWidth = TIME_COLUMN_PX + activeSportCourts.length * COURT_COLUMN_PX;

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
  const endOfWeek = new Date(weekStart);
  endOfWeek.setDate(weekStart.getDate() + 6);
  const canGoBack = new Date(weekStart).setDate(weekStart.getDate() - 7) >= today.getTime();

  function handleGridPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") {
      return;
    }

    dragRef.current = { isDown: true, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft, moved: false };
  }

  function handleGridPointerMove(event: React.PointerEvent<HTMLDivElement>) {
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

  function handleGridPointerUp() {
    dragRef.current.isDown = false;
  }

  function handleGridClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (dragRef.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      dragRef.current.moved = false;
    }
  }

  function handleDayClick(date: Date) {
    const key = toDateKey(date);
    const alreadySelected = selectedDates.some((d) => toDateKey(d) === key);

    if (!alreadySelected) {
      setSelectedDates((prev) => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
      setActiveDateKey(key);
      return;
    }

    if (activeDateKey === key) {
      const remaining = selectedDates.filter((d) => toDateKey(d) !== key);
      setSelectedDates(remaining);
      setActiveDateKey(remaining.length ? toDateKey(remaining[0]) : null);
      return;
    }

    setActiveDateKey(key);
  }

  function toggleSlot(timeIndex: number, courtIndex: number) {
    if (!activeDate) {
      return;
    }

    const key = slotKey(toDateKey(activeDate), activeSport, timeIndex, courtIndex);

    setBlockedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    setIsDirty(true);
  }

  function handleSave() {
    setIsDirty(false);
    showToast({
      title: "Availability saved",
      description: `${selectedDates.length || 1} date${selectedDates.length === 1 ? "" : "s"} · ${activeSportDefinition.label} availability updated.`,
      variant: "success",
    });
  }

  const containerClassName = primeContainerClasses.wide;

  return (
    <section className={`${containerClassName} py-7`} data-od-id="admin-availability">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className={primeSectionTitleClass}>Edit Availability</h2>
        <div style={{ fontSize: 12, opacity: 0.6 }}>Pick one or more dates, then block hours for maintenance, tournaments, or closures</div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Sport" className="inline-flex flex-wrap gap-1 rounded-[var(--radius)] border border-border bg-surface-muted p-1">
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

        <div className="flex flex-wrap gap-5 text-xs opacity-80">
          <span className="inline-flex items-center gap-2">
            <span className="size-4 rounded border border-border bg-surface" />Open
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-4 rounded border border-accent bg-[rgba(200,55,45,0.18)]" />Blocked
          </span>
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Rolling Week</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={primeToolbarIconButtonClass}
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
            <span className={primeMonoValueClass}>
              {formatPrimeDate(weekStart)} — {formatPrimeDate(endOfWeek)}
            </span>
            <button
              type="button"
              className={primeToolbarIconButtonClass}
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

        <div className="grid grid-cols-7 gap-2 max-[640px]:grid-cols-1">
          {weekDays.map((date, index) => {
            const isPast = date < today;
            const key = toDateKey(date);
            const isSelected = selectedDates.some((d) => toDateKey(d) === key);
            const isActive = activeDateKey === key;
            const blockedCountForDay = Array.from(blockedSlots).filter((slot) => slot.startsWith(`${key}-`)).length;

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
                className={`relative flex min-h-[72px] flex-col justify-center gap-1 rounded-[var(--radius)] border px-2 py-3 text-center transition ${stateClass}`}
                disabled={isPast}
                onClick={() => handleDayClick(date)}
              >
                {blockedCountForDay > 0 ? (
                  <span className="absolute -right-2 -top-2 inline-flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-foreground shadow-[var(--shadow-sm)]">
                    {blockedCountForDay}
                  </span>
                ) : null}
                <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${isActive ? "opacity-70" : "opacity-60"}`}>
                  {weekDayNames[index]}
                </span>
                <span className="[font-family:var(--font-mono)] text-[18px] font-semibold leading-none tabular-nums">{date.getDate()}</span>
                <span className={`text-[10px] uppercase tracking-[0.06em] ${isActive ? "opacity-70" : "opacity-50"}`}>
                  {monthNames[date.getMonth()]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeDate ? (
        <div className={primeSurfaceCardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted px-5 py-3.5">
            <div className="[font-family:var(--font-mono)] text-base font-semibold tabular-nums">
              {activeSportDefinition.label} · {formatPrimeDate(activeDate)}
            </div>
            <div className="text-[12px] opacity-60">
              {(() => {
                const count = Array.from(blockedSlots).filter((slot) =>
                  slot.startsWith(`${toDateKey(activeDate)}-${activeSport}-`),
                ).length;
                return count > 0 ? `${count} slot${count > 1 ? "s" : ""} blocked` : "All slots open";
              })()}
            </div>
          </div>
          <div
            ref={scrollContainerRef}
            className="cursor-grab overflow-x-auto select-none active:cursor-grabbing"
            onPointerDown={handleGridPointerDown}
            onPointerMove={handleGridPointerMove}
            onPointerUp={handleGridPointerUp}
            onPointerLeave={handleGridPointerUp}
            onClickCapture={handleGridClickCapture}
          >
            <div style={{ minWidth: `${minTableWidth}px` }}>
              <div className="grid gap-px bg-border" style={{ gridTemplateColumns }}>
                <div className="flex min-h-[38px] items-center justify-center bg-surface-muted px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-foreground">Time</div>
                {activeSportCourts.map((court) => (
                  <div key={court} className="flex min-h-[38px] items-center justify-center bg-surface-muted px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-foreground">
                    {court}
                  </div>
                ))}
              </div>
              {operatingHours.map((hour24, timeIndex) => (
                <div key={hour24} className="grid gap-px bg-border" style={{ gridTemplateColumns }}>
                  <div className="min-h-[42px] bg-surface-muted px-2 py-1.5 text-[11px] [font-family:var(--font-mono)] font-semibold tabular-nums">
                    {formatHour12(hour24)}
                  </div>
                  {activeSportCourts.map((court, courtIndex) => {
                    const blocked = blockedSlots.has(slotKey(toDateKey(activeDate), activeSport, timeIndex, courtIndex));

                    return (
                      <button
                        key={`${court}-${hour24}`}
                        type="button"
                        className={`min-h-[42px] cursor-pointer px-2 py-1.5 text-center text-[11px] font-semibold transition ${
                          blocked
                            ? "bg-[rgba(200,55,45,0.18)] text-accent hover:bg-[rgba(200,55,45,0.28)]"
                            : "bg-surface text-foreground/40 hover:bg-[rgba(212,163,89,0.12)] hover:text-foreground"
                        }`}
                        onClick={() => toggleSlot(timeIndex, courtIndex)}
                      >
                        {blocked ? "Blocked" : "Open"}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[var(--radius)] border border-dashed border-border bg-surface-muted p-10 text-center text-sm opacity-60">
          Select one or more dates above, then tap a date to block or reopen its courts and hours.
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <p className="max-w-[60ch] text-xs opacity-60">
          Blocking a slot here removes it from the public booking grid for that specific date until unblocked — use it for maintenance, tournaments, or one-off closures.
        </p>
        <button
          type="button"
          className={primeButtonPrimaryClass}
          aria-disabled={!isDirty}
          disabled={!isDirty}
          onClick={handleSave}
        >
          Save Changes
        </button>
      </div>
    </section>
  );
}
