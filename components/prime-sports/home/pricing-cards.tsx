"use client";

import { useState } from "react";

import { RateKey, formatCurrency, primeMonoValueClass, rateWindows } from "@/lib/prime-sports";

type PricingCourt = {
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  courtsNote: string;
  accentBorderClass: string;
};

const PRICING_COURTS: PricingCourt[] = [
  {
    key: "pickleball",
    eyebrow: "Covered Courts",
    title: "Pickleball",
    description: "International Standard Silica Sand Courts",
    courtsNote: "Includes 7 courts",
    accentBorderClass: "border-t-accent-secondary",
  },
  {
    key: "badminton",
    eyebrow: "Covered Courts",
    title: "Badminton",
    description: "International Standard Taraflex Courts",
    courtsNote: "Includes 4 courts",
    accentBorderClass: "border-t-accent",
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
        {PRICING_COURTS.map((court) => (
          <div
            key={court.key}
            className={`overflow-hidden rounded-[var(--radius)] border border-border border-t-2 ${court.accentBorderClass} bg-surface text-foreground shadow-[var(--shadow-md)]`}
            data-od-id={`pricing-${court.key}`}
          >
            <div className="border-b border-border px-7 py-7 pb-5 max-[640px]:px-5 max-[640px]:pb-4 max-[640px]:pt-5">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em]">{court.eyebrow}</span>
              <h3 className="mt-2 [font-family:var(--font-heading)] text-[28px] font-extrabold uppercase tracking-[0.06em]">
                {court.title}
              </h3>
              <p className="mt-1.5 text-[14px] opacity-60">{court.description}</p>
            </div>
            <div>
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
            </div>
            <div className="border-t border-border px-7 py-[18px] pb-6 text-xs opacity-55 max-[640px]:px-5">
              {court.courtsNote}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
