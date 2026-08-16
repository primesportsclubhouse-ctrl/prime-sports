// Supabase-touching helpers for `rate_cards` — the real source of truth for
// court pricing as of the rate-card pricing editor slice (see
// supabase/migrations/20260816000000_phase2_rate_cards_day_type.sql for the
// schema decisions this leans on). Shared by /api/rate-cards (public GET +
// staff PATCH), /api/availability (per-slot advertised rate), and
// /api/bookings (price-stamping at booking creation) so none of them drift
// from a second copy of this lookup/write logic.
//
// Rates are uniform across every court today (see PRODUCT.md's Rates
// section), but the table keeps its per-court `court_id` FK from Phase 1 —
// `fetchUniformRates()` and `saveUniformRates()` below read/write the *same*
// 4 values to every court's rows in one shot, rather than assuming
// uniformity is baked into the schema itself.

import type { RateDayType, RateTimeOfDay } from "@/lib/booking";
import type { createServiceRoleClient } from "@/lib/supabase/service-role";

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

export type RateTier = { daytime: number; evening: number };

export type UniformRates = {
  weekday: RateTier;
  weekend: RateTier;
};

const DAY_TYPES: RateDayType[] = ["weekday", "weekend"];
const TIMES_OF_DAY: RateTimeOfDay[] = ["daytime", "evening"];

/**
 * Reads the current rate for one specific court — used by /api/bookings to
 * stamp `price_php` on a new booking. Per-court-aware (matches the FK
 * design), even though every court happens to hold the same numbers today.
 * With `rate_cards_current_unique_idx` in place there's at most one matching
 * row, but this still takes the highest `effective_from` defensively rather
 * than assuming exactly one row, in case that constraint is ever relaxed for
 * real effective-dated pricing (see the migration's own comments).
 */
export async function fetchCourtRate(
  supabase: ServiceRoleClient,
  courtId: string,
  dayType: RateDayType,
  timeOfDay: RateTimeOfDay,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("rate_cards")
    .select("rate_php, effective_from")
    .eq("court_id", courtId)
    .eq("day_type", dayType)
    .eq("time_of_day", timeOfDay)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? Number(data.rate_php) : null;
}

/**
 * Reads the current 4-value rate schedule, representative of every court
 * (they're uniform today — see the module doc comment above). Picks
 * whichever court sorts first by name as the representative row set, the
 * same "first resolved court" convention /api/availability's rate lookup
 * already uses for its own single-representative-court read.
 */
export async function fetchUniformRates(supabase: ServiceRoleClient): Promise<UniformRates> {
  const { data: courts, error: courtsError } = await supabase
    .from("courts")
    .select("id, name")
    .order("name")
    .limit(1);

  if (courtsError) {
    throw new Error(courtsError.message);
  }

  const representativeCourtId = courts?.[0]?.id as string | undefined;

  const fallback: UniformRates = {
    weekday: { daytime: 0, evening: 0 },
    weekend: { daytime: 0, evening: 0 },
  };

  if (!representativeCourtId) {
    return fallback;
  }

  const { data, error } = await supabase
    .from("rate_cards")
    .select("day_type, time_of_day, rate_php, effective_from")
    .eq("court_id", representativeCourtId);

  if (error) {
    throw new Error(error.message);
  }

  const rates = structuredClone(fallback);

  for (const dayType of DAY_TYPES) {
    for (const timeOfDay of TIMES_OF_DAY) {
      const rows = (data ?? []).filter(
        (row) => row.day_type === dayType && row.time_of_day === timeOfDay,
      );
      if (rows.length === 0) {
        continue;
      }

      const best = rows.reduce((latest, row) =>
        row.effective_from > latest.effective_from ? row : latest,
      );
      rates[dayType][timeOfDay] = Number(best.rate_php);
    }
  }

  return rates;
}

/**
 * Writes all 4 rate values to *every* court's rows in one shot — the
 * "uniform pricing" behavior PRODUCT.md describes, implemented as a fan-out
 * write across the per-court schema rather than a schema that assumes
 * uniformity. Upserts onto `rate_cards_current_unique_idx`
 * (court_id, day_type, time_of_day) so this updates the one current row per
 * group in place instead of accumulating parallel dated rows — see the
 * migration's own comments on why this slice keeps pricing history simple.
 */
export async function saveUniformRates(
  supabase: ServiceRoleClient,
  rates: UniformRates,
): Promise<void> {
  const { data: courts, error: courtsError } = await supabase.from("courts").select("id");

  if (courtsError) {
    throw new Error(courtsError.message);
  }

  const rows = (courts ?? []).flatMap((court) =>
    DAY_TYPES.flatMap((dayType) =>
      TIMES_OF_DAY.map((timeOfDay) => ({
        court_id: court.id as string,
        day_type: dayType,
        time_of_day: timeOfDay,
        rate_php: rates[dayType][timeOfDay],
      })),
    ),
  );

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("rate_cards")
    .upsert(rows, { onConflict: "court_id,day_type,time_of_day" });

  if (error) {
    throw new Error(error.message);
  }
}
