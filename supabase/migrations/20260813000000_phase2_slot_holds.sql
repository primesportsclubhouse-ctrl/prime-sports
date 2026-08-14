-- Phase 2 slice 1: temporary slot holds for the multi-step booking flow, plus
-- the atomic "create a draft booking" helper that the /api/bookings POST
-- handler calls into.
--
-- Why the hold's uniqueness isn't a `where expires_at > now()` partial index:
-- Postgres requires index predicates to be IMMUTABLE, and `now()` is only
-- STABLE, so `create unique index ... where expires_at > now()` fails with
-- "functions in index predicate must be marked IMMUTABLE". Instead this uses
-- an unconditional unique index on (court_id, booking_date, time_slot) and
-- relies on callers to opportunistically delete expired hold rows before
-- inserting a new one for the same slot (see create_booking_draft() below).
-- A scheduled sweep of stale rows (cron/trigger) is still real work, tracked
-- for Phase 3 per the roadmap — this migration only guarantees correctness,
-- not tidiness, in the meantime.

create table slot_holds (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references courts (id) on delete cascade,
  booking_date date not null,
  time_slot time not null,
  session_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create unique index slot_holds_slot_unique_idx
  on slot_holds (court_id, booking_date, time_slot);

create index slot_holds_session_idx on slot_holds (session_token);

-- Supports both the lazy "delete expired rows for this slot" cleanup done on
-- write, and a future Phase 3 cron/trigger sweep of all expired rows.
create index slot_holds_expires_at_idx on slot_holds (expires_at);

alter table slot_holds enable row level security;

-- Guest checkout never talks to Postgres directly — it goes through the
-- service-role-backed /api/availability and /api/bookings route handlers,
-- which bypass RLS entirely. This policy only covers staff dashboards that
-- might read/manage holds directly via the anon/staff-session client.
create policy slot_holds_staff_all on slot_holds for all using (is_staff());

-- ---------------------------------------------------------------------------
-- create_booking_draft(): the concurrency-safe entry point for turning a
-- (court, date, time) pick into a held slot + a draft booking row in one
-- transaction. Doing this as a single plpgsql call (rather than sequential
-- REST round-trips from the route handler) means that if the final `bookings`
-- insert loses the race — the composite unique index on `bookings` rejects
-- it — the `slot_holds` insert made earlier in the same call is rolled back
-- too, instead of leaking an orphaned hold. Callers still don't need to
-- reimplement the double-booking check themselves; they just handle the
-- unique_violation this raises.
-- ---------------------------------------------------------------------------

create function create_booking_draft(
  p_court_id uuid,
  p_booking_date date,
  p_time_slot time,
  p_session_token text,
  p_customer_id uuid,
  p_price_php numeric,
  p_hold_ttl_minutes int default 15
) returns bookings
  language plpgsql as $$
declare
  v_booking bookings;
begin
  -- Opportunistic reap: an expired hold for this exact slot shouldn't block
  -- a new attempt from claiming it. See the comment above the unique index
  -- for why this can't just be a partial-index predicate instead.
  delete from slot_holds
  where court_id = p_court_id
    and booking_date = p_booking_date
    and time_slot = p_time_slot
    and expires_at <= now();

  insert into slot_holds (court_id, booking_date, time_slot, session_token, expires_at)
  values (
    p_court_id,
    p_booking_date,
    p_time_slot,
    p_session_token,
    now() + (p_hold_ttl_minutes || ' minutes')::interval
  );

  insert into bookings (customer_id, court_id, booking_date, time_slot, status, price_php)
  values (p_customer_id, p_court_id, p_booking_date, p_time_slot, 'held', p_price_php)
  returning * into v_booking;

  return v_booking;
end;
$$;
