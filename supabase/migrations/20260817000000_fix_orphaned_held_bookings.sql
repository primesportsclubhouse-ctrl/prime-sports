-- Fixes a real, confirmed bug: create_booking_draft() only ever reaped the
-- expired `slot_holds` row for a retried slot, never the `bookings` row
-- inserted alongside it in the very same call. Since bookings_slot_unique_idx
-- blocks any new booking for (court_id, booking_date, time_slot) while a
-- non-cancelled row already exists there, an abandoned hold (customer picked
-- an hour, then never submitted for payment verification, so the hold's TTL
-- lapsed) left its 'held' bookings row sitting there forever — permanently
-- blocking that slot for everyone, and making /api/availability keep
-- reporting it as "booked" long after the customer who picked it walked
-- away. That is exactly what was reported: a slot selected but never
-- submitted kept reading as "Booked" indefinitely, with no way back to
-- "open" short of a manual DB fix.
--
-- Two-part fix, mirroring the existing slot_holds sweep pattern
-- (20260814000200_phase3_slot_hold_sweep.sql) exactly:
--   1. create_booking_draft() now also cancels the stale 'draft'/'held'
--      booking for this exact slot in the same reap step, whenever someone
--      retries it — no waiting for the next sweep tick.
--   2. sweep_expired_held_bookings() catches slots nobody ever retries,
--      scheduled on the same pg_cron cadence as the slot_holds sweep.
--
-- Both only ever touch 'draft'/'held' rows — never 'pending_payment' or
-- 'confirmed'. A real payment submission is manually reviewed by staff and
-- can legitimately outlive the 15-minute hold TTL; only a booking nobody
-- ever advanced past "held" is safe to reap this way.

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
  -- (in 20260813000000_phase2_slot_holds.sql) for why this can't just be a
  -- partial-index predicate instead.
  delete from slot_holds
  where court_id = p_court_id
    and booking_date = p_booking_date
    and time_slot = p_time_slot
    and expires_at <= now();

  -- Companion reap, new in this migration: the booking row inserted
  -- alongside a hold has no FK back to it, so its lifecycle has to be
  -- reasoned about the same way, by (court, date, time) — if no *active*
  -- hold remains for this slot (either it never had one, or the delete
  -- above just reaped it), any 'draft'/'held' booking left over from an
  -- abandoned attempt is safe to cancel: nothing ever advanced it past
  -- "held", and the fresh insert below would otherwise collide with
  -- bookings_slot_unique_idx.
  update bookings
  set status = 'cancelled'
  where court_id = p_court_id
    and booking_date = p_booking_date
    and time_slot = p_time_slot
    and status in ('draft', 'held')
    and not exists (
      select 1 from slot_holds sh
      where sh.court_id = p_court_id
        and sh.booking_date = p_booking_date
        and sh.time_slot = p_time_slot
    );

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
-- sweep_expired_held_bookings(): catches slots nobody ever retries — the
-- per-slot reap above only fires when someone attempts that exact
-- (court, date, time) again. Mirrors sweep_expired_slot_holds()'s
-- independent, all-rows sweep and its pg_cron wiring exactly.
-- ---------------------------------------------------------------------------

create function sweep_expired_held_bookings()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cancelled int;
begin
  update bookings b
  set status = 'cancelled'
  where b.status in ('draft', 'held')
    and not exists (
      select 1 from slot_holds sh
      where sh.court_id = b.court_id
        and sh.booking_date = b.booking_date
        and sh.time_slot = b.time_slot
    );
  get diagnostics v_cancelled = row_count;
  return v_cancelled;
end;
$$;

comment on function sweep_expired_held_bookings() is
  'Cancels any draft/held booking left over from an abandoned hold — one '
  'nobody ever retried, so create_booking_draft()''s own per-slot reap never '
  'ran for it. Scheduled via pg_cron below when available; also safe to '
  'invoke directly any time (idempotent, no side effects beyond the update).';

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'sweep_expired_held_bookings';

    perform cron.schedule(
      'sweep_expired_held_bookings',
      '*/5 * * * *',
      $sql$select public.sweep_expired_held_bookings();$sql$
    );
  else
    raise warning
      'sweep_expired_held_bookings: pg_cron is not installed on this instance — skipping schedule. The sweep function still exists and can be invoked manually or wired to another scheduler.';
  end if;
exception
  when insufficient_privilege then
    raise warning
      'sweep_expired_held_bookings: pg_cron is installed but this role lacks privilege to schedule jobs — skipping schedule. The sweep function still exists and can be invoked manually or wired to another scheduler.';
end;
$$;
