# Database Schema

All schema lives in `supabase/migrations/`, applied in filename order. This is the authoritative source — if this document and the migrations ever disagree, trust the migrations and treat this page as stale for that detail.

## Migration history

| Migration | What it added |
|---|---|
| `20260801000000_phase1_core_schema.sql` | Core tables (`customers` → `bookings`), `staff_role` enum, `is_staff()`/`is_manager_or_admin()`/`current_staff_role()` RLS helpers |
| `20260813000000_phase2_slot_holds.sql` | `slot_holds`, `create_booking_draft()` (atomic hold + booking creation) |
| `20260813000100_phase2_seed_reference_data.sql` | Seeds real `courts`/`rate_cards`/`operating_hours` |
| `20260813000200_phase2_payments_schema.sql` | `payment_submissions`, `payment_channels`, `waiver_versions`, `waiver_acceptances`, the private `receipts` Storage bucket |
| `20260813000300_phase2_payments_seed.sql` | Seeds the 3 payment channels + v1 waiver text |
| `20260813000400_phase2_roster_schema.sql` | `roster_sessions`, `roster_entries`, capacity-enforcement trigger |
| `20260814000000_phase3_realtime.sql` | Adds `bookings`/`slot_holds`/`payment_submissions` to the Realtime publication, narrow anon SELECT grants for live availability |
| `20260814000100_phase3_audit_log.sql` | `admin_audit_log` |
| `20260814000200_phase3_slot_hold_sweep.sql` | `sweep_expired_slot_holds()` on a `pg_cron` schedule (degrades gracefully if `pg_cron` unavailable) |
| `20260814000300_phase3_ocr_fields.sql` | `payment_submissions.reference_source` (`manual`/`ocr`) |
| `20260814000400_phase3_notifications.sql` | `notification_log` |
| `20260814000500_fix_missing_baseline_grants.sql` | Restores baseline Postgres grants for `anon`/`authenticated`/`service_role` — see [deployment.md](deployment.md) for why this was needed |
| `20260814000600_availability_slot_blocks.sql` | `slot_blocks` (staff-defined per-date closures), extends `create_booking_draft()` to refuse a blocked slot |
| `20260816000000_phase2_rate_cards_day_type.sql` | Adds the missing `day_type` (weekday/weekend) axis to `rate_cards`, making it the real source of truth for pricing (previously a hardcoded table in `lib/prime-sports.ts` was used instead — see [roadmap-and-known-gaps.md](../roadmap-and-known-gaps.md)) |
| `20260816010000_phase3_facility_content_schema.sql` | `facility_media`, `faq_items`, `facility_settings` (singleton) |
| `20260816010100_phase3_facility_content_seed.sql` | Seeds today's real current content as-is — placeholders stay placeholders, real content stays real, nothing fabricated |
| `20260816020000_payment_channels_qr_image.sql` | `payment_channels.qr_image_path`, the public `payment-qr-codes` Storage bucket |

## Tables

### `customers`
Guest checkout identity — no login. `id`, `full_name`, `email` (unique, case-insensitive), `phone`, `created_at`.

### `staff_profiles`
Role data for a Supabase Auth user. `id` (references `auth.users.id`), `email` (unique), `role` (`staff_role` enum: `staff` / `manager` / `admin`, default `staff`), `created_at`. Supabase Auth (`auth.users`) owns the password — this table only holds what Auth doesn't.

### `courts`
`id`, `name` (unique, e.g. "Pickleball Court 3"), `covered`, `capacity` (default 10 — the roster cap reads from here, not a hardcoded literal).

### `rate_cards`
`id`, `court_id` → `courts`, `time_of_day` (`daytime`/`evening`), `day_type` (`weekday`/`weekend`, added in the rate-card editor slice), `rate_php`, `effective_from`. Unique on `(court_id, day_type, time_of_day)` — the admin rate editor (`/admin/rates`) upserts onto this key rather than inserting a parallel dated row, so `effective_from` exists but real effective-dated pricing history isn't built yet (documented as a future enhancement in the migration itself). **This is the actual, live source of truth for pricing** — booking price-stamping, the availability grid, the homepage pricing cards, and the in-flow booking price displays all read from here now; nothing real reads the old hardcoded `rateWindows` table in `lib/prime-sports.ts` anymore. Per-court granularity is kept (matches the FK) even though today's real rates are uniform across every court — the editor writes the same 4 values to every court in one save.

### `operating_hours`
`day_of_week` (0–6), `slot_duration_min` (default 60). Indexed on `day_of_week`.

### `bookings`
The core reservation record. `id`, `customer_id` → `customers`, `court_id` → `courts`, `booking_date`, `time_slot`, `status` (`booking_status` enum: `draft` / `held` / `pending_payment` / `confirmed` / `cancelled` / `no_show`), `price_php`, `waiver_accepted`, `created_at`.

**`bookings_slot_unique_idx`** — a unique index on `(court_id, booking_date, time_slot)` is the real concurrency guard against double-booking. It is enforced by Postgres, not application code — a losing race gets a genuine `409`, not an app-level check that could race itself.

### `slot_blocks`
Staff-defined per-date closures (maintenance, tournaments, one-off), managed from `/admin/availability`. `id`, `court_id` → `courts`, `blocked_date`, `time_slot`, `reason` (nullable), `created_by` → `staff_profiles` (nullable), `created_at`. Unique on `(court_id, blocked_date, time_slot)`. Orthogonal to `bookings`/`slot_holds` — a slot can be blocked and never booked at all. `create_booking_draft()` checks this table first and raises a custom SQLSTATE (`BLK01`) if a block exists, before any hold or booking row is touched — the guarantee is a real DB-level guard, not app-layer-only. `/api/availability` surfaces a 4th status, `blocked`, alongside `open`/`held`/`booked`.

### `slot_holds`
A temporary claim on a slot during checkout. `id`, `court_id`, `booking_date`, `time_slot`, `session_token` (the guest's ownership-proof token, see [auth-and-rbac.md](auth-and-rbac.md)), `expires_at`. Also unique on `(court_id, booking_date, time_slot)`.

Two independent cleanup paths exist: `create_booking_draft()` lazily deletes an expired hold for the *specific slot* someone is about to claim; `sweep_expired_slot_holds()` (on a 5-minute `pg_cron` schedule) proactively deletes *any* expired hold, so a slot nobody retries still frees up. Both are safe under concurrency — `DELETE ... WHERE expires_at <= now()` is idempotent; whichever transaction commits first wins, the other matches zero rows.

`created_at` and `expires_at` are indexed for the sweep and for ownership lookups by `session_token`.

### `payment_submissions`
A customer's claimed payment. `id`, `booking_id` → `bookings`, `reference_no`, `amount_php`, `channel` (`payment_channel_key` enum: `gcash` / `maya` / `bank_transfer`), `receipt_image_url`, `submitted_at`, `status` (`payment_submission_status` enum: `pending` / `approved` / `rejected`), `notes`, `reference_source` (`manual` / `ocr` — added in Phase 3, tracks whether the reference number was typed by the customer or auto-filled by OCR).

Uniqueness is scoped to `(booking_id, reference_no)`, not a global-unique `reference_no` — one checkout can cover multiple bookings paid with the same transfer reference.

### `payment_channels`
Reference data for the 3 payment methods. `key` (PK, `payment_channel_key` — a fixed 3-value enum: `gcash`/`maya`/`bank_transfer`, deliberately **not** a genuinely-addable free-form key, since `payment_submissions.channel` and checkout's fixed 3-tab UI both depend on this exact enum; adding a real 4th channel needs a migration + code change, not just an admin action), `label`, `account_name`, `account_number`, `qr_payload`, `qr_image_path` (added in the QR editor slice — object path in the public `payment-qr-codes` Storage bucket; `null` until a manager/admin uploads a real image, in which case checkout displays it in place of the decorative placeholder render). Editable via `/admin/content`'s Payment Channels tab.

### `waiver_versions` / `waiver_acceptances`
`waiver_versions`: `id`, `version_label`, `body_text`, `published_at`. `waiver_acceptances`: `id`, `booking_id` → `bookings`, `waiver_version_id` → `waiver_versions`, `accepted_at`, `ip_address`.

### `roster_sessions` / `roster_entries`
Court-side check-in. `roster_sessions`: `id`, `booking_id` → `bookings` (**unique** — one booking gets exactly one session, "End Session" then reactivate reuses the same row), `court_id` → `courts`, `active`, `started_at`, `ended_at`. `roster_entries`: `id`, `session_id` → `roster_sessions`, `player_name`, `checked_in`, `check_in_time`.

`enforce_roster_capacity()` is a `before insert` trigger on `roster_entries` that reads the cap from `courts.capacity` and raises a `check_violation` (Postgres error `23514`) when full — the real, concurrency-safe guarantee behind the Route Handler's fast pre-check.

**Roster session history status is derived, not stored** — there is no status column. See [api-reference.md](api-reference.md)'s `GET /api/roster-sessions/history` entry for the exact derivation rule.

### `facility_media` / `faq_items` / `facility_settings`
Managed from `/admin/content`, publicly readable, staff-write (manager/admin tier enforced at the route-handler level, above the DB's own staff-only RLS).

- **`facility_media`**: `id`, `slug` (unique — matches the homepage gallery card IDs 1:1), `title`, `description`, `media_type`, `src` (nullable — `null` means no real photo yet, falls back to the club crest, same graceful-degradation pattern used elsewhere), `alt`, `meta`, `sort_order`. Backs `facility-showcase.tsx`.
- **`faq_items`**: `id`, `question`, `answer`, `category`, `sort_order`. Backs the homepage FAQ section.
- **`facility_settings`**: a genuine singleton (`id boolean primary key default true` + a `check (id)` constraint — Postgres can only ever have one row where a boolean PK is `true`, and the check forbids inserting one where it's `false`). Address, hours, parking, landmark, and contact fields. Backs `location-panel.tsx` and the footer's contact line.

All three homepage consumers use `export const revalidate = 60` (ISR) so an admin edit shows up on the live site within about a minute — no redeploy needed. Seeded with today's real content exactly as it existed in code (real address/hours stay real; placeholder FAQ text and unset contact info stay honestly placeholder/`null`, not fabricated).

### `admin_audit_log`
`id`, `staff_id` → `staff_profiles` (nullable — the profile can be deleted later), `action` (free text, e.g. `payment_submission.approve`), `target_table`, `target_id`, `payload_json`, `created_at`. Indexed for recency, per-target lookup, and per-staff lookup.

### `notification_log`
Every attempted email/SMS confirmation, whether it actually sent. `id`, `booking_id` → `bookings`, `channel` (`notification_channel`: `email` / `sms`), `event` (free text, e.g. `booking_confirmed`), `recipient` (nullable — null means no email/phone was on file, logged honestly rather than silently skipped), `status` (`notification_status`: `sent` / `failed` / `skipped`), `provider_message_id`, `error_message`, `created_at`.

## Row Level Security

Every table except the two `anon`-facing column grants below is **staff-only** via a single `for all using (is_staff())` policy — the same shape repeated on every table, deliberately not varied per-table.

Guest/organizer access (a customer managing their own booking, waiver, payment submission, or roster) is **not** expressed as an RLS policy at all, since a guest has no `auth.uid()` to check against. It's enforced entirely at the Route Handler layer via `session_token` ownership proof, using the `service_role` client (which bypasses RLS). See [auth-and-rbac.md](auth-and-rbac.md).

The one deliberate exception: `bookings` and `slot_holds` grant `anon` **column-scoped** SELECT (`court_id, booking_date, time_slot, status` / `..., expires_at` only — explicitly not `session_token`, `customer_id`, or `price_php`) so the public availability grid can read live open/held/booked state without an account. This is a `GRANT`/RLS-policy pair added in the Phase 3 realtime migration, not a blanket table opening. `slot_blocks` gets the same column-scoped treatment (excluding `reason`/`created_by`) so the grid can show a staff block live too.

**`facility_media`/`faq_items`/`facility_settings`** are genuinely public-read (`using (true)`, no column scoping needed — none of this content is sensitive) since it's meant to render on the public homepage, with writes staying `is_staff()` at the DB level. Several of the newer admin content/pricing routes go further than the DB policy: `rate_cards`, `facility_media`, `faq_items`, and `facility_settings` writes are additionally gated to `manager`/`admin` at the **route-handler** level (not the DB), documented in each route as a deliberate, narrower-than-RLS check — the DB stays permissive for any staff account, the API enforces the tighter tier. Since only `admin` accounts can log in at all today (see [auth-and-rbac.md](auth-and-rbac.md)), this distinction is currently a no-op in practice but is already correctly future-proofed for when `staff`/`manager` logins are enabled.
