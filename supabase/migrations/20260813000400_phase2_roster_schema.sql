-- Phase 2 slice 3 (final Phase 2 slice): roster_sessions + roster_entries —
-- replaces roster-client.tsx's local-only `players` useState array and its
-- `getRandomName()` placeholder-name generator with real, persisted
-- court-side check-in state.
--
-- Sessions are keyed 1:1 to a `bookings` row (unique index on booking_id),
-- not to a (date, time_slot) pair. Because a booking is already unique per
-- (court_id, booking_date, time_slot) — see the Phase 1 migration's
-- `bookings_slot_unique_idx` — keying the roster session the same way
-- guarantees two courts running at the exact same date/time (e.g. a
-- Pickleball Court 1 booking and a Badminton Court 2 booking both at
-- 6:00 PM today) always get fully independent roster sessions and entry
-- lists, never sharing or clobbering each other's roster.

create table roster_sessions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  court_id uuid not null references courts (id) on delete restrict,
  active boolean not null default true,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- A booking only ever represents one court-time block, so it only ever needs
-- one roster session across its lifetime — "End Session" then "reactivate"
-- reuses the same row (see /api/roster-sessions's POST handler) rather than
-- inserting a second one.
create unique index roster_sessions_booking_idx on roster_sessions (booking_id);
create index roster_sessions_court_idx on roster_sessions (court_id);
create index roster_sessions_active_idx on roster_sessions (active);

create table roster_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references roster_sessions (id) on delete cascade,
  player_name text not null,
  checked_in boolean not null default true,
  check_in_time timestamptz
);

create index roster_entries_session_idx on roster_entries (session_id);

-- ---------------------------------------------------------------------------
-- Capacity enforcement (roadmap: "enforce the existing CAPACITY = 10 cap
-- server-side too, not just in the UI"). The Route Handler also pre-checks
-- the count before inserting (for a fast, friendly error), but this trigger
-- is the actual correctness guarantee under concurrent add-player requests —
-- the same "don't trust the app layer alone" reasoning bookings' unique slot
-- index and create_booking_draft() already apply to double-booking.
--
-- Capacity is read from `courts.capacity` (defaults to 10, matching the
-- CAPACITY constant roster-client.tsx already enforces client-side) rather
-- than a second hardcoded literal, so the two never drift apart.
-- ---------------------------------------------------------------------------

create function enforce_roster_capacity() returns trigger
  language plpgsql as $$
declare
  v_capacity int;
  v_current_count int;
begin
  select courts.capacity into v_capacity
  from roster_sessions
  join courts on courts.id = roster_sessions.court_id
  where roster_sessions.id = new.session_id;

  if v_capacity is null then
    raise exception 'Roster session % not found.', new.session_id;
  end if;

  select count(*) into v_current_count
  from roster_entries
  where session_id = new.session_id;

  if v_current_count >= v_capacity then
    -- check_violation (23514) so the Route Handler can distinguish "court is
    -- full" from a generic 500 and answer with a 409 instead.
    raise exception 'Roster session % is at capacity (% players).', new.session_id, v_capacity
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger roster_entries_capacity_guard
  before insert on roster_entries
  for each row execute function enforce_roster_capacity();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table roster_sessions enable row level security;
alter table roster_entries enable row level security;

-- Staff can read/manage every session and entry, same shape as bookings/
-- payment_submissions/waiver_acceptances in earlier migrations.
--
-- The organizer (whoever holds the session_token for the booking's slot_hold
-- — see the Phase 2 slot_holds migration) can also manage their own session's
-- roster, but — matching the established pattern for every other
-- guest-checkout write in this app (bookings, payment_submissions,
-- waiver_acceptances) — that ownership proof isn't expressible as a
-- Postgres RLS policy at all, since guests have no `auth.uid()` to check
-- against. It's enforced at the Route Handler layer instead: guest requests
-- go through the service-role client (which bypasses RLS entirely) after
-- lib/supabase/roster-auth.ts's authorizeRosterSession() verifies the
-- session_token against the booking's slot_holds row, the exact same check
-- verifySlotHoldOwnership() already does for /api/bookings/[id] and
-- /api/payment-submissions. No RLS policy is added for the organizer case
-- for that reason — only the staff policy below is a real Postgres policy.
create policy roster_sessions_staff_all on roster_sessions for all using (is_staff());
create policy roster_entries_staff_all on roster_entries for all using (is_staff());
