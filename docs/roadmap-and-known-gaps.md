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
- **Real-time subscriptions** — live availability grid, live verification queue, live pending-count badge on the admin sidebar's Verification Queue nav item.
- **Booking-confirmation email** (Resend) — configured with a verified sending domain, verified with a real send.
- **Admin audit log** — payment approve/reject, staff-initiated roster activate/end, and every content/rate/availability/QR edit below are all recorded.
- **Slot-hold TTL sweep** — a proactive `pg_cron` job in addition to the existing lazy per-slot cleanup.
- **Availability slot-blocking** (`/admin/availability`) — staff can mark specific court/hour slots closed for a date (maintenance, tournaments); a blocked slot is genuinely unbookable — the check lives inside `create_booking_draft()` itself, not just app-layer validation, and the public grid shows it live via realtime.
- **Rate-card pricing** (`/admin/rates`) — `rate_cards` is now the actual, live source of truth for pricing everywhere: booking price-stamping, the availability grid's per-slot rate, the homepage pricing cards, and the in-flow booking/checkout price displays all read from it. The previously-hardcoded `rateWindows` table is gone from every real pricing path (kept only as a documented transient fallback in two components until their first fetch resolves).
- **Facility content editing** (`/admin/content`) — real `facility_media`, `faq_items`, and `facility_settings` tables, a tabbed admin editor, and the homepage (facility gallery, FAQ section, footer contact line, location panel) all genuinely read from them via ISR (60s revalidation, no redeploy needed to see an edit).
- **Payment channel QR images** (`/admin/content` → Payment Channels tab) — managers/admins can upload a channel's real GCash/Maya/bank QR image to a public Storage bucket; checkout renders the real image when one exists, falling back to the decorative placeholder otherwise. This is real image display, not real QR *generation* — see "explicitly descoped" below, still unchanged.

## Built, but intentionally not active

- **SMS confirmations** (Semaphore) — the code is real and ready (`lib/sms.ts`); `SEMAPHORE_API_KEY` is deliberately unset. Every attempt logs as `skipped` in `notification_log`. Turning this on requires only signing up and setting the key — no code change.

## Explicitly descoped (business decision, not a gap)

- **Real payment gateway** (PayMongo/Xendit) — manual approve/reject verification remains the process by design.
- **Real QR *generation*** — encoding an actual scan-to-pay payment URI (vs. just displaying a real QR *image* the business already has, which is now built — see above) remains out of scope.

### Homepage placeholders — now editable, still not filled in with real content

Editable and containing real content are two different things — don't conflate them. As of the content editor slice, all three of these are managed from `/admin/content` and update the live site within ~60 seconds, no redeploy needed. But **no real content has actually been entered yet**:

- **Facility photos** — all 6 facility gallery cards still have `src: null` in `facility_media`; none of the real photography exists (`public/prime-sports/` only has the logo and one hero court photo). Each card gracefully falls back to the club crest — an honest placeholder, not a stock photo pretending to be real.
- **FAQ content** — every FAQ question/answer in `faq_items` is still the original literal bracketed placeholder text, e.g. `"[FAQ question 01 — reservations & booking policy]"`. Writing real answers is a content decision for the business, not something any agent should fabricate.
- **Contact number** — `facility_settings.contact_phone`/`contact_email` are still `null`; the footer honestly renders `[Contact]` rather than a fabricated number.

Whoever manages the site content should log into `/admin/content` and fill these in — the mechanism to do so now exists, but the content itself still needs to actually be entered.

## Partially built, on purpose

- **Staff RBAC** — the full `staff` / `manager` / `admin` hierarchy exists in the database (enum, RLS helper functions) but only `admin` is actually gated at login/`proxy.ts` today, since no feature currently needs a finer-grained tier. Widening this later is a small, contained change — see [auth-and-rbac.md](technical/auth-and-rbac.md).

## Open action items (not code gaps — configuration/ops)

- **`NEXT_PUBLIC_SITE_URL` in Vercel** — reported set by the project owner. Not independently verified from here (I can't read Vercel's dashboard directly, and confirming it live would mean triggering a real production booking-confirmation email). Worth a quick manual check next time a real payment is approved in production: open the confirmation email and confirm the "Check in your group" link points at `https://primesportsclubhouse.com/...`, not `localhost`.
- **Semaphore signup** — whenever SMS confirmations are wanted, sign up and set `SEMAPHORE_API_KEY` (see [third-party-integrations.md](technical/third-party-integrations.md)).
