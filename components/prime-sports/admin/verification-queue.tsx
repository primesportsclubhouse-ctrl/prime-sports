'use client';

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import VerificationHistory from "@/components/prime-sports/admin/verification-history";
import { channelToDisplayKey, type PaymentSubmissionQueueItem } from "@/lib/payments";
import {
  formatCurrency,
  primeButtonNavyClass,
  primeButtonOutlineClass,
  primeContainerClasses,
  primeMetaLabelClass,
  primeSectionTitleClass,
  primeSurfaceCardClass,
  primeSurfacePanelClass,
} from "@/lib/prime-sports";
import { useRealtimeRefresh } from "@/lib/supabase/realtime";

type QueueTab = "pending" | "history";

function formatSubmittedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatTimeSlot(timeSlot: string) {
  return timeSlot.slice(0, 5);
}

export default function VerificationQueue() {
  const [activeTab, setActiveTab] = useState<QueueTab>("pending");
  const [queue, setQueue] = useState<PaymentSubmissionQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [receiptExpanded, setReceiptExpanded] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  // Mirrors the fetch-on-mount shape checkout-client.tsx's payment-channels
  // effect and reservation-provider.tsx's rehydration effect already use:
  // an inline async IIFE whose first statement is the `await fetch(...)`
  // itself, not a setState call — react-hooks/set-state-in-effect flags
  // setState calls that run synchronously (before any await) inside an
  // effect, which a `useCallback`-wrapped helper referenced by name tripped
  // even with the same ordering internally.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/payment-submissions?status=pending");
        const data = await response.json();

        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setLoadError(data?.error ?? "Could not load the verification queue.");
          return;
        }

        setLoadError(null);
        setQueue(Array.isArray(data.submissions) ? data.submissions : []);
      } catch {
        if (!cancelled) {
          setLoadError("Network error — could not load the verification queue.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Re-fetches the pending queue in the background — used by the realtime
  // subscription below, never called directly from inside a `useEffect` in
  // this component (see the comment on the mount effect above for why that
  // distinction matters for the set-state-in-effect lint rule). A submission
  // that's no longer in the refreshed pending list (approved/rejected from
  // another staff tab) also clears `activeId` if it was the one open here, so
  // the detail panel doesn't keep showing Approve/Reject actions for a
  // submission that already moved on.
  const refreshQueueInBackground = useCallback(async () => {
    try {
      const response = await fetch("/api/payment-submissions?status=pending");
      const data = await response.json();

      if (!response.ok) {
        setLoadError(data?.error ?? "Could not load the verification queue.");
        return;
      }

      const submissions: PaymentSubmissionQueueItem[] = Array.isArray(data.submissions) ? data.submissions : [];
      setLoadError(null);
      setQueue(submissions);
      setActiveId((current) => (current && submissions.some((item) => item.id === current) ? current : null));
    } catch {
      setLoadError("Network error — could not load the verification queue.");
    }
  }, []);

  // Live updates: a new submission arriving, or one being approved/rejected
  // from another staff tab, refreshes the pending queue here without a
  // manual page reload. Falls back to polling internally if the realtime
  // channel never subscribes (or drops) — see lib/supabase/realtime.ts.
  useRealtimeRefresh("admin-payment-submissions", ["payment_submissions"], () => {
    void refreshQueueInBackground();
  });

  const activeSubmission = useMemo(
    () => queue.find((item) => item.id === activeId) ?? null,
    [activeId, queue],
  );

  /** "Match & Approve" — calls POST /api/payment-submissions/[id]/approve,
   *  which marks the submission `approved` and the linked booking
   *  `confirmed`. Distinct from handleReject below: previously both this
   *  button and "Reject / Cancel Booking" called the exact same
   *  removeActiveSubmission() handler against fake local-array data. */
  async function handleApprove() {
    if (!activeSubmission) {
      return;
    }

    setPendingActionId(activeSubmission.id);
    setActionError(null);

    try {
      const response = await fetch(`/api/payment-submissions/${activeSubmission.id}/approve`, { method: "POST" });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setActionError(data?.error ?? "Could not approve this submission.");
        return;
      }

      setQueue((current) => current.filter((item) => item.id !== activeSubmission.id));
      setActiveId(null);
      setReceiptExpanded(false);
    } catch {
      setActionError("Network error — could not approve this submission.");
    } finally {
      setPendingActionId(null);
    }
  }

  /** "Reject / Cancel Booking" — calls POST
   *  /api/payment-submissions/[id]/reject, which marks the submission
   *  `rejected` and cancels (not confirms) the linked booking, freeing its
   *  slot immediately. A genuinely different server call and DB effect
   *  than handleApprove above, not a copy of it. */
  async function handleReject() {
    if (!activeSubmission) {
      return;
    }

    setPendingActionId(activeSubmission.id);
    setActionError(null);

    try {
      const response = await fetch(`/api/payment-submissions/${activeSubmission.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setActionError(data?.error ?? "Could not reject this submission.");
        return;
      }

      setQueue((current) => current.filter((item) => item.id !== activeSubmission.id));
      setActiveId(null);
      setReceiptExpanded(false);
    } catch {
      setActionError("Network error — could not reject this submission.");
    } finally {
      setPendingActionId(null);
    }
  }

  const containerClassName = primeContainerClasses.wide;
  const isActioning = pendingActionId !== null;

  return (
    <section className={`${containerClassName} py-7`} data-od-id="admin-queue">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className={primeSectionTitleClass}>Manual Verification Queue</h2>
        {activeTab === "pending" ? (
          <span className="inline-flex items-center justify-center rounded-full border border-accent-secondary bg-[rgba(212,163,89,0.12)] px-2.5 py-1 text-[12px] font-bold text-accent-secondary">{queue.length} pending</span>
        ) : null}
      </div>

      <div className="mb-5 inline-flex flex-wrap gap-1 rounded-[var(--radius)] border border-border bg-surface-muted p-1" role="tablist" aria-label="Verification view">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "pending"}
          className={`rounded-[calc(var(--radius)-2px)] px-4 py-2 text-xs font-bold uppercase tracking-[0.05em] transition ${
            activeTab === "pending" ? "bg-accent-secondary text-canvas shadow-[var(--shadow-sm)]" : "text-foreground/70 hover:text-foreground"
          }`}
          onClick={() => setActiveTab("pending")}
        >
          Pending Queue
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "history"}
          className={`rounded-[calc(var(--radius)-2px)] px-4 py-2 text-xs font-bold uppercase tracking-[0.05em] transition ${
            activeTab === "history" ? "bg-accent-secondary text-canvas shadow-[var(--shadow-sm)]" : "text-foreground/70 hover:text-foreground"
          }`}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {activeTab === "pending" ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="grid grid-cols-[340px_1fr] items-start gap-5 max-[980px]:grid-cols-1">
              <div className={`${primeSurfaceCardClass} overflow-hidden`}>
                <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-muted px-4 py-3.5">
                  <h3 className="[font-family:var(--font-heading)] text-[15px] font-extrabold uppercase tracking-[0.05em]">Pending Submissions</h3>
                  <span style={{ fontSize: 11, opacity: 0.55 }}>Newest first</span>
                </div>
                <ul className="max-h-[520px] list-none overflow-y-auto p-0" id="queueItems">
                  {isLoading ? (
                    <li style={{ padding: 32, textAlign: "center", fontSize: 13, opacity: 0.5 }}>Loading…</li>
                  ) : loadError ? (
                    <li style={{ padding: 32, textAlign: "center", fontSize: 13 }} className="text-accent">
                      {loadError}
                    </li>
                  ) : queue.length === 0 ? (
                    <li style={{ padding: 32, textAlign: "center", fontSize: 13, opacity: 0.5 }}>
                      Queue clear.
                    </li>
                  ) : (
                    queue.map((item) => (
                      <li
                        key={item.id}
                        className={`border-b border-border border-l-3 ${item.id === activeId ? "border-l-accent-secondary bg-[rgba(212,163,89,0.12)]" : "border-l-transparent hover:bg-surface-muted"}`}
                      >
                        <button
                          type="button"
                          className="w-full px-4 py-3 text-left"
                          onClick={() => {
                            setActionError(null);
                            setActiveId(item.id);
                          }}
                        >
                          <div className="mb-1 flex items-baseline justify-between gap-2">
                            <span className="text-[13px] font-semibold">{item.customerName}</span>
                            <span className="flex items-center gap-1.5 text-[11px] [font-family:var(--font-mono)] font-medium opacity-60 tabular-nums">
                              {item.reference}
                              {item.referenceSource === "ocr" ? (
                                <span
                                  className="rounded-full border border-accent-secondary/50 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-accent-secondary opacity-100"
                                  title="Reference was auto-extracted from the receipt via OCR"
                                >
                                  OCR
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[11px] opacity-60">
                            <span className="rounded border border-border bg-surface-muted px-1.5 py-0.5 font-semibold">{item.courtName}</span>
                            <span className="rounded border border-border bg-surface-muted px-1.5 py-0.5 [font-family:var(--font-mono)] font-semibold tabular-nums">{formatTimeSlot(item.timeSlot)}</span>
                            <span className="rounded border border-border bg-surface-muted px-1.5 py-0.5 font-semibold">{channelToDisplayKey(item.channel)}</span>
                            <span>{formatSubmittedAt(item.submittedAt)}</span>
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
                        <h3 className="[font-family:var(--font-heading)] text-[22px] font-extrabold uppercase tracking-[0.06em]">{activeSubmission.customerName}</h3>
                        <div className="mt-1 flex items-center gap-1.5 text-[12px] [font-family:var(--font-mono)] font-medium opacity-60 tabular-nums">
                          Ref: {activeSubmission.reference}
                          {activeSubmission.referenceSource === "ocr" ? (
                            <span
                              className="rounded-full border border-accent-secondary/50 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-accent-secondary opacity-100"
                              title="Reference was auto-extracted from the receipt via OCR"
                            >
                              OCR
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="inline-flex items-center justify-center rounded-full border border-accent-secondary bg-[rgba(212,163,89,0.12)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-accent-secondary">Pending Verification</span>
                    </div>

                    <div className="grid grid-cols-[1fr_1.2fr] gap-6 max-[980px]:grid-cols-1">
                      <div>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 max-[640px]:grid-cols-1">
                          <div>
                            <dt className={primeMetaLabelClass}>Court</dt>
                            <dd className="m-0 text-[13px] font-semibold">{activeSubmission.courtName}</dd>
                          </div>
                          <div>
                            <dt className={primeMetaLabelClass}>Time Slot</dt>
                            <dd className="m-0 text-[13px] [font-family:var(--font-mono)] font-semibold tabular-nums">{formatTimeSlot(activeSubmission.timeSlot)}</dd>
                          </div>
                          <div>
                            <dt className={primeMetaLabelClass}>Amount</dt>
                            <dd className="m-0 text-[13px] [font-family:var(--font-mono)] font-semibold tabular-nums">{formatCurrency(activeSubmission.amountPhp)}</dd>
                          </div>
                          <div>
                            <dt className={primeMetaLabelClass}>Channel</dt>
                            <dd className="m-0 text-[13px] font-semibold">{channelToDisplayKey(activeSubmission.channel)}</dd>
                          </div>
                          <div>
                            <dt className={primeMetaLabelClass}>Phone</dt>
                            <dd className="m-0 text-[13px] [font-family:var(--font-mono)] font-semibold tabular-nums">{activeSubmission.phone || "—"}</dd>
                          </div>
                          <div>
                            <dt className={primeMetaLabelClass}>Email</dt>
                            <dd className="m-0 text-[13px] [font-family:var(--font-mono)] font-semibold tabular-nums">{activeSubmission.email || "—"}</dd>
                          </div>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <dt className={primeMetaLabelClass}>Customer Notes</dt>
                            <dd style={{ fontWeight: 400, opacity: 0.8 }}>{activeSubmission.notes || "—"}</dd>
                          </div>
                        </dl>
                      </div>

                      <div className="rounded-[var(--radius)] border border-border bg-canvas p-3" data-od-id="receipt-viewer">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h4 className="text-[11px] font-bold uppercase tracking-[0.06em] opacity-65">Uploaded Receipt</h4>
                          {activeSubmission.receiptImageUrl ? (
                            <button type="button" onClick={() => setReceiptExpanded((expanded) => !expanded)}>
                              {receiptExpanded ? "Collapse ↙" : "Expand ↗"}
                            </button>
                          ) : null}
                        </div>
                        {activeSubmission.receiptImageUrl ? (
                          <button
                            type="button"
                            className={`relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-[var(--radius)] border border-border bg-canvas ${receiptExpanded ? "fixed inset-[5vh_5vw] z-100 aspect-auto shadow-[var(--shadow-lg)]" : ""}`}
                            aria-label="Click to expand receipt"
                            onClick={() => setReceiptExpanded((expanded) => !expanded)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL, not an app-local asset next/image can optimize */}
                            <img
                              src={activeSubmission.receiptImageUrl}
                              alt={`Receipt uploaded by ${activeSubmission.customerName}`}
                              className="h-full w-full object-contain"
                            />
                          </button>
                        ) : (
                          <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-[var(--radius)] border border-border bg-[repeating-linear-gradient(45deg,var(--muted)_0_10px,var(--surface)_10px_20px)] text-[11px] uppercase tracking-[0.06em] opacity-50">
                            <span className="font-bold opacity-70">No receipt uploaded</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {actionError ? (
                      <p role="alert" className="mt-4 text-xs font-medium text-accent">
                        {actionError}
                      </p>
                    ) : null}

                    <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-border pt-5">
                      <button type="button" className={primeButtonOutlineClass} disabled={isActioning} onClick={() => void handleReject()}>
                        {isActioning ? "Working…" : "Reject / Cancel Booking"}
                      </button>
                      <button type="button" className={primeButtonNavyClass} disabled={isActioning} onClick={() => void handleApprove()}>
                        {isActioning ? "Working…" : "Match & Approve"}
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
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <VerificationHistory />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
