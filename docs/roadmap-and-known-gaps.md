# Roadmap & Known Gaps

An honest, current status ledger. This is the "what actually works" reference — check here before assuming any feature is fully live. If this page and the code disagree, the code wins; re-verify rather than trust this page blindly if it's been a while.

## Fully built and verified

- **Schema** — all 15 tables, real relationships, real RLS (see [database-schema.md](technical/database-schema.md)).
- **Staff auth** — real Supabase Auth, admin-only route gating via `proxy.ts`.
- **Guest/organizer auth** — the `session_token` ownership-proof pattern, used consistently across bookings, waiver, payments, uploads, and roster.
- **Availability & booking** — real double-booking prevention via a Postgres unique index, not app-level checking.
- **Payment submissions + approve/reject** — genuinely distinct code paths (the old same-code-path bug is fixed).
- **Receipt upload** — real object storage, private bucket.
- **Real OCR** (Google Cloud Vision) — configured, billing enabled, verified with a real API call.
- **Waiver acceptance** — persisted server-side.
- **Roster session/entry CRUD** — including the public, booker-facing self-check-in page and its confirmation-email link.
- **Roster history** — status derived from real booking/check-in data, not stored redundantly.
- **Server-side draft booking** — the 4-step flow survives a refresh.
- **Real-time subscriptions** — live availability grid, live verification queue.
- **Booking-confirmation email** (Resend) — configured with a verified sending domain, verified with a real send.
- **Admin audit log** — payment approve/reject and staff-initiated roster activate/end are all recorded.
- **Slot-hold TTL sweep** — a proactive `pg_cron` job in addition to the existing lazy per-slot cleanup.

## Built, but intentionally not active

- **SMS confirmations** (Semaphore) — the code is real and ready (`lib/sms.ts`); `SEMAPHORE_API_KEY` is deliberately unset. Every attempt logs as `skipped` in `notification_log`. Turning this on requires only signing up and setting the key — no code change.

## Explicitly descoped (business decision, not a gap)

- **Real payment gateway** (PayMongo/Xendit) — manual approve/reject verification remains the process by design.
- **Real QR generation** — the checkout QR is still a decorative rendering, not an actual scannable payment payload.

## Never in scope, still frontend-only

- **Availability editing** (`components/prime-sports/admin/availability-editor.tsx`) — the admin "Availability" screen is a per-date slot-blocking tool (mark specific court/hour combinations closed for maintenance, tournaments, etc.). It has zero backend wiring (confirmed: no `fetch` calls in the file at all) — clicking "Save Changes" only shows a success toast, nothing persists. This was never part of any phase's checklist item.
- **Rate-card pricing editing** — there is currently no admin UI at all for changing what a court costs; `rate_cards` can only be changed by hand-editing a migration/seed. Not the same thing as the Availability screen above, despite living under a similarly-named nav concept.
- **Facility content editing** — no admin UI exists for `facility_media`, `faq_items`, or `facility_settings` either. Explicitly tagged "skip for now" in the original backend checklist.

### Homepage placeholders still showing fake/incomplete content

These are live on the public site right now, not just theoretical:

- **Facility photos** — all 6 cards in the homepage's facility gallery (`components/prime-sports/home/facility-showcase.tsx`) have their `media` field commented out; none of the real photography exists yet (`public/prime-sports/` only has the logo and one hero court photo). Each card gracefully falls back to the club crest instead of showing a stock photo — an intentional, honest placeholder, but still a placeholder.
- **FAQ content** — every FAQ question and answer on the homepage (`app/(public)/page.tsx`'s `faqItems`) is still literally bracketed placeholder text, e.g. `"[FAQ question 01 — reservations & booking policy]"`. Real answers were never written.
- **Contact number** — the site footer (`components/prime-sports/layout/site-footer.tsx`) shows `Highway, Minglanilla, Cebu · [Contact]` — the phone number was never filled in, in both places it appears in that file.

None of these three are backend gaps — there's nowhere in the database to even put this content yet (`facility_media`/`faq_items`/`facility_settings` tables were never created, per the "skip for now" item above). Fixing them requires both a real content decision from the business (actual photos, actual FAQ answers, the actual phone number) and, if you want it manageable outside a code deploy, the content-editing backend that doesn't exist yet either.

## Partially built, on purpose

- **Staff RBAC** — the full `staff` / `manager` / `admin` hierarchy exists in the database (enum, RLS helper functions) but only `admin` is actually gated at login/`proxy.ts` today, since no feature currently needs a finer-grained tier. Widening this later is a small, contained change — see [auth-and-rbac.md](technical/auth-and-rbac.md).

## Open action items (not code gaps — configuration/ops)

- **`NEXT_PUBLIC_SITE_URL` in Vercel** — reported set by the project owner. Not independently verified from here (I can't read Vercel's dashboard directly, and confirming it live would mean triggering a real production booking-confirmation email). Worth a quick manual check next time a real payment is approved in production: open the confirmation email and confirm the "Check in your group" link points at `https://primesportsclubhouse.com/...`, not `localhost`.
- **Semaphore signup** — whenever SMS confirmations are wanted, sign up and set `SEMAPHORE_API_KEY` (see [third-party-integrations.md](technical/third-party-integrations.md)).
