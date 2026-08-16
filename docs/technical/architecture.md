# Architecture

## Stack

- **Next.js 16.2.11** (App Router) — note the version: this release renamed `middleware.ts` to `proxy.ts` (exported function `proxy`, not `middleware`), and several routing/caching APIs differ from older training-data assumptions. Check `node_modules/next/dist/docs/` before assuming a Next.js API's current behavior.
- **Supabase** — Postgres, Auth, Storage, and Realtime, all from one hosted project. There is no separate custom backend server; every API route in `app/api/**` talks to Supabase directly.
- **Tailwind v4** (CSS-first config, `@import "tailwindcss"`, `@theme inline` in `app/globals.css`).
- **Vercel** — deployment target for the Next.js app.
- **Resend**, **Google Cloud Vision**, **Semaphore** — third-party integrations for email, OCR, and SMS respectively (see [third-party-integrations.md](third-party-integrations.md)).

## Folder layout

```
app/                        Route files — pages, layouts, metadata, API routes. Composes UI, doesn't own business logic.
  api/                       Every backend endpoint (see api-reference.md)
  admin/                     Staff-only pages, gated by proxy.ts
  (public)/                  Customer-facing pages
components/prime-sports/    Reusable UI and interactive client modules
lib/                        Shared types, deterministic helpers, and Supabase client factories
  supabase/                  Supabase client variants (browser, server, service-role) + shared server-side helpers
supabase/
  migrations/                Every schema change, in order — this IS the schema's history, read it before assuming a table's shape
proxy.ts                    Next 16's middleware — gates /admin/*
```

## Core design decisions

### Two separate auth models, not one

**Staff auth** is real Supabase Auth (`supabase.auth.signInWithPassword`), session cookies via `@supabase/ssr`, gated by `proxy.ts` on every `/admin/*` route. It currently only admits accounts with `current_staff_role() === 'admin'` — the `staff`/`manager` tiers exist in the database (`staff_role` enum, `is_staff()`/`is_manager_or_admin()` helpers) but aren't wired into any login/route gate yet, because no staff/manager-only capability exists yet to gate. Widening this is a small, contained change in `proxy.ts` and `app/api/auth/login/route.ts` when that day comes.

**Guest/organizer auth** has no login at all — a customer completing checkout, or later checking their group in, never creates an account. Instead, a random `session_token` is generated at the start of checkout, stored in the browser's `localStorage` (see `reservation-provider.tsx`), and threaded through every write that customer makes: creating/patching their booking, accepting the waiver, submitting a payment, and (as of the roster check-in feature) managing their roster session. Every one of those routes proves ownership by matching the submitted `session_token` against the `slot_holds` row tied to that booking — see [auth-and-rbac.md](auth-and-rbac.md) for the exact mechanism.

Several routes (e.g. `app/api/roster-sessions/**`) are **dual-mode**: they accept either a staff session or a valid guest `session_token`, via a shared `authorizeBookingForRoster()`/`authorizeRosterSession()` helper. Read `lib/supabase/roster-auth.ts` and `lib/supabase/slot-holds.ts` before adding a new dual-mode route — reuse those, don't re-derive the ownership check inline.

### service-role client for privileged/guest writes

`lib/supabase/service-role.ts` exports a Supabase client built from `SUPABASE_SERVICE_ROLE_KEY`, which bypasses Row Level Security entirely. Every API route that needs to write on behalf of an unauthenticated guest (creating a booking, submitting a payment) uses this client, since a guest has no `auth.uid()` for RLS to check against. RLS itself stays staff-only (`is_staff()`) on almost every table; the guest ownership proof lives at the route-handler layer via `session_token`, not in a Postgres policy.

### Best-effort side effects never block the primary action

Audit logging (`lib/supabase/audit-log.ts`) and customer notifications (`lib/supabase/notifications.ts`) are both fired `void`-style, fire-and-forget, after a mutation has already succeeded. Both catch and log their own errors internally and never throw — a broken audit log or a failed email send must never fail the approve/reject/roster action that triggered it. Follow this exact pattern for any new side effect on a mutation route.

### Third-party integrations degrade honestly

Google Vision (OCR) and Resend/Semaphore (notifications) are real, working integrations, but this project has a hard rule against faking success when a service is unconfigured or fails:

- **OCR** (`app/api/ocr/receipt/route.ts`): returns a `501` with `{ ocrAvailable: false }` if `GOOGLE_CLOUD_VISION_API_KEY` is unset — never a fabricated reference number. A `502` with `{ ocrAvailable: true, error }` if the key is set but the call itself fails.
- **Notifications** (`lib/supabase/notifications.ts`): every attempt (sent/failed/skipped) is logged to `notification_log`, so "is this actually going out" is a queryable fact, not a guess.

Apply this same standard to any future integration: a missing key or a failed call must produce a clearly-labeled non-success state, not silence.

### Realtime is a "go refetch" signal only

`lib/supabase/realtime.ts`'s `useRealtimeRefresh()` hook treats every Postgres change event as a trigger to refetch the relevant REST endpoint — it never reads fields directly off the realtime payload. This is why the realtime migration didn't need `replica identity full` on any table; the default primary-key-only identity is sufficient when no consumer inspects the old/new row diff.
