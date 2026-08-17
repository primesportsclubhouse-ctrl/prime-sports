'use client';

import { useEffect, useRef, useState } from "react";

import BookingDetailDialog from "@/components/prime-sports/admin/booking-detail-dialog";
import { toDateString } from "@/lib/booking";
import {
  CalendarBooking,
  formatPrimeDate,
  getSport,
  primeContainerClasses,
  primeSectionTitleClass,
  primeSurfaceCardClass,
  primeToolbarIconButtonClass,
  primeToolbarTextButtonClass,
  SportKey,
  sports,
  timeSlots,
  weekDayNames,
} from "@/lib/prime-sports";
import { useRealtimeRefresh } from "@/lib/supabase/realtime";

const TIME_COLUMN_PX = 70;
const COURT_COLUMN_PX = 170;

type ActiveCalendarCell = {
  booking: CalendarBooking;
  courtLabel: string;
  time: string;
};

export default function MasterCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [activeSport, setActiveSport] = useState<SportKey>("pickleball");
  const [activeCell, setActiveCell] = useState<ActiveCalendarCell | null>(null);
  const [bookingMap, setBookingMap] = useState<Record<string, CalendarBooking>>({});
  // Tracks which `dateKey|sport` combination `bookingMap` actually reflects —
  // `isLoading` is derived from comparing the two rather than a separate
  // boolean flipped inside the fetch effect (that flip would otherwise be a
  // setState call with no preceding `await`, which
  // react-hooks/set-state-in-effect flags — same convention roster-client.tsx
  // and roster-history.tsx already use for their own date/sport-scoped
  // fetches).
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Switching sport swaps to a narrower/wider grid — reset horizontal scroll so the
  // new column set never opens mid-scroll or partially off-screen.
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [activeSport]);

  const activeSportDefinition = getSport(activeSport);
  const activeSportCourts = activeSportDefinition.courtNames;
  const dateKey = toDateString(currentDate);
  const requestKey = `${dateKey}|${activeSport}`;
  const isLoading = loadedRequestKey !== requestKey;
  const dayLabel = weekDayNames[(currentDate.getDay() + 6) % 7];

  // Loads real bookings (joined to their customer + latest payment
  // submission) for the currently-viewed date/sport — replaces
  // createAdminBookings()'s deterministic fake grid. Refetches whenever the
  // viewed date or active sport changes.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `/api/admin-calendar?date=${encodeURIComponent(dateKey)}&sport=${activeSport}`,
        );
        const data = await response.json().catch(() => null);

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setLoadError(data?.error ?? "Could not load the calendar.");
          setBookingMap({});
          return;
        }

        setLoadError(null);
        setBookingMap(data?.bookings && typeof data.bookings === "object" ? data.bookings : {});
      } catch {
        if (!cancelled) {
          setLoadError("Network error — could not load the calendar.");
          setBookingMap({});
        }
      } finally {
        if (!cancelled) {
          setLoadedRequestKey(requestKey);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dateKey, activeSport, requestKey]);

  // Live updates: a new booking, a payment submission being approved/
  // rejected, or a fresh checkout landing on this same date/sport all refresh
  // the grid here without a manual reload. Falls back to polling internally
  // if the realtime channel never subscribes (or drops) — see
  // lib/supabase/realtime.ts.
  useRealtimeRefresh("admin-master-calendar", ["bookings", "payment_submissions"], () => {
    void (async () => {
      try {
        const response = await fetch(
          `/api/admin-calendar?date=${encodeURIComponent(dateKey)}&sport=${activeSport}`,
        );
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setLoadError(data?.error ?? "Could not load the calendar.");
          return;
        }

        setLoadError(null);
        setBookingMap(data?.bookings && typeof data.bookings === "object" ? data.bookings : {});
      } catch {
        setLoadError("Network error — could not load the calendar.");
      }
    })();
  });

  const gridTemplateColumns = `${TIME_COLUMN_PX}px repeat(${activeSportCourts.length}, minmax(${COURT_COLUMN_PX}px, 1fr))`;
  const minTableWidth = TIME_COLUMN_PX + activeSportCourts.length * COURT_COLUMN_PX;

  // Click-and-drag horizontal scrolling for mouse users, mirroring the booking
  // page's hourly-availability table (touch/trackpad already scroll natively).
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

  const containerClassName = primeContainerClasses.wide;

  return (
    <>
      <section className={`${containerClassName} py-7`} data-od-id="admin-calendar">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className={primeSectionTitleClass}>Master Booking Calendar</h2>
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            {loadError ? <span className="text-accent">{loadError}</span> : "Daily schedule · all courts side-by-side"}
          </div>
        </div>

        <div role="tablist" aria-label="Sport" className="mb-4 inline-flex flex-wrap gap-1 rounded-[var(--radius)] border border-border bg-surface-muted p-1">
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

        <div className={primeSurfaceCardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted px-5 py-3.5">
            <div className="[font-family:var(--font-mono)] text-base font-semibold tabular-nums" id="calDate">
              {formatPrimeDate(currentDate)} · {dayLabel}
              {isLoading ? <span className="ml-2 text-xs font-medium opacity-50">Loading…</span> : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={primeToolbarIconButtonClass}
                onClick={() => {
                  const previous = new Date(currentDate);
                  previous.setDate(previous.getDate() - 1);
                  setCurrentDate(previous);
                }}
              >
                ←
              </button>
              <button
                type="button"
                className={primeToolbarTextButtonClass}
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </button>
              <button
                type="button"
                className={primeToolbarIconButtonClass}
                onClick={() => {
                  const next = new Date(currentDate);
                  next.setDate(next.getDate() + 1);
                  setCurrentDate(next);
                }}
              >
                →
              </button>
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
            <div style={{ minWidth: `${minTableWidth}px` }} id="calInner">
              <div className="grid gap-px bg-border" style={{ gridTemplateColumns }}>
                <div className="flex min-h-[38px] items-center justify-center bg-surface-muted px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-foreground">Time</div>
                {activeSportCourts.map((court) => (
                  <div key={court} className="flex min-h-[38px] items-center justify-center bg-surface-muted px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-foreground">
                    {court}
                  </div>
                ))}
              </div>
              {timeSlots.map((time, timeIndex) => (
                <div key={time} className="grid gap-px bg-border" style={{ gridTemplateColumns }}>
                  <div className="min-h-[54px] bg-surface-muted px-2 py-1.5 text-[11px] [font-family:var(--font-mono)] font-semibold tabular-nums">{time}</div>
                  {activeSportCourts.map((court, courtIndex) => {
                    const booking = bookingMap[`${timeIndex}-${courtIndex}`];

                    return (
                      <div key={`${court}-${time}`} className="min-h-[54px] bg-surface px-2 py-1.5">
                        {booking ? (
                          <button
                            type="button"
                            className={`w-full cursor-pointer rounded px-2 py-1.5 text-left text-[11px] font-semibold transition hover:-translate-y-px hover:shadow-[var(--shadow-sm)] ${booking.pending ? "bg-accent text-foreground" : "bg-accent-secondary text-canvas"}`}
                            onClick={() => setActiveCell({ booking, courtLabel: court, time })}
                          >
                            <span className="mr-1 text-[10px] [font-family:var(--font-mono)] font-medium opacity-60 tabular-nums">
                              {time} {booking.pending ? "PENDING" : "CONFIRMED"}
                            </span>
                            {booking.name} — {court}
                          </button>
                        ) : (
                          <span className="text-[11px] font-normal opacity-30">Open</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {activeCell ? (
        <BookingDetailDialog
          booking={activeCell.booking}
          sportLabel={activeSportDefinition.label}
          courtLabel={activeCell.courtLabel}
          date={`${formatPrimeDate(currentDate)} · ${dayLabel}`}
          time={activeCell.time}
          onClose={() => setActiveCell(null)}
        />
      ) : null}
    </>
  );
}
