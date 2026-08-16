# Auth & RBAC

There are two completely separate auth systems in this app — don't conflate them.

## Staff auth

Real Supabase Auth. `app/api/auth/login/route.ts` calls `supabase.auth.signInWithPassword(...)`, then checks `current_staff_role()` via RPC — **only accounts with role `admin` are let in**; `staff` and `manager` accounts (and accounts with no `staff_profiles` row at all) get signed back out and a `403`. Session cookies are managed by `@supabase/ssr`, shared between Server Components/Route Handlers (`lib/supabase/server.ts`) and the middleware context (`lib/supabase/middleware.ts`).

**Route gating**: `proxy.ts` at the project root — this is Next 16.2.11's renamed `middleware.ts` (the exported function is `proxy`, not `middleware`; there is no `middleware.ts` in this codebase and there shouldn't be one). Its `matcher` covers `/admin` and `/admin/:path*`. An unauthenticated or non-admin request to any `/admin/*` path redirects to `/admin` (the login page); an already-authenticated admin hitting bare `/admin` redirects straight to `/admin/dashboard`.

**Why admin-only, not the full `staff < manager < admin` hierarchy**: the `staff_role` enum and `is_staff()`/`is_manager_or_admin()`/`current_staff_role()` helper functions all exist in the Phase 1 migration and support the full three-tier model — but no feature in this app currently has a staff-only or manager-only capability distinct from admin, so there's nothing to gate at those finer tiers yet. When that changes, widening the check in `proxy.ts` and `app/api/auth/login/route.ts` from `role === 'admin'` to `is_staff()`/`is_manager_or_admin()` is a small, contained change — the RLS policies and helper functions are already there waiting.

## Guest / organizer auth (the "session token" pattern)

A customer never creates an account. At the start of checkout, the frontend generates a random `session_token` and stores it in `localStorage` (`reservation-provider.tsx`). That single token becomes the proof of "this is the person who made this booking" for the rest of that booking's lifecycle:

- Creating/patching the booking (`/api/bookings`, `/api/bookings/[id]`)
- Accepting the waiver (`/api/bookings/[id]/waiver`)
- Submitting a payment (`/api/payment-submissions`)
- Uploading a receipt (`/api/uploads/receipt` — files are namespaced `${sessionToken}/...`, and `/api/ocr/receipt` checks the requested path starts with the caller's own token before reading it)
- Managing their roster check-in, once staff has started it (`/api/roster-sessions/**`)

The verification logic lives in two small, shared helpers — reuse these, don't re-derive the check inline in a new route:

- `lib/supabase/slot-holds.ts` — `verifySlotHoldOwnership()` / `freeSlotHold()`.
- `lib/supabase/roster-auth.ts` — `authorizeBookingForRoster()` (staff OR matching `session_token` against the booking's `slot_holds` row) and `getRosterSessionBookingId()` (session ID → booking ID, for routes that only know the session ID).

**Why this token stays valid after the booking is confirmed**: `slot_holds` is only deleted on reject/cancel/no-show (`freeSlotHold()`), never on approval. So a confirmed booking's `session_token` is still sitting in `slot_holds`, which is exactly what makes the roster check-in email link work days after checkout — see [database-schema.md](database-schema.md)'s `slot_holds` entry.

There is **no RLS policy** expressing guest ownership — Postgres RLS has no way to check a bearer token against `auth.uid()` when there is no `auth.uid()`. Every guest-facing write route uses the `service_role` client (`lib/supabase/service-role.ts`, bypasses RLS entirely) *after* the route handler itself has verified the `session_token` in application code. RLS on these tables stays a blanket `is_staff()` policy — the guest path is a deliberate, audited exception at the handler layer, not a hole in the policy.

## Dual-mode routes

Several roster routes accept *either* a staff session *or* a guest `session_token` — e.g. staff can activate a session while browsing `/admin/roster`, but so can the customer via their own booking. `authorizeBookingForRoster()` checks staff first (`getStaffContext()`); if that fails, it falls back to the token check. Staff identity is preserved through the result (`{ ok: true, staff }`) specifically so callers can decide whether to attribute an action to a staff member for audit-logging purposes — see `app/api/roster-sessions/route.ts`'s activate handler, which only calls `recordAuditLog()` when a staff actor is actually present, correctly excluding guest-initiated activations from the staff audit trail.

## What's NOT built

Customer accounts don't exist and aren't required — guest checkout works by design, per the product's own principle that no login should be required to book. Only add customer auth if booking history or repeat-customer recognition becomes an actual requirement; it isn't one today.
