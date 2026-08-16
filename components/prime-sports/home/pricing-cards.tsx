"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import {
  RateKey,
  formatCurrency,
  formatHour12,
  primeMetaLabelClass,
  primeMonoValueClass,
  primeSidelineStripeClass,
} from "@/lib/prime-sports";

type PricingCourt = {
  key: string;
  title: string;
  description: string;
  courtsCount: number;
};

type RateTier = { daytime: number; evening: number };
type UniformRates = { weekday: RateTier; weekend: RateTier };

type DisplayWindow = { label: string; range: string; rate: number };

// Structural window labels (the 6AM-4PM / 4PM-2AM daytime/evening boundary
// PRODUCT.md's Rates section fixes) — not pricing data itself, so this stays
// a local display constant rather than something read from `rate_cards`.
// The *numbers* below (`rate`) are the part that used to be hardcoded and
// now come from GET /api/rate-cards, the real `rate_cards` source of truth
// (see supabase/migrations/20260816000000_phase2_rate_cards_day_type.sql).
const TIME_OF_DAY_META: Record<"daytime" | "evening", { label: string; range: string }> = {
  daytime: { label: "Daytime Rate", range: `${formatHour12(6)} – ${formatHour12(16)}` },
  evening: { label: "Nighttime Rate", range: `${formatHour12(16)} – ${formatHour12(2)}` },
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
  const [rates, setRates] = useState<UniformRates | null>(null);

  // Replaces the old `rateWindows[rateKey]` hardcoded read — this now hits
  // GET /api/rate-cards, which reads the real `rate_cards` table (see
  // lib/supabase/rate-cards.ts's `fetchUniformRates()`), so a rate change
  // saved in /admin/rates shows up here on the next load without a code
  // change or redeploy.
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
        // Silent — the loading state below just persists, which is an honest
        // reflection of "we couldn't reach the rate schedule" rather than
        // ever showing invented numbers.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const windows: DisplayWindow[] | null = rates
    ? [
        { ...TIME_OF_DAY_META.daytime, rate: rates[rateKey].daytime },
        { ...TIME_OF_DAY_META.evening, rate: rates[rateKey].evening },
      ]
    : null;

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
                  {windows === null ? (
                    <div className="px-7 py-4.5 max-[640px]:px-5">
                      <span className={`${primeMonoValueClass} text-xs opacity-55`}>Loading rates…</span>
                    </div>
                  ) : (
                    windows.map((window, index) => (
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
                    ))
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
