-- Phase 3 slice: admin_audit_log — records real staff actions (approve /
-- reject payment submissions, roster session activate/end, staff-initiated
-- booking status changes) in place of nothing at all (there was previously
-- no durable record of who approved/rejected a payment or ended a roster
-- session).
--
-- Deliberately a plain append-only log table, not a generic "audit everything
-- automatically" trigger scheme — every insert is a one-line, deliberate
-- `recordAuditLog(...)` call from the Route Handler that just performed the
-- mutation (see lib/supabase/audit-log.ts), so `payload_json` can carry
-- exactly the "what changed" shape that action needed, e.g.
-- `{ "fromStatus": "pending", "toStatus": "confirmed" }`.

create table admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff_profiles (id) on delete set null,
  action text not null,
  target_table text not null,
  target_id uuid not null,
  payload_json jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_at_idx on admin_audit_log (created_at desc);
create index admin_audit_log_target_idx on admin_audit_log (target_table, target_id);
create index admin_audit_log_staff_idx on admin_audit_log (staff_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table admin_audit_log enable row level security;

-- Staff-only, both read and write — same shape as every other staff-only
-- table in this codebase (customers, bookings, payment_submissions,
-- waiver_acceptances, roster_sessions, roster_entries). In practice every
-- insert goes through the service-role client from
-- lib/supabase/audit-log.ts (bypassing RLS the same way every other
-- service-role write in this app does), but the policy is still the correct
-- "who's allowed to see this via a normal authenticated session" boundary —
-- audit trail entries should never be visible to guests.
create policy admin_audit_log_staff_all on admin_audit_log for all using (is_staff());
