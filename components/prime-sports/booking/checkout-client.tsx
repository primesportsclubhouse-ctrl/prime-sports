'use client';

import { AnimatePresence, motion } from "motion/react";
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
  getSportCourtLabel,
  operatingHours,
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
};

// Fallback shown only while /api/payment-channels is still loading (or if it
// fails) — same placeholder copy the seeded payment_channels rows carry, so
// there's no visible flash of different content once the real fetch lands.
const FALLBACK_CHANNELS: PaymentChannel[] = [
  { key: "GCash", label: "QR · GCash", account: "[Account name]\n[Account no.]" },
  { key: "Maya", label: "QR · Maya", account: "[Account name]\n[Account no.]" },
  { key: "Bank Transfer", label: "QR · Bank", account: "[Bank name]\n[Account no.]" },
];

export default function CheckoutClient() {
  const { showToast } = useToast();
  const { contact, bookings, sessionToken, refreshBookings } = useReservation();
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannel[]>(FALLBACK_CHANNELS);
  const [activeChannelIndex, setActiveChannelIndex] = useState(0);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [reference, setReference] = useState("");
  const [referenceSource, setReferenceSource] = useState<ReferenceSource>("manual");
  const [isUploading, setIsUploading] = useState(false);
  const [isDetectingReference, setIsDetectingReference] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
            data.channels.map((channel: { displayKey: string; label: string; account: string }) => ({
              key: channel.displayKey,
              label: channel.label,
              account: channel.account,
            })),
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

  const bookingIds = bookings.map((item) => item.id).filter((id): id is string => Boolean(id));
  const allWaiversAccepted = bookings.length > 0 && bookings.every((item) => item.waiverAccepted);

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

      await refreshBookings();
      setIsSubmitted(true);
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

  const containerClassName = `${primeContainerClasses.default} grid grid-cols-[1fr_1.1fr] gap-8 py-10 max-[980px]:grid-cols-1`;
  const panelClassName = primeSurfacePanelClass;
  const canSubmit =
    bookings.length > 0 &&
    Boolean(receiptPath) &&
    Boolean(reference.trim()) &&
    allWaiversAccepted &&
    !isSubmitting &&
    !isSubmitted;
  const stepStatuses: BookingStepStatus[] = ["done", "done", "done", isSubmitted ? "done" : "current"];
  const activeChannel = paymentChannels[activeChannelIndex] ?? paymentChannels[0];
  const total = bookings.reduce((sum, item) => sum + getHourlyRate(item.date, operatingHours[item.timeIndex]), 0);

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

          <div className="mt-5 border-t border-border pt-5">
            {bookings.length === 0 ? (
              <p className="text-sm">
                <span className={primePlaceholderClass}>[No slots reserved yet — head back to schedule a court]</span>
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5" data-od-id="reservation-line-items">
                {bookings.map((item) => {
                  const rate = getHourlyRate(item.date, operatingHours[item.timeIndex]);
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
                {bookings.length ? formatCurrency(total) : <span className={primePlaceholderClass}>[Total]</span>}
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

            {upload ? (
              <div className="mt-4" id="uploadStatus">
                <div className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface p-3 text-foreground">
                  <div className="size-16 shrink-0 rounded-[var(--radius)] border border-border bg-[repeating-linear-gradient(45deg,var(--muted)_0_8px,var(--surface)_8px_16px)]" aria-hidden="true" />
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold">{upload.name}</div>
                    <div className="text-[11px] opacity-60">{upload.meta}</div>
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
                disabled={bookings.length === 0 || isSubmitted}
                onAccept={handleWaiverAccept}
              />
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
          </div>
        </div>
      </section>
    </div>
  );
}
