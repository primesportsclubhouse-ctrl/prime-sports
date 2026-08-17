'use client';

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import BookingSteps from "@/components/prime-sports/booking/booking-steps";
import QrCodeCard from "@/components/prime-sports/booking/qr-code-card";
import { useReservation } from "@/components/prime-sports/booking/reservation-provider";
import WaiverFormDialog from "@/components/prime-sports/booking/waiver-form-dialog";
import { useToast } from "@/components/prime-sports/toast/toast-provider";
import { displayKeyToChannel, type ReferenceSource } from "@/lib/payments";
import {
  BookingStepStatus,
  formatCurrency,
  formatPrimeDate,
  getHourlyRate,
  getRateKey,
  getSportCourtLabel,
  isDaytimeHour,
  operatingHours,
  primeButtonOutlineClass,
  primeButtonPrimaryClass,
  primeContainerClasses,
  primeMetaLabelClass,
  primePlaceholderClass,
  primeSectionHeaderRowClass,
  primeSectionTitleClass,
  primeSurfacePanelClass,
  timeSlots,
} from "@/lib/prime-sports";

type UploadState = {
  name: string;
  meta: string;
};

type PaymentChannel = {
  key: string;
  label: string;
  account: string;
  // Real QR image URL from payment_channels.qr_image_path, if a manager/
  // admin has uploaded one via /admin/content > Payment Channels — null
  // until then, in which case QrCodeCard falls back to its decorative
  // placeholder render (see that component's own doc comment).
  qrImageUrl: string | null;
};

// Fallback shown only while /api/payment-channels is still loading (or if it
// fails) — same placeholder copy the seeded payment_channels rows carry, so
// there's no visible flash of different content once the real fetch lands.
const FALLBACK_CHANNELS: PaymentChannel[] = [
  { key: "GCash", label: "QR · GCash", account: "[Account name]\n[Account no.]", qrImageUrl: null },
  { key: "Maya", label: "QR · Maya", account: "[Account name]\n[Account no.]", qrImageUrl: null },
  { key: "Bank Transfer", label: "QR · Bank", account: "[Bank name]\n[Account no.]", qrImageUrl: null },
];

type RateTier = { daytime: number; evening: number };
type UniformRates = { weekday: RateTier; weekend: RateTier };

export default function CheckoutClient() {
  const { showToast } = useToast();
  const { contact, bookings, sessionToken, refreshBookings } = useReservation();
  // `bookings` is every reservation this browser session has ever touched —
  // not just the ones about to be paid for right now. Once the hold-extension
  // fix (see /api/payment-submissions) keeps an already-submitted booking
  // recoverable for weeks instead of ~15 minutes, a customer who comes back
  // to book an *additional*, unrelated court would otherwise see their old
  // submitted reservation mixed into "Your Reservation" — double-counted in
  // the total, and re-submitted alongside the new one if they hit Submit.
  // Splitting on status keeps the checkout form (upload, reference, waiver,
  // submit) scoped only to what's actually new and unsubmitted, while
  // already-submitted/confirmed bookings are shown read-only, separately.
  const activeBookings = bookings.filter((item) => item.status !== "pending_payment" && item.status !== "confirmed");
  const submittedBookings = bookings.filter((item) => item.status === "pending_payment" || item.status === "confirmed");
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannel[]>(FALLBACK_CHANNELS);
  const [activeChannelIndex, setActiveChannelIndex] = useState(0);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [reference, setReference] = useState("");
  const [referenceSource, setReferenceSource] = useState<ReferenceSource>("manual");
  const [isUploading, setIsUploading] = useState(false);
  const [isDetectingReference, setIsDetectingReference] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Real pricing from the `rate_cards` table — same GET /api/rate-cards
  // pricing-cards.tsx and booking-client.tsx already read. Starts `null` and
  // is populated on mount; getDisplayRate() below falls back to the old
  // hardcoded getHourlyRate() table (the same seed-with-a-fallback
  // convention FALLBACK_CHANNELS above already uses) until this arrives or
  // if the fetch ever fails, so the price reviewed here at checkout can
  // never silently drift from what /api/bookings actually stamped.
  const [rates, setRates] = useState<UniformRates | null>(null);

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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/payment-channels");
        if (!response.ok || cancelled) {
          return;
        }

        const data = await response.json();
        if (!cancelled && Array.isArray(data.channels) && data.channels.length > 0) {
          setPaymentChannels(
            data.channels.map(
              (channel: { displayKey: string; label: string; account: string; qrImageUrl: string | null }) => ({
                key: channel.displayKey,
                label: channel.label,
                account: channel.account,
                qrImageUrl: channel.qrImageUrl ?? null,
              }),
            ),
          );
        }
      } catch {
        // Network error — the placeholder channels above still render, so
        // the checkout flow isn't blocked.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Revokes the previous object URL whenever it's replaced by a new upload,
  // and the final one on unmount — `URL.createObjectURL` blobs otherwise
  // leak for the page's lifetime since nothing else ever releases them.
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!isPreviewExpanded) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPreviewExpanded(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPreviewExpanded]);

  /**
   * Calls the real /api/ocr/receipt (Google Cloud Vision TEXT_DETECTION) —
   * fire-and-forget from handleFile once a receipt has actually landed in
   * Storage. Only auto-fills the reference field when: the customer hasn't
   * already typed something into it (never clobber a manual entry, even
   * with a "confident" OCR result), and the endpoint returns a confident
   * extraction. Every other outcome — not configured (501), configured but
   * unconfident/no match (200, reference: null or confident: false),
   * configured but the Vision call itself failed (502), or a network error
   * reaching our own endpoint — leaves manual entry exactly as it already
   * works today; none of these are surfaced as errors since this is a
   * best-effort convenience, not a required step.
   */
  async function detectReference(path: string, referenceAtUploadTime: string) {
    if (!sessionToken || referenceAtUploadTime.trim()) {
      return;
    }

    setIsDetectingReference(true);

    try {
      const response = await fetch("/api/ocr/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, receiptPath: path }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok && data?.ocrAvailable && data.confident && typeof data.reference === "string") {
        setReference(data.reference);
        setReferenceSource("ocr");
      }
    } catch {
      // Network error reaching our own OCR endpoint — fall back silently.
    } finally {
      setIsDetectingReference(false);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file || !sessionToken) {
      return;
    }

    setUpload({
      name: file.name || "receipt-screenshot.png",
      meta: `${file.size ? `${Math.round(file.size / 1024)}KB` : "unknown size"} · ${file.type || "image/png"}`,
    });
    setReceiptPath(null);
    setUploadError(null);
    setIsUploading(true);
    // Shows immediately from the local file, independent of the upload
    // round-trip — the customer gets visual confirmation of what they
    // picked even before (or if) the server upload finishes. The matching
    // revoke lives in the effect below, keyed off `previewUrl` itself.
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionToken", sessionToken);

      const response = await fetch("/api/uploads/receipt", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        setUploadError(data?.error ?? "Could not upload that receipt.");
        setIsUploading(false);
        return;
      }

      setReceiptPath(data.path);
      setIsUploading(false);
      void detectReference(data.path, reference);
    } catch {
      setUploadError("Network error — could not upload that receipt.");
      setIsUploading(false);
    }
  }

  /** Clears the current upload so the dropzone reappears — the only way
   *  back to it once a receipt is showing, per how this panel is meant to
   *  read: one receipt at a time, swapped explicitly rather than silently
   *  replaced by dropping a new file on top of an existing one. Only clears
   *  the reference field if OCR filled it (that value came from the receipt
   *  being removed); a manually-typed reference is independent info and stays. */
  function handleRemoveReceipt() {
    setUpload(null);
    setReceiptPath(null);
    setPreviewUrl(null);
    setUploadError(null);
    setIsUploading(false);
    setIsDetectingReference(false);

    if (referenceSource === "ocr") {
      setReference("");
      setReferenceSource("manual");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Scoped to activeBookings only — an already-submitted booking has its own
  // waiver/reference on file and must never be swept into a new submission.
  const bookingIds = activeBookings.map((item) => item.id).filter((id): id is string => Boolean(id));
  const allWaiversAccepted = activeBookings.length > 0 && activeBookings.every((item) => item.waiverAccepted);

  async function handleWaiverAccept() {
    if (!sessionToken || bookingIds.length === 0) {
      return { ok: false, error: "No reserved slots to attach a waiver to yet." };
    }

    try {
      for (const bookingId of bookingIds) {
        const response = await fetch(`/api/bookings/${bookingId}/waiver`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          return { ok: false, error: data?.error ?? "Could not save your waiver acceptance." };
        }
      }

      await refreshBookings();
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error — could not save your waiver acceptance." };
    }
  }

  async function handleSubmitForVerification() {
    if (!sessionToken || bookingIds.length === 0) {
      return;
    }

    const channel = displayKeyToChannel(activeChannel.key);
    if (!channel) {
      showToast({ title: "Pick a payment channel", variant: "default" });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/payment-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          bookingIds,
          channel,
          referenceNo: reference.trim(),
          receiptImageUrl: receiptPath,
          referenceSource,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast({
          title: "Could not submit for verification",
          description: data?.error ?? "Please try again.",
          variant: "default",
        });
        setIsSubmitting(false);
        return;
      }

      // No local "submitted" flag to set — refreshBookings() pulls the
      // now-pending_payment status back from the server, and isSubmitted
      // below is derived from that, so it takes effect the same render.
      await refreshBookings();
      setIsSubmitting(false);
      showToast({
        title: "Submitted for verification",
        description: `Reference ${reference.trim()} is pending manual approval.`,
        variant: "success",
      });
    } catch {
      showToast({
        title: "Network error",
        description: "Could not submit for verification. Please try again.",
        variant: "default",
      });
      setIsSubmitting(false);
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

  const containerClassName = `${primeContainerClasses.default} grid grid-cols-[1fr_1.1fr] gap-8 py-10 max-[980px]:grid-cols-1`;
  const panelClassName = primeSurfacePanelClass;
  // Derived from server-side status rather than a local-only flag — a local
  // flag resets to `false` on every fresh page load, so reloading checkout
  // (or coming back later while staff review is in progress) would
  // otherwise show the plain, re-editable form again even though the
  // reference/receipt were already successfully submitted. "Submitted" here
  // specifically means *this* checkout batch: nothing new left to submit,
  // and at least one booking already went through — not that every booking
  // this session has ever made is submitted (see activeBookings above).
  const isSubmitted = activeBookings.length === 0 && submittedBookings.length > 0;
  const isConfirmed = isSubmitted && submittedBookings.every((item) => item.status === "confirmed");
  const canSubmit =
    activeBookings.length > 0 &&
    Boolean(receiptPath) &&
    Boolean(reference.trim()) &&
    allWaiversAccepted &&
    !isSubmitting &&
    !isSubmitted;
  const stepStatuses: BookingStepStatus[] = ["done", "done", "done", isSubmitted ? "done" : "current"];
  const activeChannel = paymentChannels[activeChannelIndex] ?? paymentChannels[0];
  const total = activeBookings.reduce((sum, item) => sum + getDisplayRate(item.date, operatingHours[item.timeIndex]), 0);

  return (
    // Cream band: everything from the step timeline down to (but not including) the
    // footer — the page title above this stays on the default dark background.
    <div className="bg-foreground text-canvas" data-nav-theme="light">
      <BookingSteps statuses={stepStatuses} backHref="/reserve/schedule" backLabel="Back to Schedule" />

      <section className={containerClassName} data-od-id="checkout-payment">
        <div className={panelClassName} data-od-id="reservation-summary">
          <div className={primeSectionHeaderRowClass}>
            <div>
              <h2 className={primeSectionTitleClass}>Your Reservation</h2>
              <p className="mt-1.5 text-sm opacity-65">Review your booking details before completing payment.</p>
            </div>
          </div>

          <div>
            <p className={primeMetaLabelClass}>Booked By</p>
            <p className="m-0 text-[15px] font-semibold">
              {contact ? contact.fullName : <span className={primePlaceholderClass}>[Full name]</span>}
            </p>
            <p className="m-0 mt-1 text-[13px] opacity-70">
              {contact ? (
                `${contact.email} · ${contact.phone}`
              ) : (
                <span className={primePlaceholderClass}>[Email · Phone]</span>
              )}
            </p>
          </div>

          {submittedBookings.length > 0 ? (
            <div className="mt-5 border-t border-border pt-5">
              <p className={primeMetaLabelClass}>Previously Submitted</p>
              <ul className="flex flex-col gap-2.5" data-od-id="submitted-line-items">
                {submittedBookings.map((item) => {
                  const rate = getDisplayRate(item.date, operatingHours[item.timeIndex]);
                  const key = `${item.date.toDateString()}-${item.sport}-${item.courtIndex}-${item.timeIndex}`;
                  const itemConfirmed = item.status === "confirmed";

                  return (
                    <li
                      key={key}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-canvas px-4 py-3 text-foreground opacity-80"
                    >
                      <div className="flex flex-wrap items-center gap-3 text-[13px]">
                        <span className="[font-family:var(--font-mono)] font-semibold tabular-nums">{formatPrimeDate(item.date)}</span>
                        <span className="font-semibold">{getSportCourtLabel(item.sport, item.courtIndex)}</span>
                        <span className="[font-family:var(--font-mono)] font-semibold tabular-nums">{timeSlots[item.timeIndex]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="[font-family:var(--font-mono)] text-sm font-semibold tabular-nums">{formatCurrency(rate)}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] ${
                            itemConfirmed ? "border-success text-success" : "border-accent-secondary text-accent-secondary"
                          }`}
                        >
                          {itemConfirmed ? "Confirmed" : "Pending"}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="mt-5 border-t border-border pt-5">
            {submittedBookings.length > 0 ? <p className={primeMetaLabelClass}>New Selections</p> : null}
            {activeBookings.length === 0 ? (
              <p className="text-sm">
                <span className={primePlaceholderClass}>
                  {submittedBookings.length > 0
                    ? "[No new slots added yet]"
                    : "[No slots reserved yet — head back to schedule a court]"}
                </span>
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5" data-od-id="reservation-line-items">
                {activeBookings.map((item) => {
                  const rate = getDisplayRate(item.date, operatingHours[item.timeIndex]);
                  const key = `${item.date.toDateString()}-${item.sport}-${item.courtIndex}-${item.timeIndex}`;

                  return (
                    <li
                      key={key}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-canvas px-4 py-3 text-foreground"
                    >
                      <div className="flex flex-wrap items-center gap-3 text-[13px]">
                        <span className="[font-family:var(--font-mono)] font-semibold tabular-nums">{formatPrimeDate(item.date)}</span>
                        <span className="font-semibold">{getSportCourtLabel(item.sport, item.courtIndex)}</span>
                        <span className="[font-family:var(--font-mono)] font-semibold tabular-nums">{timeSlots[item.timeIndex]}</span>
                      </div>
                      <span className="[font-family:var(--font-mono)] text-sm font-semibold tabular-nums">{formatCurrency(rate)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-6 rounded-[var(--radius)] border border-accent-secondary/40 bg-canvas p-5" data-od-id="reservation-total">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-[0.04em]">Total Amount</span>
              <span className="text-2xl font-bold [font-family:var(--font-mono)] tabular-nums text-accent-secondary">
                {activeBookings.length ? formatCurrency(total) : <span className={primePlaceholderClass}>[Total]</span>}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className={panelClassName} data-od-id="payment-channels">
            <div className={primeSectionHeaderRowClass}>
              <div>
                <h2 className={primeSectionTitleClass}>Payment Channels</h2>
                <p className="mt-1.5 text-sm opacity-65">
                  Select a channel, then scan its QR with your banking or e-wallet app.
                </p>
              </div>
            </div>

            <div role="tablist" aria-label="Payment channel" className="inline-flex flex-wrap gap-1 rounded-[var(--radius)] border border-border bg-surface-muted p-1">
              {paymentChannels.map((channel, index) => (
                <button
                  key={channel.key}
                  type="button"
                  role="tab"
                  aria-selected={activeChannelIndex === index}
                  className={`rounded-[calc(var(--radius)-2px)] px-4 py-2 text-xs font-bold uppercase tracking-[0.05em] transition ${
                    activeChannelIndex === index
                      ? "bg-accent-secondary text-canvas shadow-[var(--shadow-sm)]"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                  onClick={() => setActiveChannelIndex(index)}
                >
                  {channel.key}
                </button>
              ))}
            </div>

            <div className="mt-5 flex justify-center">
              <div className="w-full max-w-[240px]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeChannel.key}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <QrCodeCard
                      channelKey={activeChannel.key}
                      label={activeChannel.label}
                      account={activeChannel.account}
                      seed={activeChannelIndex + 1}
                      qrImageUrl={activeChannel.qrImageUrl}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-6 rounded-[var(--radius)] border border-border bg-canvas p-4 text-foreground shadow-[var(--shadow-sm)]" data-od-id="account-callout">
              <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] opacity-65">Corporate Account Details</h4>
              <div className="flex items-center justify-between gap-3 border-b border-border py-1 text-[13px] last:border-b-0">
                <span className="opacity-65">Account Name</span>
                <span className="font-semibold">[Corporate account name]</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-border py-1 text-[13px] last:border-b-0">
                <span className="opacity-65">Account Number</span>
                <span className="[font-family:var(--font-mono)] font-semibold tabular-nums">[0000 0000 0000]</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-1 text-[13px]">
                <span className="opacity-65">Reference / Memo</span>
                <span className="[font-family:var(--font-mono)] font-semibold tabular-nums">[Your name + court date]</span>
              </div>
            </div>
          </div>

          <div className={panelClassName} data-od-id="receipt-validation">
            <div className={primeSectionHeaderRowClass}>
              <div>
                <h2 className={primeSectionTitleClass}>Receipt Validation</h2>
                <p className="mt-1.5 text-sm opacity-65">Drop your payment screenshot and confirm the extracted reference.</p>
              </div>
            </div>
            {activeBookings.length === 0 && bookings.length > 0 ? (
              <div className="mt-5 rounded-[var(--radius)] border border-dashed border-border bg-surface-muted p-8 text-center text-sm">
                <p className="opacity-70">You don&apos;t have any new reservations to submit right now.</p>
                <Link href="/reserve/schedule" className={`${primeButtonOutlineClass} mt-4 inline-flex`}>
                  + Add Another Court
                </Link>
              </div>
            ) : (
              <>
            {!upload ? (
              <>
                <button
                  type="button"
                  className={`w-full rounded-[var(--radius)] border-2 border-dashed px-6 py-10 text-center text-foreground transition ${isDragging ? "border-accent-secondary bg-[rgba(212,163,89,0.12)]" : "border-border bg-surface-muted hover:border-accent-secondary hover:bg-[rgba(212,163,89,0.08)]"}`}
                  id="dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    void handleFile(event.dataTransfer.files[0]);
                  }}
                >
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border border-border bg-surface text-[22px] text-accent" aria-hidden="true">
                    +
                  </div>
                  <h3 className="mb-1 [font-family:var(--font-heading)] text-lg font-extrabold uppercase tracking-[0.05em]">Drop receipt here</h3>
                  <p className="text-[13px] opacity-65">or click to browse · PNG, JPG up to 10MB</p>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(event) => void handleFile(event.target.files?.[0])}
                />
              </>
            ) : (
              // The dropzone re-mounts fresh once the receipt is removed, so the
              // native file input still needs to exist somewhere in the DOM for
              // handleRemoveReceipt() to clear via the ref — kept here, hidden,
              // rather than duplicated in both branches.
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
            )}

            {upload ? (
              <div className="mt-4" id="uploadStatus">
                <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface text-foreground">
                  {previewUrl ? (
                    <button
                      type="button"
                      className="block w-full bg-canvas transition hover:opacity-90"
                      aria-label="View full receipt preview"
                      onClick={() => setIsPreviewExpanded(true)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- local blob: URL, not an app asset next/image can optimize */}
                      <img
                        src={previewUrl}
                        alt="Uploaded receipt preview"
                        className="mx-auto max-h-[420px] min-h-[160px] w-full object-contain"
                      />
                    </button>
                  ) : (
                    <div className="h-40 w-full bg-[repeating-linear-gradient(45deg,var(--muted)_0_8px,var(--surface)_8px_16px)]" aria-hidden="true" />
                  )}
                  <div className="flex items-center gap-3 border-t border-border p-3">
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold">{upload.name}</div>
                      <div className="text-[11px] opacity-60">{upload.meta}</div>
                    </div>
                    <button
                      type="button"
                      className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-border text-base leading-none text-foreground transition hover:border-accent hover:bg-accent hover:text-canvas disabled:pointer-events-none disabled:opacity-40"
                      aria-label="Remove uploaded receipt"
                      disabled={isSubmitted}
                      onClick={handleRemoveReceipt}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div
                  className={`mt-3 flex items-center gap-3 rounded-[var(--radius)] border px-4 py-3.5 text-[13px] ${receiptPath ? "border-success bg-[rgba(34,197,94,0.12)] text-foreground shadow-[0_0_0_1px_rgba(34,197,94,0.22),0_0_26px_rgba(34,197,94,0.12)]" : uploadError ? "border-accent bg-[rgba(200,55,45,0.1)] text-foreground" : "border-border bg-canvas text-foreground"}`}
                  id="uploadResultStatus"
                >
                  {isUploading ? <span className="size-4 animate-spin rounded-full border-2 border-foreground/20 border-t-success" aria-hidden="true" /> : null}
                  <span className="msg">
                    {receiptPath
                      ? "Receipt uploaded — enter the transaction reference below."
                      : uploadError
                        ? uploadError
                        : "Uploading receipt…"}
                  </span>
                  {receiptPath ? <span className="ml-auto font-bold text-success">✓</span> : null}
                </div>
              </div>
            ) : null}

            <div className="mt-5" data-od-id="reference-field">
              <label htmlFor="refInput" className="mb-2 block text-[12px] font-bold uppercase tracking-[0.06em]">
                Transaction Reference <span className="text-accent">required</span>
              </label>
              <input
                id="refInput"
                type="text"
                className="min-h-12 w-full rounded-[var(--radius)] border-2 border-border bg-surface-muted px-4 text-[15px] [font-family:var(--font-mono)] font-semibold tabular-nums tracking-[0.02em] text-foreground outline-none transition placeholder:text-muted/50 focus:border-accent-secondary focus:shadow-[0_0_0_4px_rgba(212,163,89,0.12)]"
                placeholder="PRS-XXXXXX"
                autoComplete="off"
                value={reference}
                disabled={isSubmitted}
                onChange={(event) => {
                  setReference(event.target.value);
                  setReferenceSource("manual");
                }}
              />
              {isDetectingReference ? (
                <p className="mt-1.5 text-xs opacity-60">Scanning your receipt for a reference number…</p>
              ) : referenceSource === "ocr" ? (
                <p className="mt-1.5 text-xs font-semibold text-success">
                  Auto-detected from your receipt — please confirm it&apos;s correct.
                </p>
              ) : (
                <p className="mt-1.5 text-xs opacity-60">
                  Enter the reference number shown on your payment app or bank receipt. <strong>Double-check before submitting.</strong>
                </p>
              )}
            </div>

            <div className="mt-6 border-t border-border pt-6">
              <WaiverFormDialog
                isAccepted={allWaiversAccepted}
                disabled={activeBookings.length === 0 || isSubmitted}
                onAccept={handleWaiverAccept}
              />
              <p className={`mt-2 text-xs ${allWaiversAccepted ? "font-semibold text-success" : "opacity-60"}`}>
                {allWaiversAccepted
                  ? ""
                  : "Required before you can submit for verification."}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-[40ch] text-xs opacity-60">
                By submitting, you authorize Prime Sports staff to match this reference against the club&apos;s bank statement. Approvals are manual.
              </p>
              <button
                type="button"
                className={primeButtonPrimaryClass}
                aria-disabled={!canSubmit}
                disabled={!canSubmit}
                onClick={() => void handleSubmitForVerification()}
              >
                {isSubmitted ? "Submitted ✓" : isSubmitting ? "Submitting…" : "Submit for Verification →"}
              </button>
            </div>
              </>
            )}

            {isSubmitted ? (
              <div
                role="status"
                className={`mt-4 flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3.5 text-[13px] ${
                  isConfirmed ? "border-success bg-[rgba(34,197,94,0.12)]" : "border-accent-secondary bg-[rgba(212,163,89,0.12)]"
                }`}
              >
                <span
                  className={`mt-0.5 font-bold ${isConfirmed ? "text-success" : "text-accent-secondary"}`}
                  aria-hidden="true"
                >
                  {isConfirmed ? "✓" : "●"}
                </span>
                <div>
                  <p className="font-semibold text-foreground">
                    {isConfirmed ? "Booking confirmed" : "Court held — pending verification"}
                  </p>
                  <p className="mt-0.5 opacity-70">
                    {isConfirmed
                      ? "Your payment has been verified and your court is booked."
                      : "Your reference has been submitted. Your court stays held while our staff verifies your payment — you'll be notified once it's approved."}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {isPreviewExpanded && previewUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Uploaded receipt preview"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setIsPreviewExpanded(false)}
        >
          <div className="relative max-h-[85vh] max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob: URL, not an app asset next/image can optimize */}
            <img
              src={previewUrl}
              alt="Uploaded receipt, full size"
              className="max-h-[85vh] max-w-full rounded-[var(--radius)] border border-border object-contain shadow-[var(--shadow-lg)]"
              onClick={(event) => event.stopPropagation()}
            />
            <button
              type="button"
              aria-label="Close preview"
              className="absolute -right-3 -top-3 flex size-8 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-[var(--shadow-sm)] transition hover:border-accent-secondary"
              onClick={() => setIsPreviewExpanded(false)}
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
