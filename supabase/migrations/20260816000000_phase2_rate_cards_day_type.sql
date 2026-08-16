-- Rate-card pricing editor slice: adds the weekday/weekend axis rate_cards
-- was missing so it can finally represent the 4 distinct price points
-- lib/prime-sports.ts's hardcoded `rateWindows` encodes (weekday-daytime,
-- weekday-evening, weekend-daytime, weekend-evening). Before this migration
-- rate_cards only carried a `time_of_day` (daytime/evening) axis — no
-- weekday/weekend split — so /api/availability's `findRate()` was quietly
-- returning the same rate for a Tuesday and a Saturday.
--
-- Design decisions (see the rate-card pricing editor task write-up for the
-- full reasoning):
--
--   * Per-court granularity is KEPT — `court_id` stays NOT NULL, matching
--     the FK Phase 1 already committed to — even though PRODUCT.md's Rates
--     section and today's actual numbers are uniform across every court and
--     every sport ("Same operating hours and rate schedule across both
--     sports"). This is the "future-proof, matches the FK" option: the admin
--     rate editor (this slice) writes the *same* 4 values to every court's
--     rows in a single save, matching today's real uniform-pricing product
--     behavior, while leaving per-court divergence possible later without
--     another migration.
--   * `effective_from` stays on the table, but this slice does NOT build
--     real effective-dated pricing history. A new unique index enforces
--     exactly one row per (court_id, day_type, time_of_day); the admin
--     editor upserts onto that row in place rather than inserting a new
--     dated row alongside old ones. Real "schedule a future price change"
--     is left as a documented future enhancement — the column is preserved
--     so that enhancement doesn't need another schema change, just relaxing
--     this unique index and changing the editor/read path to pick the
--     latest `effective_from` row per group instead of the sole one.

create type rate_day_type as enum ('weekday', 'weekend');

-- Existing rows (seeded by 20260813000100_phase2_seed_reference_data.sql:
-- 450 daytime / 550 evening per court) already match
-- lib/prime-sports.ts's `rateWindows.weekday` values exactly, so backfilling
-- them as 'weekday' via this DEFAULT is correct as-is — no separate UPDATE
-- is needed for the rows that already exist.
alter table rate_cards
  add column day_type rate_day_type not null default 'weekday';

-- Add the missing 'weekend' tier now, matching `rateWindows.weekend` (550
-- daytime / 650 evening) so nothing regresses on `db reset`/`db push`.
insert into rate_cards (court_id, time_of_day, day_type, rate_php)
select id, 'daytime'::rate_time_of_day, 'weekend'::rate_day_type, 550.00 from courts
union all
select id, 'evening'::rate_time_of_day, 'weekend'::rate_day_type, 650.00 from courts;

drop index rate_cards_lookup_idx;
create index rate_cards_lookup_idx on rate_cards (court_id, day_type, time_of_day, effective_from);

-- Enforces "exactly one current row per (court, day_type, time_of_day)" —
-- see the effective_from decision above. The admin rate editor's PATCH
-- upserts onto this key instead of inserting a parallel dated row.
create unique index rate_cards_current_unique_idx
  on rate_cards (court_id, day_type, time_of_day);
