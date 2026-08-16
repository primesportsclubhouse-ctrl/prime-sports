-- Availability slice: `slot_blocks` — staff-defined, per-date closures for
-- maintenance, tournaments, or one-off closures, set from the admin
-- "Edit Availability" screen (components/prime-sports/admin/availability-editor.tsx).
--
-- Distinct from `operating_hours` (recurring, day-of-week open/close schedule)
-- and from `bookings`/`slot_holds` (customer-driven occupancy) — this is
-- staff deliberately closing an otherwise-open slot for one specific date. A
-- slot can be blocked and never booked at all; the two concepts are
-- orthogonal, which is why this isn't folded into `bookings` as another
-- status value.

create table slot_blocks (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references courts (id) on delete cascade,
  blocked_date date not null,
  time_slot time not null,
  reason text,
  created_by uuid references staff_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index slot_blocks_slot_unique_idx
  on slot_blocks (court_id, blocked_date, time_slot);

create index slot_blocks_date_idx on slot_blocks (blocked_date);

alter table slot_blocks enable row level security;

-- Staff-only, same shape as every other staff-managed table (customers,
-- bookings, roster_sessions, ...). /api/availability (public, service-role)
-- reads this to compute a `blocked` status for the public grid; nothing
-- anonymous ever talks to this table directly except via the column-limited
-- realtime-support grant below (mirrors the Phase 3 realtime migration's
-- treatment of bookings/slot_holds).
create policy slot_blocks_staff_all on slot_blocks for all using (is_staff());

-- ---------------------------------------------------------------------------
-- create_booking_draft(): extend the Phase 2 slot_holds migration's version
-- with a guard against booking a staff-blocked slot. Kept as the single
-- source of truth for "can this (court, date, time) actually be booked right
-- now" — same reasoning as the double-booking unique index this function
-- already relies on: the guarantee belongs in the database, not scattered
-- across every caller that might create a booking. Raises a custom SQLSTATE
-- ('BLK01', not one of Postgres's reserved/assigned codes) so
-- /api/bookings' POST handler can tell "slot is staff-blocked" apart from
-- "slot lost the double-booking race" (23505) and any other failure.
-- ---------------------------------------------------------------------------

create or replace function create_booking_draft(
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
  if exists (
    select 1 from slot_blocks
    where court_id = p_court_id
      and blocked_date = p_booking_date
      and time_slot = p_time_slot
  ) then
    raise exception 'This slot is blocked by staff and cannot be booked.'
      using errcode = 'BLK01';
  end if;

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

-- ---------------------------------------------------------------------------
-- Realtime + anon read, mirroring the Phase 3 realtime migration's treatment
-- of `bookings`/`slot_holds` — the public booking grid (booking-client.tsx)
-- should see a staff block land live too, not just after a manual refresh.
-- Same column-restricted anon grant pattern; no `reason`/`created_by` exposed.
-- ---------------------------------------------------------------------------

grant select (court_id, blocked_date, time_slot) on slot_blocks to anon;

create policy slot_blocks_public_read_availability on slot_blocks for select to anon using (true);

alter publication supabase_realtime add table slot_blocks;
