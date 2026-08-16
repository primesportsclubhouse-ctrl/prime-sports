-- Phase 3 slice: facility content management — `facility_media`,
-- `faq_items`, `facility_settings`. Replaces:
--   * the hardcoded `facilityCards` array in
--     components/prime-sports/home/facility-showcase.tsx,
--   * the hardcoded `faqItems` array in app/(public)/page.tsx,
--   * the literal `Highway, Minglanilla, Cebu · [Contact]` strings in
--     site-footer.tsx, and
--   * the hardcoded `details` array (address/hours) in
--     components/prime-sports/home/location-panel.tsx
-- with staff-editable rows, so a copy/pricing/photo change no longer
-- requires a code deploy.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type facility_media_type as enum ('image', 'video');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- `slug` matches facility-showcase.tsx's existing `CardItem.id` values 1:1
-- (including the "pickeball-courts" typo already live in that file) so each
-- card's photo slot maps onto exactly one row. `src` is nullable — a card
-- with no uploaded photo yet still renders (falls back to the club crest,
-- same behavior components/ui/expanding-cards.tsx already implements for a
-- missing/failed `media`). `meta` isn't in the original target-schema table
-- listing for this table, but two of the six live cards ("7 courts" /
-- "4 courts") render one, and preserving the UI exactly requires keeping
-- it — added here as a deliberate, documented deviation from that listing.
create table facility_media (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  description text not null,
  media_type facility_media_type not null default 'image',
  src text,
  alt text,
  meta text,
  sort_order int not null default 0
);

create unique index facility_media_slug_idx on facility_media (slug);
create index facility_media_sort_idx on facility_media (sort_order);

create table faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  -- Matches the short category-like strings the old `faqItems[].meta` field
  -- already used ("Booking", "Payment", "Refunds", "Access", "Courts").
  category text,
  sort_order int not null default 0
);

create index faq_items_sort_idx on faq_items (sort_order);

-- Singleton settings row. `id` is a boolean primary key pinned to `true` by
-- the check constraint below, so the primary key + check constraint together
-- guarantee at most one row can ever exist — no trigger needed. Address is
-- split into the same two display fields location-panel.tsx already renders
-- (a primary "value" line and a secondary "note" line) rather than a single
-- freeform string, and hours gets the same value/note split for the same
-- reason — both preserve the existing two-line UI exactly. parking/landmark/
-- contact fields don't correspond to any real value in the code today (the
-- footer's `[Contact]` spot is a literal, un-filled placeholder) and are
-- seeded null/empty rather than fabricated — see the seed migration.
create table facility_settings (
  id boolean primary key default true,
  address_line text not null default '',
  address_area text not null default '',
  hours_value text not null default '',
  hours_note text not null default '',
  parking_slots int,
  parking_note text,
  landmark_note text,
  contact_phone text,
  contact_email text,
  constraint facility_settings_singleton check (id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table facility_media enable row level security;
alter table faq_items enable row level security;
alter table facility_settings enable row level security;

-- All three: public read (this content renders on the public homepage for
-- every visitor, logged in or not — same shape as courts/rate_cards/
-- operating_hours/payment_channels/waiver_versions in earlier migrations),
-- staff write. None of these columns are sensitive (no secrets, no PII), so
-- a single unscoped `for select using (true)` is enough — unlike bookings/
-- slot_holds, there's no column here that needs to be held back from anon.
create policy facility_media_public_read on facility_media for select using (true);
create policy facility_media_staff_write on facility_media for all using (is_staff());

create policy faq_items_public_read on faq_items for select using (true);
create policy faq_items_staff_write on faq_items for all using (is_staff());

create policy facility_settings_public_read on facility_settings for select using (true);
create policy facility_settings_staff_write on facility_settings for all using (is_staff());
