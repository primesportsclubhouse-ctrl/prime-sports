# API Reference

Auth modes used below:
- **Staff** — requires a signed-in `admin`-role Supabase Auth session (`getStaffContext()`).
- **Guest (token)** — requires a `sessionToken` (body, query param, or URL param depending on the route — see each entry), proven against the booking's `slot_holds`/upload-path ownership. No account needed.
- **Dual** — accepts either Staff or Guest (token); staff always wins if both are present.
- **Public** — no auth; either fully open or scoped by RLS's `anon` column grants.

## Auth

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/login` | POST | Public | `signInWithPassword`, then requires `current_staff_role() === 'admin'` — non-admin accounts are signed back out and get a 403. |
| `/api/auth/logout` | POST | Public | Signs out the current session. |

`proxy.ts` (Next 16's `middleware.ts`) gates every `/admin` and `/admin/:path*` route separately from these endpoints — see [auth-and-rbac.md](auth-and-rbac.md).

## Availability & bookings

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/availability` | GET | Public | Returns open/held/booked slots for a court/date range, reading `operating_hours` + `rate_cards` + `bookings` + `slot_holds`. |
| `/api/bookings` | GET | Guest (token) | Rehydrates a session's active bookings + contact info — what `reservation-provider.tsx` calls on mount so refreshing mid-flow doesn't lose state. |
| `/api/bookings` | POST | Public | Creates a `held` draft booking via `create_booking_draft()` (atomic hold + booking insert). Returns `409` on a genuine slot conflict — the DB's unique index rejects the race, not app code. |
| `/api/bookings/[id]` | PATCH | Guest (token) | Transitions booking status (e.g. to `cancelled`/`no_show`), proven via the matching `slot_holds.session_token`. Frees the slot hold immediately on cancel/no-show. |
| `/api/bookings/[id]/waiver` | POST | Guest (token) | Persists waiver acceptance against the booking. |

## Payments

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/payment-channels` | GET | Public | Lists the 3 payment channels (GCash/Maya/Bank Transfer) for checkout, including each channel's real `qrImageUrl` if a manager/admin has uploaded one (falls back to `null` — checkout renders the decorative placeholder QR). Also used by the admin content editor's Payment Channels tab. |
| `/api/payment-channels/[key]` | PATCH | Staff (manager/admin) | Edits an existing channel's label/account name/account number. The 3 channel keys are fixed (Postgres enum also relied on by `payment_submissions.channel`) — this is not an "add a channel" endpoint. |
| `/api/payment-channels/[key]/qr-image` | POST | Staff (manager/admin) | Uploads/replaces a channel's real QR image into the public `payment-qr-codes` Storage bucket; deletes the previous image object, if any. |
| `/api/payment-channels/[key]/qr-image` | DELETE | Staff (manager/admin) | Clears a channel's QR image, reverting checkout to the placeholder render. |
| `/api/payment-submissions` | POST | Guest (token) | Submits a payment claim (reference number, amount, channel, receipt path) tied to one or more bookings. Fires a "booking received, pending verification" customer email as a best-effort side effect — distinct from the "booking confirmed" email fired later by approve, below. |
| `/api/payment-submissions` | GET | Staff | Lists submissions (filterable by `status`) for the verification queue, with signed receipt image URLs. |
| `/api/payment-submissions/pending-count` | GET | Staff | Cheap `{ count }` of `pending` submissions — backs the sidebar's Verification Queue badge (`admin-sidebar.tsx`). Deliberately separate from the route above: no join, no signed-URL generation, since the sidebar renders on every admin page. |
| `/api/payment-submissions/[id]/approve` | POST | Staff | Sets submission `approved` **and** booking `confirmed`. Fires audit log + customer notifications (email/SMS) as best-effort side effects. |
| `/api/payment-submissions/[id]/reject` | POST | Staff | Sets submission `rejected` **and** booking `cancelled`, frees the slot hold. A genuinely separate code path from approve — not a shared handler with a different label. |
| `/api/uploads/receipt` | POST | Guest (token) | Uploads a receipt image to the private `receipts` Storage bucket, namespaced under `${sessionToken}/...`. |
| `/api/ocr/receipt` | POST | Guest (token, path-prefix proof) | Runs Google Vision `TEXT_DETECTION` on an uploaded receipt, tries to extract a `PRS-XXXXXX` reference. Returns `501 {ocrAvailable:false}` if unconfigured, `502` if the call fails — never a fabricated reference. |

## Roster / court-side check-in

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/roster-sessions` | GET | Staff | Lists confirmed bookings for a date across both sports, with any existing session's player counts (the staff browse view). |
| `/api/roster-sessions` | POST | Dual | Activates/reactivates a roster session for a booking. |
| `/api/roster-sessions/by-booking/[bookingId]` | GET | Dual | Looks up a session **by booking ID** (not session ID) — what the public check-in page uses, since a booker only knows their own `bookingId` + `sessionToken`. Returns `{ booking, session: null }` (not an error) when staff hasn't activated a session yet. |
| `/api/roster-sessions/[id]` | GET / PATCH | Dual | Reads session detail; PATCH toggles active/ended (ending is the staff-initiated path; the public check-in page has no "end" control in its UI, though the route itself doesn't distinguish who calls it beyond the auth check). |
| `/api/roster-sessions/[id]/entries` | POST | Dual | Adds a player (auto-checked-in). Capacity enforced both here (fast pre-check) and by a DB trigger (the real guarantee under concurrency). |
| `/api/roster-sessions/[id]/entries/[entryId]` | PATCH / DELETE | Dual | Toggles a player's checked-in state, or removes them. |
| `/api/roster-sessions/history` | GET | Staff | Past-session ledger for one sport. Status (`completed`/`no-show`/`cancelled`) is **derived**, not stored — see below. |

**History status derivation** (no status column exists on `roster_sessions`): `cancelled` if the linked booking is `cancelled`; `no-show` if the booking is `no_show`, or the session ended with zero checked-in entries; `completed` if the session ended with ≥1 checked-in entry and the booking wasn't cancelled/no-show. A session only counts as history once it's actually ended (or its booking resolved to cancelled/no-show) — a still-active session is the live check-in view, not history.

## Audit log

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/admin-audit-log` | GET | Staff | Paginated, filterable read of every logged staff action. No consumer UI yet — the log itself was the checklist item. |

What gets logged: payment approve/reject, staff-initiated roster session activate/end (guest-initiated activations are correctly excluded — only a real staff actor should show up in a staff audit trail), and payment channel edits/QR image upload/removal.
