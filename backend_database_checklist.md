# Backend Database Checklist

## Phase 1 — Core Auth & Data Schema

- [x] Stand up database (Postgres via Supabase — built-in auth+RLS+storage+realtime in one)
  - Supabase project linked, local dev stack running (ports remapped to 56xxx to avoid conflicts with other local projects — see `supabase/config.toml` / `.env.local`).
- [x] Create schema: customers, staff_accounts, courts, rate_cards, operating_hours, bookings, slot_holds, payment_submissions, payment_channels, waiver_versions, waiver_acceptances, roster_sessions, roster_entries
  - `supabase/migrations/20260801000000_phase1_core_schema.sql`:
    - [x] `customers`
    - [x] `staff_profiles` (Supabase Auth-backed; this is the `staff_accounts` line above)
    - [x] `courts`
    - [x] `rate_cards`
    - [x] `operating_hours`
    - [x] `bookings` (with the double-booking-safe unique index)
  - `supabase/migrations/20260813000000_phase2_slot_holds.sql`:
    - [x] `slot_holds`
  - `supabase/migrations/20260813000200_phase2_payments_schema.sql`:
    - [x] `payment_submissions`
    - [x] `payment_channels`
    - [x] `waiver_versions`
    - [x] `waiver_acceptances`
  - `supabase/migrations/20260813000400_phase2_roster_schema.sql`:
    - [x] `roster_sessions`
    - [x] `roster_entries`
- [x] Real staff auth (hash + session, or Supabase Auth) + middleware.ts gating /admin/*
  - Real Supabase Auth (`signInWithPassword`) via `app/api/auth/login` + `app/api/auth/logout`, wired into `admin-login-form.tsx` / `admin-shell.tsx`.
  - Route gating lives in `proxy.ts` at the project root — Next 16.2.11 renamed `middleware.ts` → `proxy.ts` (exported fn `proxy`, not `middleware`); functionally this is the item above.
  - Scoped to `admin`-role accounts only for now (`current_staff_role() === "admin"`) — `staff`/`manager` RBAC tiers aren't gated in yet, by explicit decision, since no staff/manager-only capabilities exist yet to gate.
  - Verified end-to-end against a live local Supabase instance (seeded admin login → session → RPC checks), plus `pnpm lint` / `pnpm build` clean.
- [ ] Seed real content for facility_media, faq_items, facility_settings, rate_cards to replace bracketed placeholders (Skip for now)

## Phase 2 — Core CRUD APIs

- [x] /api/availability + /api/bookings with the composite unique index enforcing no double-booking
  - `app/api/availability`, `app/api/bookings`, `app/api/bookings/[id]` — the Postgres unique index (not app-level checking) is the concurrency guard; a losing race gets a real 409.
- [x] /api/payment-submissions + approve/reject actions that actually transition bookings.status (fixing the current approve==reject bug)
  - `app/api/payment-submissions/[id]/approve` → booking `confirmed`; `app/api/payment-submissions/[id]/reject` → booking `cancelled` + frees the slot hold. Verified as two genuinely distinct code paths, not a shared handler.
- [x] Receipt upload → object storage, wired into checkout
  - `app/api/uploads/receipt` → private Supabase Storage `receipts` bucket, wired into `checkout-client.tsx`; the fake `setTimeout` OCR/random-reference generator was removed (real OCR extraction itself stays Phase 3 — reference number is manual entry for now).
- [x] Waiver acceptance persisted against the booking (waiver_acceptances)
  - `app/api/bookings/[id]/waiver`; `waiver-form-dialog.tsx`'s `isAccepted` is now server-sourced (`bookings[].waiverAccepted`), not local-only state.
- [x] Roster session/entries CRUD replacing the fake-random-name local array
  - `app/api/roster-sessions*` (session activate/end, entry add/toggle/remove); `roster-client.tsx`'s random-name generator and local-only state removed. Capacity (10) enforced both in the UI and by a DB trigger on `roster_entries`.
  - `roster-history.tsx` now real too: `GET /api/roster-sessions/history` derives status (`completed`/`no-show`/`cancelled`) from the linked booking's status + checked-in count — no redundant status column added, consistent with how capacity already reads from `courts.capacity` rather than a duplicate literal.
- [x] Wire the 4-step booking flow to a single server-side draft booking (closes the state-loss gap)
  - `reservation-provider.tsx` now persists a session token + hydrates real held bookings from `GET /api/bookings` on mount instead of holding everything in memory only.

## Phase 3 — Real-time & Advanced Logic

- [x] Real-time availability + verification-queue subscriptions
  - `supabase/migrations/20260814000000_phase3_realtime.sql` adds `bookings`/`slot_holds`/`payment_submissions` to the `supabase_realtime` publication, with anon SELECT narrowed to exactly the columns `/api/availability` already exposes publicly (not `session_token`/`customer_id`/`price_php`). `lib/supabase/realtime.ts`'s `useRealtimeRefresh()` wires `booking-client.tsx` (live slot grid, showing others' held/booked slots for the first time) and `verification-queue.tsx` (live queue updates), with debouncing and a polling fallback if the socket drops.
- [x] Real OCR integration for receipt reference extraction
  - `app/api/ocr/receipt` calls Google Cloud Vision (`TEXT_DETECTION`), wired into `checkout-client.tsx` to pre-fill (still-editable) the reference field on a confident match. Honestly reports "not configured" (501) rather than faking a result — `GOOGLE_CLOUD_VISION_API_KEY` isn't set yet, so the real Vision call path is unexercised until that key is added (documented in `.env.local.example`). `payment_submissions.reference_source` (`manual`/`ocr`) tracks which path filled it in.
- [ ] Real payment gateway (PayMongo/Xendit) to reduce/eliminate manual verification (Optional/skip for now)
- [ ] Real QR generation encoding actual payment URIs (Optional/skip for now)
- [x] Email/SMS confirmation on booking + payment approval
  - `lib/email.ts` (Resend) + `lib/sms.ts` (Semaphore), orchestrated by `lib/supabase/notifications.ts`, fired from `approve/route.ts` after a booking is confirmed. Every attempt (sent/failed/skipped) is logged to a new `notification_log` table so it's queryable whether confirmations are actually going out. `RESEND_API_KEY`/`SEMAPHORE_API_KEY` aren't set yet, so every attempt currently logs as `skipped`, not silently nothing.
- [x] admin_audit_log for staff actions (approve/reject/edit content)
  - `supabase/migrations/20260814000100_phase3_audit_log.sql` + `lib/supabase/audit-log.ts`'s `recordAuditLog()`, wired into payment approve/reject and staff-initiated roster session activate/end (guest-initiated activations correctly excluded). Staff-only `GET /api/admin-audit-log` to read it back; no consumer UI yet (not in scope, log itself is the checklist item).
- [x] Slot-hold TTL sweep (cron or DB trigger) to release abandoned holds
  - `supabase/migrations/20260814000200_phase3_slot_hold_sweep.sql`: `sweep_expired_slot_holds()` on a 5-minute `pg_cron` schedule, guarded to degrade gracefully (skip scheduling, keep the function callable manually) if `pg_cron` isn't available/permitted in a given environment. Complements (doesn't replace) the existing lazy per-slot cleanup in `create_booking_draft()`.

Two items above (OCR, email/SMS) are real, wired-in code verified by reading + `pnpm lint`/`pnpm build`, but **not yet exercised against live third-party calls** — no API keys are set for Google Vision, Resend, or Semaphore yet. Add `GOOGLE_CLOUD_VISION_API_KEY` / `RESEND_API_KEY` / `SEMAPHORE_API_KEY` to `.env.local` (see comments there) to actually test the real call paths.
