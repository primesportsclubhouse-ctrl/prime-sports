'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";

import BookingSteps from "@/components/prime-sports/booking/booking-steps";
import { useReservation } from "@/components/prime-sports/booking/reservation-provider";
import { useToast } from "@/components/prime-sports/toast/toast-provider";
import {
  BookingStepStatus,
  courtNames,
  courtRates,
  createOccupiedSlots,
  formatCurrency,
  formatPrimeDate,
  getWeekStart,
  monthNames,
  primeButtonPrimaryClass,
  primeContainerClasses,
  primeMetaLabelClass,
  primeMonoValueClass,
  primePlaceholderClass,
  primeSectionEyebrowClass,
  primeSectionHeaderRowClass,
  primeSectionTitleClass,
  primeToolbarIconButtonClass,
  timeSlots,
  weekDayNames,
} from "@/lib/prime-sports";

const occupiedSlots = createOccupiedSlots();

export default function BookingClient() {
  const router = useRouter();
  const { showToast } = useToast();
  const { setSchedule } = useReservation();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(today));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    timeIndex: number;
    courtIndex: number;
  } | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });

  const endOfWeek = new Date(weekStart);
  endOfWeek.setDate(weekStart.getDate() + 6);
  const canGoBack = new Date(weekStart).setDate(weekStart.getDate() - 7) >= today.getTime();
  const isReady = Boolean(selectedDay && selectedSlot);
  const containerClassName = primeContainerClasses.default;
  const dateDone = Boolean(selectedDay);
  const slotDone = Boolean(selectedSlot);
  const stepStatuses: BookingStepStatus[] = [
    "done",
    dateDone ? "done" : "current",
    slotDone ? "done" : dateDone ? "current" : "upcoming",
    "upcoming",
  ];

  return (
    <>
      <BookingSteps statuses={stepStatuses} backHref="/reserve" backLabel="Back to Details" />

      <section className={`${containerClassName} py-10`} data-od-id="booking-calendar">
        <div className={primeSectionHeaderRowClass}>
          <div>
            <p className={primeSectionEyebrowClass}>Rolling Week</p>
            <h2 className={primeSectionTitleClass}>Select a date</h2>
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
            const isSelected = selectedDay?.getTime() === date.getTime();

            return (
              <button
                key={date.toISOString()}
                type="button"
                className={`flex min-h-[84px] flex-col justify-center gap-1 rounded-[var(--radius)] border px-2 py-3.5 text-center transition ${isPast ? "cursor-not-allowed border-border bg-surface-muted text-inactive opacity-60" : isSelected ? "border-accent-secondary bg-accent text-canvas shadow-[var(--shadow-sm)]" : "border-border bg-surface hover:-translate-y-px hover:border-accent-secondary"}`}
                disabled={isPast}
                onClick={() => {
                  const nextDate = new Date(date);
                  setSelectedDay(nextDate);
                  showToast({ title: "Date selected", description: formatPrimeDate(nextDate) });
                }}
              >
                <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${isSelected ? "opacity-70" : "opacity-60"}`}>
                  {weekDayNames[index]}
                </span>
                <span className="[font-family:var(--font-mono)] text-[22px] font-semibold leading-none tabular-nums">{date.getDate()}</span>
                <span className={`text-[10px] uppercase tracking-[0.06em] ${isSelected ? "opacity-70" : "opacity-50"}`}>
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
            <p className={primeSectionEyebrowClass}>Hourly Availability</p>
            <h2 className={primeSectionTitleClass}>Select your court &amp; time</h2>
          </div>
          <div className="flex flex-wrap gap-5">
            <span className="inline-flex items-center gap-2 text-xs opacity-80">
              <span className="size-4 rounded border border-border bg-surface" />Open
            </span>
            <span className="inline-flex items-center gap-2 text-xs opacity-80">
              <span className="size-4 rounded border border-accent-secondary bg-accent" />Selected
            </span>
            <span className="inline-flex items-center gap-2 text-xs opacity-80">
              <span className="size-4 rounded border border-border bg-surface-muted" />Occupied
            </span>
          </div>
        </div>
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-surface">
          <div className="min-w-[680px]" id="slotGrid">
            <div className="grid grid-cols-[90px_repeat(4,minmax(0,1fr))] gap-px bg-border">
              <div className="bg-surface-muted px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.06em] text-foreground">Time</div>
              {courtNames.map((court) => (
                <div key={court} className="bg-surface-muted px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.06em] text-foreground">
                  {court}
                </div>
              ))}
            </div>
            {timeSlots.map((time, timeIndex) => (
              <div key={time} className="grid grid-cols-[90px_repeat(4,minmax(0,1fr))] gap-px bg-border">
                <div className="bg-surface-muted px-2 py-2.5 text-center text-xs [font-family:var(--font-mono)] font-semibold text-foreground tabular-nums">{time}</div>
                {courtNames.map((court, courtIndex) => {
                  const occupied = occupiedSlots.has(`${timeIndex}-${courtIndex}`);
                  const selected =
                    selectedSlot?.timeIndex === timeIndex && selectedSlot?.courtIndex === courtIndex;

                  return (
                    <button
                      key={`${court}-${time}`}
                      type="button"
                      className={`min-h-11 px-2 py-2.5 text-center text-xs font-semibold transition ${occupied ? "cursor-not-allowed bg-[repeating-linear-gradient(135deg,var(--surface-muted)_0_10px,#152335_10px_20px)] text-inactive" : selected ? "bg-accent text-canvas" : "bg-surface text-foreground hover:bg-[rgba(212,163,89,0.12)] hover:text-foreground"}`}
                      disabled={occupied}
                      onClick={() => {
                        setSelectedSlot({ timeIndex, courtIndex });
                        showToast({
                          title: "Court & time selected",
                          description: `${court} · ${time}`,
                        });
                      }}
                    >
                      {selected ? "Selected" : occupied ? "—" : "Open"}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${containerClassName} pb-10`} data-od-id="booking-summary">
        <div className="mt-8 grid grid-cols-[1fr_auto] items-center gap-6 rounded-[var(--radius)] border border-border bg-surface p-6 max-[768px]:grid-cols-1">
          <dl className="grid grid-cols-4 gap-4 max-[768px]:grid-cols-2 max-[640px]:grid-cols-1">
            <div>
              <dt className={primeMetaLabelClass}>Date</dt>
              <dd className="m-0 text-[15px] [font-family:var(--font-mono)] font-semibold tabular-nums">
                {selectedDay ? formatPrimeDate(selectedDay) : <span className={primePlaceholderClass}>[Select a date]</span>}
              </dd>
            </div>
            <div>
              <dt className={primeMetaLabelClass}>Court</dt>
              <dd className="m-0 text-[15px] font-semibold">
                {selectedSlot ? courtNames[selectedSlot.courtIndex] : <span className={primePlaceholderClass}>[Select a slot]</span>}
              </dd>
            </div>
            <div>
              <dt className={primeMetaLabelClass}>Time</dt>
              <dd className="m-0 text-[15px] [font-family:var(--font-mono)] font-semibold tabular-nums">
                {selectedSlot ? timeSlots[selectedSlot.timeIndex] : <span className={primePlaceholderClass}>[Select a slot]</span>}
              </dd>
            </div>
            <div>
              <dt className={primeMetaLabelClass}>Rate</dt>
              <dd className="m-0 text-[15px] [font-family:var(--font-mono)] font-semibold tabular-nums">
                {selectedSlot ? (
                  `${formatCurrency(courtRates[selectedSlot.courtIndex])} / hr`
                ) : (
                  <span className={primePlaceholderClass}>[Select a slot]</span>
                )}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            className={primeButtonPrimaryClass}
            aria-disabled={!isReady}
            disabled={!isReady}
            onClick={() => {
              if (!selectedDay || !selectedSlot) {
                return;
              }

              setSchedule({
                date: selectedDay,
                courtIndex: selectedSlot.courtIndex,
                timeIndex: selectedSlot.timeIndex,
              });
              showToast({
                title: "Schedule confirmed",
                description: "Proceeding to payment.",
                variant: "success",
              });
              router.push("/checkout");
            }}
          >
            Proceed to Checkout →
          </button>
        </div>
      </section>
    </>
  );
}