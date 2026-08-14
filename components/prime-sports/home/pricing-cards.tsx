"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import {
  RateKey,
  formatCurrency,
  primeMetaLabelClass,
  primeMonoValueClass,
  primeSidelineStripeClass,
  rateWindows,
} from "@/lib/prime-sports";

type PricingCourt = {
  key: string;
  title: string;
  description: string;
  courtsCount: number;
};

// "Covered" lives in the description now, not a standalone eyebrow above the
// heading — the court count moved into the signage plate in the header row.
const PRICING_COURTS: PricingCourt[] = [
  {
    key: "pickleball",
    title: "Pickleball",
    description: "Covered · International Standard Silica Sand Courts",
    courtsCount: 7,
  },
  {
    key: "badminton",
    title: "Badminton",
    description: "Covered · International Standard Taraflex Courts",
    courtsCount: 4,
  },
];

const TOGGLE_OPTIONS: { key: RateKey; label: string }[] = [
  { key: "weekday", label: "Weekday" },
  { key: "weekend", label: "Weekend" },
];

export default function PricingCards() {
  const [rateKey, setRateKey] = useState<RateKey>("weekday");
  const windows = rateWindows[rateKey];

  return (
    <div>
      <div className="mb-8 flex justify-center">
        <div
          role="tablist"
          aria-label="Rate schedule"
          className="inline-flex rounded-full border border-border bg-surface-muted p-1"
        >
          {TOGGLE_OPTIONS.map((option) => {
            const isActive = option.key === rateKey;

            return (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setRateKey(option.key)}
                className={`min-h-9 rounded-full px-6 text-xs font-bold uppercase tracking-[0.1em] transition duration-200 ${
                  isActive
                    ? "bg-accent text-foreground shadow-[var(--shadow-sm)]"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 max-[920px]:grid-cols-1">
        {PRICING_COURTS.map((court, cardIndex) => (
          <motion.div
            key={court.key}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45, delay: cardIndex * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-[var(--radius)] border border-border bg-surface text-foreground shadow-[var(--shadow-md)]"
            data-od-id={`pricing-${court.key}`}
          >
            {/* Sideline stripe replaces the old flat accent-on-rounded top border —
                gold only, so red keeps its action-only footprint. */}
            <span aria-hidden="true" className={primeSidelineStripeClass} />

            <div className="flex items-start justify-between gap-4 border-b border-border px-7 py-7 pb-5 max-[640px]:px-5 max-[640px]:pb-4 max-[640px]:pt-5">
              <div>
                <h3 className="[font-family:var(--font-heading)] text-[28px] font-extrabold uppercase tracking-[0.06em]">
                  {court.title}
                </h3>
                <p className="mt-1.5 text-[14px] opacity-60">{court.description}</p>
              </div>

              {/* Court-count signage plate — carries the fact the old low-contrast
                  footer note used to bury, right where you're deciding between sports.
                  Label-above-value matches the same convention as location-panel's
                  address/hours pairs; the count itself is mono per the Numerics-On-Mono
                  rule, same as every rate below it. */}
              <div className="shrink-0 rounded-[var(--radius)] border border-border bg-surface-muted px-3 py-2 text-center">
                <div className={primeMetaLabelClass}>Courts</div>
                <div className={`${primeMonoValueClass} text-xl leading-none`}>{court.courtsCount}</div>
              </div>
            </div>

            {/* Rate rows crossfade as one block on toggle instead of hard-cutting —
                these are numbers the visitor is actively comparing between tabs. */}
            <div className="overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={rateKey}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  {windows.map((window, index) => (
                    <div
                      key={window.label}
                      className={`grid grid-cols-[1fr_auto] items-center gap-4 px-7 py-4.5 max-[640px]:px-5 ${
                        index < windows.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold">{window.range}</span>
                        <span className={`${primeMonoValueClass} text-xs opacity-55`}>
                          {window.label}
                        </span>
                      </div>
                      <div className={`${primeMonoValueClass} text-2xl`}>
                        {formatCurrency(window.rate)}
                        <span className={`${primeMonoValueClass} text-[13px] opacity-55`}>/hr</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
