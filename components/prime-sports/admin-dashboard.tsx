'use client';

import { useMemo, useState } from "react";

import {
  courtNames,
  createAdminBookings,
  createVerificationQueue,
  formatPrimeDate,
  primeButtonNavyClass,
  primeButtonOutlineClass,
  primeContainerClasses,
  primeMetaLabelClass,
  primeSectionTitleClass,
  primeSurfaceCardClass,
  primeSurfacePanelClass,
  primeToolbarIconButtonClass,
  primeToolbarTextButtonClass,
  QueueSubmission,
  timeSlots,
} from "@/lib/prime-sports";

const bookingMap = createAdminBookings();

export default function AdminDashboard() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [queue, setQueue] = useState<QueueSubmission[]>(() => createVerificationQueue());
  const [activeId, setActiveId] = useState<number | null>(null);
  const [receiptExpanded, setReceiptExpanded] = useState(false);

  const activeSubmission = useMemo(
    () => queue.find((item) => item.id === activeId) ?? null,
    [activeId, queue],
  );

  function removeActiveSubmission() {
    if (activeId === null) {
      return;
    }

    setQueue((current) => current.filter((item) => item.id !== activeId));
    setActiveId(null);
    setReceiptExpanded(false);
  }

  const containerClassName = primeContainerClasses.wide;

  return (
    <>
      <section className={`${containerClassName} py-7`} data-od-id="admin-calendar">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className={primeSectionTitleClass}>Master Booking Calendar</h2>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Daily schedule · all courts side-by-side</div>
        </div>
        <div className={`${primeSurfaceCardClass} overflow-x-auto`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted px-5 py-3.5">
            <div className="font-serif text-base font-bold" id="calDate">
              {formatPrimeDate(currentDate)} · [Day]
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
          <div className="min-w-[760px]" id="calInner">
            <div className="grid grid-cols-[70px_repeat(4,minmax(0,1fr))] gap-px bg-border">
              <div className="flex min-h-[38px] items-center justify-center bg-surface-muted px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-foreground">Time</div>
              {courtNames.map((court) => (
                <div key={court} className="flex min-h-[38px] items-center justify-center bg-surface-muted px-2 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-foreground">
                  {court}
                </div>
              ))}
            </div>
            {timeSlots.map((time, timeIndex) => (
              <div key={time} className="grid grid-cols-[70px_repeat(4,minmax(0,1fr))] gap-px bg-border">
                <div className="min-h-[54px] bg-surface-muted px-2 py-1.5 text-[11px] font-bold tabular-nums">{time}</div>
                {courtNames.map((court, courtIndex) => {
                  const booking = bookingMap[`${timeIndex}-${courtIndex}`];

                  return (
                    <div key={`${court}-${time}`} className="min-h-[54px] bg-surface px-2 py-1.5">
                      {booking ? (
                        <div className={`rounded px-2 py-1.5 text-[11px] font-semibold ${booking.pending ? "bg-accent text-foreground" : "bg-accent-secondary text-canvas"}`}>
                          <span className="mr-1 text-[10px] font-medium opacity-60">
                            {time} {booking.pending ? "PENDING" : "CONFIRMED"}
                          </span>
                          {booking.name} — {court}
                        </div>
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
      </section>

      <section className={`${containerClassName} py-7`} data-od-id="admin-queue">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className={primeSectionTitleClass}>Manual Verification Queue</h2>
          <span className="inline-flex items-center justify-center rounded-full border border-accent-secondary bg-[rgba(212,163,89,0.12)] px-2.5 py-1 text-[12px] font-bold text-accent-secondary">{queue.length} pending</span>
        </div>
        <div className="grid grid-cols-[340px_1fr] items-start gap-5 max-[980px]:grid-cols-1">
          <div className={`${primeSurfaceCardClass} overflow-hidden`}>
            <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-muted px-4 py-3.5">
              <h3 className="font-serif text-[15px] font-bold">Pending Submissions</h3>
              <span style={{ fontSize: 11, opacity: 0.55 }}>Newest first</span>
            </div>
            <ul className="max-h-[520px] list-none overflow-y-auto p-0" id="queueItems">
              {queue.length === 0 ? (
                <li style={{ padding: 32, textAlign: "center", fontSize: 13, opacity: 0.5 }}>
                  Queue clear.
                </li>
              ) : (
                queue.map((item) => (
                  <li
                    key={item.id}
                    className={`border-b border-border border-l-3 ${item.id === activeId ? "border-l-accent-secondary bg-[rgba(212,163,89,0.12)]" : "border-l-transparent hover:bg-surface-muted"}`}
                  >
                    <button type="button" className="w-full px-4 py-3 text-left" onClick={() => setActiveId(item.id)}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="text-[13px] font-semibold">{item.name}</span>
                        <span className="text-[11px] opacity-60 tabular-nums">{item.ref}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] opacity-60">
                        <span className="rounded border border-border bg-surface-muted px-1.5 py-0.5 font-semibold">{item.court}</span>
                        <span className="rounded border border-border bg-surface-muted px-1.5 py-0.5 font-semibold tabular-nums">{item.time}</span>
                        <span className="rounded border border-border bg-surface-muted px-1.5 py-0.5 font-semibold">{item.channel}</span>
                        <span>{item.submitted}</span>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className={`${primeSurfacePanelClass} min-h-[520px]`} id="detail">
            {activeSubmission ? (
              <>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <h3 className="font-serif text-[22px] font-bold tracking-[-0.01em]">{activeSubmission.name}</h3>
                    <div className="mt-1 text-[12px] opacity-60 tabular-nums">Ref: {activeSubmission.ref}</div>
                  </div>
                  <span className="inline-flex items-center justify-center rounded-full border border-accent-secondary bg-[rgba(212,163,89,0.12)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-accent-secondary">Pending Verification</span>
                </div>

                <div className="grid grid-cols-[1fr_1.2fr] gap-6 max-[980px]:grid-cols-1">
                  <div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 max-[640px]:grid-cols-1">
                      <div>
                        <dt className={primeMetaLabelClass}>Court</dt>
                        <dd className="m-0 text-[13px] font-semibold">{activeSubmission.court}</dd>
                      </div>
                      <div>
                        <dt className={primeMetaLabelClass}>Time Slot</dt>
                        <dd className="m-0 text-[13px] font-semibold tabular-nums">{activeSubmission.time}</dd>
                      </div>
                      <div>
                        <dt className={primeMetaLabelClass}>Amount</dt>
                        <dd className="m-0 text-[13px] font-semibold tabular-nums">{activeSubmission.amount}</dd>
                      </div>
                      <div>
                        <dt className={primeMetaLabelClass}>Channel</dt>
                        <dd className="m-0 text-[13px] font-semibold">{activeSubmission.channel}</dd>
                      </div>
                      <div>
                        <dt className={primeMetaLabelClass}>Phone</dt>
                        <dd className="m-0 text-[13px] font-semibold tabular-nums">{activeSubmission.phone}</dd>
                      </div>
                      <div>
                        <dt className={primeMetaLabelClass}>Email</dt>
                        <dd className="m-0 text-[13px] font-semibold tabular-nums">{activeSubmission.email}</dd>
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <dt className={primeMetaLabelClass}>Customer Notes</dt>
                        <dd style={{ fontWeight: 400, opacity: 0.8 }}>{activeSubmission.notes}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-[var(--radius)] border border-border bg-canvas p-3" data-od-id="receipt-viewer">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-[0.06em] opacity-65">Uploaded Receipt</h4>
                      <button type="button" onClick={() => setReceiptExpanded((expanded) => !expanded)}>
                        {receiptExpanded ? "Collapse ↙" : "Expand ↗"}
                      </button>
                    </div>
                    <button
                      type="button"
                      className={`relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-[var(--radius)] border border-border bg-[repeating-linear-gradient(45deg,var(--muted)_0_10px,var(--surface)_10px_20px)] text-[11px] uppercase tracking-[0.06em] opacity-50 ${receiptExpanded ? "fixed inset-[5vh_5vw] z-100 aspect-auto bg-canvas shadow-[var(--shadow-lg)]" : ""}`}
                      aria-label="Click to expand receipt"
                      onClick={() => setReceiptExpanded((expanded) => !expanded)}
                    >
                      <span className="font-bold opacity-70">Receipt</span>
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-border pt-5">
                  <button type="button" className={primeButtonOutlineClass} onClick={removeActiveSubmission}>
                    Reject / Cancel Booking
                  </button>
                  <button type="button" className={primeButtonNavyClass} onClick={removeActiveSubmission}>
                    Match &amp; Approve
                  </button>
                </div>
              </>
            ) : (
              <div className="px-5 py-20 text-center text-[13px] opacity-50">
                Select a pending submission on the left to review the customer&apos;s details and receipt.
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}