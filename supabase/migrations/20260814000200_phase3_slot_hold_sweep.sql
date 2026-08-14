-- Phase 3 slice: proactive TTL sweep for `slot_holds`.
--
-- Why this is needed on top of what 20260813000000_phase2_slot_holds.sql
-- already does: create_booking_draft() only reaps an expired hold for the
-- *exact* (court_id, booking_date, time_slot) someone is currently trying to
-- claim again. A hold nobody ever retries just sits in the table forever
-- past its expires_at — that skews /api/availability reads (the slot still
-- looks "held" long after the holder abandoned checkout) and lets the table
-- grow without bound. This migration adds a real, independent sweep of *all*
-- expired rows, not just the one someone happens to be re-requesting.
--
-- Concurrency vs. create_booking_draft()'s lazy delete: both statements only
-- ever DELETE rows matching `expires_at <= now()` (this sweep) /
-- `expires_at <= now()` scoped to one slot (create_booking_draft). DELETE in
-- Postgres is idempotent under concurrency — if one of them deletes a row
-- and commits first, the other's DELETE simply matches zero rows for that
-- row (MVCC means the second statement's snapshot either never saw it, or
-- the row lock it was waiting on resolves to "already gone"); neither raises
-- an error. There is no unique-constraint hazard either: nothing here
-- inserts into slot_holds — the only insert happens inside
-- create_booking_draft(), in the same transaction as its own delete, after
-- which it holds the row it just created. A concurrent sweep can't touch
-- that freshly-inserted, non-expired row because the predicate
-- (`expires_at <= now()`) doesn't match it. Reviewed create_booking_draft()
-- in full before writing this migration to confirm this.

create function sweep_expired_slot_holds()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from slot_holds where expires_at <= now();
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function sweep_expired_slot_holds() is
  'Proactive TTL sweep for slot_holds: deletes every expired hold regardless '
  'of slot, independent of create_booking_draft()''s per-slot lazy cleanup. '
  'Scheduled via pg_cron below when available; also safe to invoke directly '
  '(e.g. from an admin tool, a future Edge Function, or ad hoc via the SQL '
  'editor) since it is idempotent and has no side effects beyond the delete.';

-- ---------------------------------------------------------------------------
-- Scheduling: pg_cron, guarded.
--
-- pg_cron is one of Supabase's officially supported extensions on both the
-- local CLI stack and hosted projects, but this migration does not assume
-- it is present or schedulable in every environment it might run against
-- (a hosted project that hasn't toggled it on yet in Dashboard > Database >
-- Extensions, or a restricted managed Postgres). The block below:
--   1. Checks pg_available_extensions instead of assuming pg_cron exists.
--   2. Creates the extension only if available (matches this project's
--      existing style for pgcrypto in 20260801000000 — no schema override).
--   3. Re-schedules the sweep only if pg_cron actually ends up installed,
--      unscheduling any prior job of the same name first so this is safe to
--      run more than once (fresh `db reset` re-applies every migration).
-- Every step is wrapped so a permission or environment quirk on a given
-- target degrades to a WARNING instead of failing the whole migration —
-- the sweep function above still gets created either way and can be wired
-- to a different scheduler (Edge Function cron, external scheduler hitting
-- an admin-only route, etc.) without another migration.
--
-- VERIFICATION STATUS (read before trusting this runs): NOT verified against
-- a live database as part of this change. Docker Desktop's daemon was not
-- reachable in this environment (`docker ps` failed to connect to the
-- Docker API) and this task explicitly avoided starting
-- `pnpm exec supabase start` / `db reset` or touching Docker. This migration
-- has only been verified by careful reading, not by execution. Once the
-- local stack is up, confirm for real with:
--   select extname from pg_extension where extname = 'pg_cron';
--   select jobid, jobname, schedule, active from cron.job;
--   select sweep_expired_slot_holds(); -- manual smoke test, safe any time
-- On a hosted project, if the extension check below no-ops, enable pg_cron
-- once via Dashboard > Database > Extensions (or run
-- `create extension pg_cron;` in the SQL editor) — the next migration run
-- (or a manual re-run of just this DO block) will pick up scheduling
-- automatically.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists "pg_cron";
  else
    raise warning
      'sweep_expired_slot_holds: pg_cron is not available in pg_available_extensions on this instance — skipping schedule. The sweep function still exists and can be invoked manually or wired to another scheduler.';
  end if;
exception
  when insufficient_privilege then
    raise warning
      'sweep_expired_slot_holds: insufficient privilege to create pg_cron extension — skipping schedule. The sweep function still exists and can be invoked manually or wired to another scheduler.';
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Idempotent re-schedule: drop any prior job of the same name, then
    -- schedule fresh, rather than relying on a specific pg_cron version's
    -- upsert-by-name behavior in cron.schedule().
    perform cron.unschedule(jobid) from cron.job where jobname = 'sweep_expired_slot_holds';

    perform cron.schedule(
      'sweep_expired_slot_holds',
      '*/5 * * * *',
      $sql$select public.sweep_expired_slot_holds();$sql$
    );
  end if;
exception
  when insufficient_privilege then
    raise warning
      'sweep_expired_slot_holds: pg_cron is installed but this role lacks privilege to schedule jobs — skipping schedule. The sweep function still exists and can be invoked manually or wired to another scheduler.';
end;
$$;
