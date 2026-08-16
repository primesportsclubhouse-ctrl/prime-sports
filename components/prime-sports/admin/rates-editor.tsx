'use client';

import { useEffect, useState } from "react";

import { useToast } from "@/components/prime-sports/toast/toast-provider";
import {
  formatHour12,
  primeButtonPrimaryClass,
  primeContainerClasses,
  primeMetaLabelClass,
  primeMonoValueClass,
  primeSectionTitleClass,
  primeSurfaceCardClass,
} from "@/lib/prime-sports";

type RateTier = { daytime: number; evening: number };
type UniformRates = { weekday: RateTier; weekend: RateTier };

type DayTypeKey = keyof UniformRates;
type TimeOfDayKey = keyof RateTier;

const DAY_TYPE_ROWS: { key: DayTypeKey; label: string }[] = [
  { key: "weekday", label: "Weekday" },
  { key: "weekend", label: "Weekend" },
];

// Same 6AM-4PM / 4PM-2AM boundary the homepage pricing cards display —
// structural window labels, not pricing data, so this stays a local display
// constant rather than something read from `rate_cards` (see
// pricing-cards.tsx's own copy of this same reasoning).
const TIME_OF_DAY_COLUMNS: { key: TimeOfDayKey; label: string; range: string }[] = [
  { key: "daytime", label: "Daytime", range: `${formatHour12(6)} – ${formatHour12(16)}` },
  { key: "evening", label: "Nighttime", range: `${formatHour12(16)} – ${formatHour12(2)}` },
];

const EMPTY_RATES: UniformRates = {
  weekday: { daytime: 0, evening: 0 },
  weekend: { daytime: 0, evening: 0 },
};

const inputClassName =
  "min-h-12 w-full max-w-[160px] rounded-[var(--radius)] border-2 border-border bg-surface-muted px-3 text-right text-[15px] font-medium text-foreground outline-none transition [font-family:var(--font-mono)] tabular-nums placeholder:text-muted/50 focus:border-accent-secondary focus:shadow-[0_0_0_4px_rgba(212,163,89,0.12)]";

export default function RatesEditor() {
  const { showToast } = useToast();
  const [rates, setRates] = useState<UniformRates>(EMPTY_RATES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/rate-cards");
        const data = await response.json().catch(() => null);

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          showToast({
            title: "Could not load rate cards",
            description: data?.error ?? "Failed to load the current rate schedule.",
          });
          return;
        }

        if (data?.rates) {
          setRates(data.rates as UniformRates);
        }
      } catch {
        if (!cancelled) {
          showToast({
            title: "Could not load rate cards",
            description: "Network error — failed to load the current rate schedule.",
          });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount, same as availability-editor's own initial load
  }, []);

  function handleChange(dayType: DayTypeKey, timeOfDay: TimeOfDayKey, value: string) {
    const parsed = value === "" ? 0 : Number(value);
    if (Number.isNaN(parsed)) {
      return;
    }

    setRates((prev) => ({
      ...prev,
      [dayType]: { ...prev[dayType], [timeOfDay]: parsed },
    }));
    setIsDirty(true);
  }

  async function handleSave() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/rate-cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rates),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        showToast({
          title: "Could not save rate cards",
          description: data?.error ?? "Failed to save the rate schedule.",
        });
        return;
      }

      if (data?.rates) {
        setRates(data.rates as UniformRates);
      }
      setIsDirty(false);
      showToast({
        title: "Rate cards saved",
        description: "New rates apply to every court immediately — the homepage and booking flow both read this live.",
        variant: "success",
      });
    } catch {
      showToast({
        title: "Could not save rate cards",
        description: "Network error — failed to save the rate schedule.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const containerClassName = primeContainerClasses.wide;

  return (
    <section className={`${containerClassName} py-7`} data-od-id="admin-rates">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className={primeSectionTitleClass}>Rate Cards</h2>
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          Same 4 rates apply to every pickleball and badminton court — edit here to change what customers are charged.
        </div>
      </div>

      <div className={primeSurfaceCardClass}>
        <div className="grid gap-px overflow-hidden rounded-[var(--radius)] bg-border" style={{ gridTemplateColumns: `1fr repeat(${TIME_OF_DAY_COLUMNS.length}, minmax(180px, 1fr))` }}>
          <div className="flex min-h-[52px] items-center bg-surface-muted px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-foreground">
            Schedule
          </div>
          {TIME_OF_DAY_COLUMNS.map((column) => (
            <div key={column.key} className="flex min-h-[52px] flex-col justify-center bg-surface-muted px-4 py-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-foreground">{column.label} Rate</span>
              <span className={`${primeMetaLabelClass} mb-0`}>{column.range}</span>
            </div>
          ))}

          {DAY_TYPE_ROWS.map((row) => (
            <div key={row.key} className="contents">
              <div className="flex min-h-[68px] items-center bg-surface px-4 text-sm font-semibold">{row.label}</div>
              {TIME_OF_DAY_COLUMNS.map((column) => (
                <div key={column.key} className="flex min-h-[68px] items-center gap-2 bg-surface px-4">
                  <span className={`${primeMonoValueClass} text-sm opacity-60`}>₱</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1}
                    disabled={isLoading}
                    value={rates[row.key][column.key]}
                    onChange={(event) => handleChange(row.key, column.key, event.target.value)}
                    className={inputClassName}
                    aria-label={`${row.label} ${column.label} rate`}
                  />
                  <span className={`${primeMonoValueClass} text-xs opacity-55`}>/hr</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <p className="max-w-[60ch] text-xs opacity-60">
          Changes save immediately for every court — the homepage pricing cards and the booking flow&apos;s per-slot
          rate both read the same table this saves to.
        </p>
        <button
          type="button"
          className={primeButtonPrimaryClass}
          aria-disabled={!isDirty || isSaving || isLoading}
          disabled={!isDirty || isSaving || isLoading}
          onClick={() => void handleSave()}
        >
          {isSaving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </section>
  );
}
