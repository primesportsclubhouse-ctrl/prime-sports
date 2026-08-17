'use client';

import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import Link from "next/link";

import { BookingStepStatus, primeContainerClasses, primeToolbarTextButtonClass } from "@/lib/prime-sports";

const stepLabels = ["Details", "Date", "Court & Time", "Confirm"];
// "Date" and "Court & Time" are two sections of the same page
// (booking-client.tsx) rather than separate routes — both point there.
const stepHrefs = ["/reserve", "/reserve/schedule", "/reserve/schedule", "/checkout"];

type BookingStepsProps = {
  statuses: BookingStepStatus[];
  backHref?: string;
  backLabel?: string;
};

export default function BookingSteps({ statuses, backHref, backLabel = "Back" }: BookingStepsProps) {
  return (
    <section className={primeContainerClasses.default}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-6" data-od-id="booking-steps">
        <div className="flex flex-wrap items-center gap-2">
          {stepLabels.map((label, index) => {
            const step = index + 1;
            const status = statuses[index] ?? "upcoming";
            const isFilled = status !== "upcoming";
            // Only a completed step is safe to jump back to — its data is
            // already collected/validated. "current" is already the page
            // you're on, and "upcoming" steps depend on data this step
            // hasn't produced yet, so neither is clickable.
            const isClickable = status === "done";

            const circleAndLabel = (
              <>
                <span
                  className={`relative inline-flex size-[26px] items-center justify-center overflow-hidden rounded-full border text-[12px] font-bold transition-colors duration-300 ${isFilled ? "border-accent-secondary bg-accent-secondary text-canvas" : "border-border opacity-55"}`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {status === "done" ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                      >
                        <Check size={13} strokeWidth={3} aria-hidden="true" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="number"
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                      >
                        {step}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                {label}
              </>
            );

            return (
              <div key={label} className="flex items-center gap-2">
                {index > 0 ? <span className="h-px w-6 bg-border max-[768px]:hidden" /> : null}
                {isClickable ? (
                  <Link
                    href={stepHrefs[index]}
                    aria-label={`Go back to ${label}`}
                    className="inline-flex items-center gap-2.5 text-[13px] font-semibold opacity-100 transition-opacity duration-300 hover:opacity-70"
                  >
                    {circleAndLabel}
                  </Link>
                ) : (
                  <span
                    className={`inline-flex items-center gap-2.5 text-[13px] font-semibold transition-opacity duration-300 ${isFilled ? "opacity-100" : "opacity-70"}`}
                  >
                    {circleAndLabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {backHref ? (
          <Link href={backHref} className={primeToolbarTextButtonClass}>
            ← {backLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
