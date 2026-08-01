-- Phase 1: core schema, staff auth profiles, and baseline RLS.
-- Staff auth uses Supabase Auth (auth.users) — staff_profiles below only stores
-- the role/profile data that auth.users itself doesn't hold.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type staff_role as enum ('staff', 'manager', 'admin');
create type court_surface as enum ('indoor', 'outdoor');
create type rate_time_of_day as enum ('daytime', 'evening');
create type booking_status as enum ('draft', 'held', 'pending_payment', 'confirmed', 'cancelled', 'no_show');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create unique index customers_email_idx on customers (lower(email));

-- One row per staff member, keyed to their Supabase Auth user.
create table staff_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role staff_role not null default 'staff',
  created_at timestamptz not null default now()
);

create unique index staff_profiles_email_idx on staff_profiles (lower(email));

create table courts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  surface_type court_surface not null,
  covered boolean not null default false,
  capacity int not null default 10
);

create unique index courts_name_idx on courts (name);

create table rate_cards (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references courts (id) on delete cascade,
  time_of_day rate_time_of_day not null,
  rate_php numeric(10, 2) not null,
  effective_from date not null default current_date
);

create index rate_cards_lookup_idx on rate_cards (court_id, time_of_day, effective_from);

create table operating_hours (
  id serial primary key,
  day_of_week int not null check (day_of_week between 0 and 6),
  open_time time not null,
  close_time time not null,
  slot_duration_min int not null default 60
);

create index operating_hours_day_idx on operating_hours (day_of_week);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers (id) on delete set null,
  court_id uuid not null references courts (id) on delete restrict,
  booking_date date not null,
  time_slot time not null,
  status booking_status not null default 'draft',
  price_php numeric(10, 2),
  waiver_accepted boolean not null default false,
  created_at timestamptz not null default now()
);

-- Concurrency-critical: prevents two active bookings from claiming the same
-- court/date/time. Cancelled/no-show rows are excluded so a freed slot can be
-- rebooked.
create unique index bookings_slot_unique_idx
  on bookings (court_id, booking_date, time_slot)
  where status not in ('cancelled', 'no_show');

create index bookings_customer_idx on bookings (customer_id);
create index bookings_date_status_idx on bookings (booking_date, status);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table customers enable row level security;
alter table staff_profiles enable row level security;
alter table courts enable row level security;
alter table rate_cards enable row level security;
alter table operating_hours enable row level security;
alter table bookings enable row level security;

-- Helper: is the current auth.uid() a staff member, and at what role?
create function current_staff_role() returns staff_role
  language sql stable security definer
  set search_path = public as $$
    select role from staff_profiles where id = auth.uid();
$$;

create function is_staff() returns boolean
  language sql stable security definer
  set search_path = public as $$
    select exists (select 1 from staff_profiles where id = auth.uid());
$$;

create function is_manager_or_admin() returns boolean
  language sql stable security definer
  set search_path = public as $$
    select exists (
      select 1 from staff_profiles
      where id = auth.uid() and role in ('manager', 'admin')
    );
$$;

-- courts / rate_cards / operating_hours: public read (needed for the booking
-- UI), manager+ write.
create policy courts_public_read on courts for select using (true);
create policy courts_manager_write on courts for all
  using (is_manager_or_admin());

create policy rate_cards_public_read on rate_cards for select using (true);
create policy rate_cards_manager_write on rate_cards for all
  using (is_manager_or_admin());

create policy operating_hours_public_read on operating_hours for select using (true);
create policy operating_hours_manager_write on operating_hours for all
  using (is_manager_or_admin());

-- staff_profiles: staff can read their own row; admins can read/write all.
create policy staff_profiles_self_read on staff_profiles for select
  using (id = auth.uid() or is_manager_or_admin());
create policy staff_profiles_admin_write on staff_profiles for all
  using (current_staff_role() = 'admin');

-- customers: staff-only access. Guest checkout writes go through a service
-- role / server action, not directly from an anonymous client.
create policy customers_staff_all on customers for all using (is_staff());

-- bookings: staff can read/write everything; customers (if customer auth is
-- added later) will need a separate "own bookings" policy at that point.
create policy bookings_staff_all on bookings for all using (is_staff());
