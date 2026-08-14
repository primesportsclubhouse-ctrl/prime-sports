-- Phase 2 slice 1: seed the reference data /api/availability and
-- /api/bookings actually need to do anything useful. Phase 1 created the
-- `courts` / `rate_cards` / `operating_hours` tables but never populated
-- them, so without this the availability API has nothing to read.
--
-- Court roster mirrors `sports` in lib/prime-sports.ts (7 Pickleball courts,
-- 4 Badminton courts) rather than the older flat `courtNames` constant —
-- the live booking flow (booking-client.tsx) already presents two sports
-- with their own court counts, not four generic courts. Names are seeded as
-- "<Sport> Court <n>" and `lib/booking.ts`'s getCourtName()/parseCourtName()
-- are the single source of truth for that format on the application side —
-- keep the two in sync if either changes.
--
-- Known gap: rate_cards only has a `time_of_day` (daytime/evening) axis, no
-- weekday/weekend axis, so it can't yet represent the weekend premium that
-- lib/prime-sports.ts's `rateWindows` still models (450/550 weekday vs
-- 550/650 weekend). Seeding the weekday rate here as the baseline; actual
-- booking price is stamped from the shared getHourlyRate() helper (which
-- does know about weekday/weekend) rather than from this table, so a
-- customer's charged price always matches what the UI quoted them. Closing
-- that gap for real (e.g. a `day_type` column) is a follow-up, not this
-- slice.

-- All courts are the same structure (open-sided, roofed) — there's no real
-- indoor/outdoor split between Pickleball and Badminton courts here, so
-- `surface_type` is seeded uniformly and `covered` (not surface_type) is the
-- column that actually carries meaning.
insert into courts (name, surface_type, covered, capacity) values
  ('Pickleball Court 1', 'outdoor', true, 10),
  ('Pickleball Court 2', 'outdoor', true, 10),
  ('Pickleball Court 3', 'outdoor', true, 10),
  ('Pickleball Court 4', 'outdoor', true, 10),
  ('Pickleball Court 5', 'outdoor', true, 10),
  ('Pickleball Court 6', 'outdoor', true, 10),
  ('Pickleball Court 7', 'outdoor', true, 10),
  ('Badminton Court 1', 'outdoor', true, 10),
  ('Badminton Court 2', 'outdoor', true, 10),
  ('Badminton Court 3', 'outdoor', true, 10),
  ('Badminton Court 4', 'outdoor', true, 10);

insert into rate_cards (court_id, time_of_day, rate_php)
select id, 'daytime'::rate_time_of_day, 450.00 from courts
union all
select id, 'evening'::rate_time_of_day, 550.00 from courts;

-- day_of_week: 0 = Sunday .. 6 = Saturday (matches JS Date#getDay(), which
-- both the frontend and the availability route use). Operating hours run
-- 6:00 AM through 2:00 AM the next day, every day of the week — a single
-- close_time < open_time row is how that overnight wrap is represented;
-- readers must interpret close_time as "next calendar day" when it's earlier
-- than open_time, same as lib/prime-sports.ts's `operatingHours` constant.
insert into operating_hours (day_of_week, open_time, close_time, slot_duration_min)
select day_of_week, time '06:00', time '02:00', 60
from unnest(array[0, 1, 2, 3, 4, 5, 6]) as day_of_week;
