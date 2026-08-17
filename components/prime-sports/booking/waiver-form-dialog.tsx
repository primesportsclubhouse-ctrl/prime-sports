'use client';

import { useEffect, useRef, useState } from "react";

import { useToast } from "@/components/prime-sports/toast/toast-provider";
import {
  primeButtonOutlineClass,
  primeButtonPrimaryClass,
  primeSectionTitleClass,
} from "@/lib/prime-sports";

const SCROLL_THRESHOLD_PX = 4;

type WaiverFormDialogProps = {
  /** Server-persisted acceptance state (from `bookings.waiver_accepted`),
   *  not local-only anymore — see /api/bookings/[id]/waiver. */
  isAccepted: boolean;
  /** Disabled entirely until there's at least one booking to attach the
   *  acceptance to. */
  disabled?: boolean;
  /** Persists the acceptance for every booking in the current checkout via
   *  /api/bookings/[id]/waiver. Rejecting the returned promise (ok: false)
   *  keeps the dialog open with an inline error instead of optimistically
   *  closing. */
  onAccept: () => Promise<{ ok: boolean; error?: string }>;
};

export default function WaiverFormDialog({ isAccepted, disabled = false, onAccept }: WaiverFormDialogProps) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const el = contentRef.current;
    if (el && el.scrollHeight - el.clientHeight <= SCROLL_THRESHOLD_PX) {
      setHasScrolledToEnd(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleDecline();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function openDialog() {
    if (disabled) {
      return;
    }

    setSubmitError(null);
    setHasScrolledToEnd(isAccepted);
    setIsChecked(isAccepted);
    setIsOpen(true);
  }

  function handleScroll() {
    const el = contentRef.current;
    if (!el) {
      return;
    }

    if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD_PX) {
      setHasScrolledToEnd(true);
    }
  }

  function handleDecline() {
    setIsOpen(false);
    setIsChecked(isAccepted);
  }

  async function handleAccept() {
    if (!isChecked || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await onAccept();

    setIsSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error ?? "Could not save your acceptance. Please try again.");
      return;
    }

    // The dialog closing is easy to read as "nothing happened" rather than
    // "this saved" — especially since the only other confirmation is the
    // trigger button relabeling itself in the background, behind the
    // closing dialog. A toast makes the save unmissable regardless.
    showToast({
      title: "Waiver accepted",
      description: "You're all set — you can now submit for verification.",
      variant: "success",
    });
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        className={`${primeButtonOutlineClass} ${isAccepted ? "border-success text-success hover:border-success hover:bg-[rgba(34,197,94,0.12)] hover:text-success" : ""}`}
        onClick={openDialog}
      >
        {isAccepted ? "Waiver Accepted ✓" : "Read & Accept Waiver Form"}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={handleDecline}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="waiver-dialog-title"
            className="flex max-h-[85vh] w-full max-w-[560px] flex-col rounded-[var(--radius)] border border-border bg-surface text-foreground shadow-[var(--shadow-md)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 border-b border-border p-6 pb-4">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-accent">Before You Book</p>
              <h3 id="waiver-dialog-title" className={primeSectionTitleClass}>
                Waiver of Liability
              </h3>
            </div>

            <div
              ref={contentRef}
              onScroll={handleScroll}
              className="flex-1 space-y-3 overflow-y-auto px-6 py-5 text-sm opacity-80"
            >
              <p>
                This Waiver of Liability (&quot;Waiver&quot;) is entered into by the individual reserving a
                court (&quot;Participant&quot;) and Prime Sports (&quot;the Club&quot;) as a condition of using the
                Club&apos;s courts, equipment, and facilities.
              </p>
              <p>
                <strong>1. Assumption of Risk.</strong> Participant acknowledges that racquet and court
                sports involve inherent risks of physical injury, including but not limited to sprains,
                fractures, collisions with other players, and falls on court surfaces. Participant
                voluntarily assumes all such risks arising from participation.
              </p>
              <p>
                <strong>2. Release of Liability.</strong> Participant releases, waives, and discharges the
                Club, its owners, staff, coaches, and affiliates from any and all liability for injury,
                loss, or damage to person or property, whether caused by negligence or otherwise, to the
                fullest extent permitted by law.
              </p>
              <p>
                <strong>3. Medical Treatment.</strong> In the event of injury during a reservation,
                Participant authorizes the Club&apos;s staff to arrange emergency medical treatment on
                Participant&apos;s behalf. Participant is responsible for all costs associated with such
                treatment.
              </p>
              <p>
                <strong>4. Facility &amp; Equipment Use.</strong> Participant agrees to use courts and
                equipment only as intended, to follow posted court rules, and to comply with staff
                instructions at all times. The Club is not responsible for personal belongings left
                unattended on the premises.
              </p>
              <p>
                <strong>5. Booking Conduct.</strong> Reservations are non-transferable. Repeated no-shows
                or late cancellations may result in suspension of booking privileges. Court time is
                allocated in fixed hourly slots and cannot be extended if the following slot is reserved
                by another party.
              </p>
              <p>
                <strong>6. Photo &amp; Video Release.</strong> Participant grants the Club permission to
                use photographs or video captured on the premises during normal operating hours for
                promotional purposes, unless a written opt-out request has been submitted in advance.
              </p>
              <p>
                <strong>7. Governing Law.</strong> This Waiver shall be governed by the laws applicable in
                the jurisdiction where the Club operates. If any provision of this Waiver is found
                unenforceable, the remaining provisions shall remain in full effect.
              </p>
              <p>
                By checking the box below, Participant confirms they have read, understood, and agreed to
                the terms of this Waiver in full.
              </p>
            </div>

            <div className="shrink-0 border-t border-border p-6 pt-5">
              <label className={`flex items-start gap-2.5 text-sm ${hasScrolledToEnd ? "opacity-100" : "opacity-50"}`}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={!hasScrolledToEnd}
                  onChange={(event) => setIsChecked(event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-accent"
                />
                <span>
                  I have read and agree to the Waiver of Liability.
                  {!hasScrolledToEnd ? (
                    <span className="mt-0.5 block text-xs opacity-80">Scroll to the end to enable this checkbox.</span>
                  ) : null}
                </span>
              </label>

              {submitError ? (
                <p role="alert" className="mt-3 text-xs font-medium text-accent">
                  {submitError}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <button type="button" className={primeButtonOutlineClass} onClick={handleDecline} disabled={isSubmitting}>
                  Decline
                </button>
                <button
                  type="button"
                  className={primeButtonPrimaryClass}
                  aria-disabled={!isChecked || isSubmitting}
                  disabled={!isChecked || isSubmitting}
                  onClick={() => void handleAccept()}
                >
                  {isSubmitting ? "Saving…" : "Accept"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
