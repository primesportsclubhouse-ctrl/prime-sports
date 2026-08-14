-- Phase 2 slice 2: payment submissions (with genuinely distinct approve vs.
-- reject actions at the route-handler layer — this migration only lays the
-- schema/RLS groundwork), the payment channel reference data that replaces
-- checkout-client.tsx's hardcoded `paymentChannels` array, waiver versioning,
-- and waiver acceptance persistence.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type payment_channel_key as enum ('gcash', 'maya', 'bank_transfer');
create type payment_submission_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per booking's payment attempt. A single checkout can cover several
-- bookings at once (booking-client.tsx lets a guest pick multiple courts/
-- times before checkout), so — deliberately deviating from a literal global
-- `reference_no unique` — uniqueness here is scoped to (booking_id,
-- reference_no): the same bank/e-wallet reference number legitimately covers
-- several bookings paid in one transfer, but resubmitting the exact same
-- reference for the exact same booking twice is almost certainly a duplicate
-- click, not a new payment.
create table payment_submissions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  reference_no text not null,
  amount_php numeric(10, 2) not null,
  channel payment_channel_key not null,
  receipt_image_url text,
  submitted_at timestamptz not null default now(),
  status payment_submission_status not null default 'pending',
  notes text
);

create unique index payment_submissions_booking_ref_idx
  on payment_submissions (booking_id, reference_no);

create index payment_submissions_status_idx on payment_submissions (status, submitted_at desc);
create index payment_submissions_booking_idx on payment_submissions (booking_id);

-- Replaces the `paymentChannels` array literal in checkout-client.tsx.
create table payment_channels (
  key payment_channel_key primary key,
  label text not null,
  account_name text not null,
  account_number text not null,
  qr_payload text
);

-- One row per published waiver revision — the *current* version is the one
-- with the latest `published_at`. waiver-form-dialog.tsx's displayed clauses
-- stay hardcoded UI copy (no behavior change to that component's rendering
-- in this slice); this table is the durable record of what a customer
-- actually agreed to at the time they accepted.
create table waiver_versions (
  id uuid primary key default gen_random_uuid(),
  version_label text not null,
  body_text text not null,
  published_at timestamptz not null default now()
);

create index waiver_versions_published_at_idx on waiver_versions (published_at desc);

-- Append-only acceptance log — replaces waiver-form-dialog.tsx's `isAccepted`
-- local component state, which never survived a refresh. Insert-only by
-- design (no unique constraint): `bookings.waiver_accepted` is the fast
-- "has this booking's waiver been accepted" flag; this table is the audit
-- trail behind it.
create table waiver_acceptances (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  waiver_version_id uuid not null references waiver_versions (id),
  accepted_at timestamptz not null default now(),
  ip_address text
);

create index waiver_acceptances_booking_idx on waiver_acceptances (booking_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table payment_submissions enable row level security;
alter table payment_channels enable row level security;
alter table waiver_versions enable row level security;
alter table waiver_acceptances enable row level security;

-- payment_submissions / waiver_acceptances: staff-only, same as bookings and
-- customers — guest writes (submitting a payment, accepting a waiver) go
-- through the service-role client from Route Handlers, proven via the same
-- session_token-against-slot_holds ownership check /api/bookings already
-- uses, not via a public/anon RLS policy.
create policy payment_submissions_staff_all on payment_submissions for all using (is_staff());
create policy waiver_acceptances_staff_all on waiver_acceptances for all using (is_staff());

-- payment_channels / waiver_versions: public read (the checkout UI needs
-- both), manager+ write — same shape as courts/rate_cards/operating_hours in
-- the Phase 1 migration.
create policy payment_channels_public_read on payment_channels for select using (true);
create policy payment_channels_manager_write on payment_channels for all
  using (is_manager_or_admin());

create policy waiver_versions_public_read on waiver_versions for select using (true);
create policy waiver_versions_manager_write on waiver_versions for all
  using (is_manager_or_admin());

-- ---------------------------------------------------------------------------
-- Storage: receipt uploads
-- ---------------------------------------------------------------------------

-- Supabase Storage buckets can't be created with `create table` — they're
-- rows in `storage.buckets` (a table Supabase's own migration already
-- created in every project, local or hosted). Kept private (public = false):
-- every read/write goes through server-side Route Handlers using the
-- service-role client (which bypasses Storage RLS the same way it bypasses
-- table RLS), so no anon/authenticated storage.objects policies are needed
-- here — there is deliberately no policy granting the anon or authenticated
-- roles direct bucket access.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
