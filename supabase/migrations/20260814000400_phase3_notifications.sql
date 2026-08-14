-- Phase 3 slice: booking + payment-approval confirmation notifications
-- (Resend for email, Semaphore for SMS — see lib/email.ts / lib/sms.ts /
-- lib/supabase/notifications.ts).
--
-- notification_log is the queryable "did the confirmation actually go out"
-- record this slice adds: every attempted send (one row per channel per
-- event) is logged here regardless of outcome. `status` distinguishes
-- sent / failed / skipped — "skipped" meaning genuinely not attempted, most
-- commonly because RESEND_API_KEY / SEMAPHORE_API_KEY aren't set yet, or
-- because the customer has no email/phone on file. This is the same
-- "honest degradation, never fake a sent confirmation" principle the OCR
-- slice established for receipt reference extraction — with no API keys
-- configured, every row in this table will read `skipped`, which is the
-- truth, not a silent no-op that looks indistinguishable from success.
--
-- Insert-only from lib/supabase/notifications.ts's best-effort
-- sendBookingConfirmationNotifications() — the same fire-and-forget-after-
-- the-real-mutation shape recordAuditLog() already established for
-- admin_audit_log (see the Phase 3 audit-log migration): a notification
-- failure must never fail the booking/payment-approval request that
-- triggered it.

create type notification_channel as enum ('email', 'sms');
create type notification_status as enum ('sent', 'failed', 'skipped');

create table notification_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings (id) on delete set null,
  channel notification_channel not null,
  event text not null,
  -- Nullable, not empty-string: a "skipped, no email/phone on file" row
  -- genuinely has no recipient to record, distinct from a recipient string
  -- that happens to be empty.
  recipient text,
  status notification_status not null,
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create index notification_log_booking_idx on notification_log (booking_id);
create index notification_log_created_at_idx on notification_log (created_at desc);
create index notification_log_status_idx on notification_log (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table notification_log enable row level security;

-- Staff-only, same shape as admin_audit_log: every write goes through the
-- service-role client (lib/supabase/notifications.ts), bypassing RLS, but
-- this is still the correct "who can see this via a normal authenticated
-- session" boundary — a customer's own confirmation-send history should
-- never be readable by anyone but staff.
create policy notification_log_staff_all on notification_log for all using (is_staff());
