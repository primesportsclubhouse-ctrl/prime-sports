# Third-Party Integrations

## Supabase (core — always required)

Postgres, Auth, Storage, and Realtime, all from one project. See [database-schema.md](database-schema.md), [auth-and-rbac.md](auth-and-rbac.md), and the realtime section of [architecture.md](architecture.md). This is not optional; nothing in the app works without it.

## Google Cloud Vision — receipt OCR

**Status: configured and verified live** (billing enabled on the linked GCP project, confirmed with a real API call).

Powers `/api/ocr/receipt` — after a customer uploads a payment receipt, this attempts to extract a `PRS-XXXXXX` reference number via `TEXT_DETECTION`, so the reference field can be pre-filled (still editable) instead of typed manually. Extraction heuristic (`lib/ocr.ts`): regex-matches a `PRS` prefix + 6 alphanumeric characters, tolerant of OCR noise in the separator; only claims confidence when exactly one distinct match is found in the detected text.

Requires `GOOGLE_CLOUD_VISION_API_KEY` **and** an active billing account on the GCP project (Cloud Vision requires billing even for free-tier usage — this specific requirement is what broke the first attempt to use it; see [environment-variables.md](environment-variables.md)).

Unconfigured/failed behavior: `501 {ocrAvailable: false}` if no key; `502 {ocrAvailable: true, error}` if the call itself fails. Checkout's manual reference-entry field is untouched either way.

## Resend — booking confirmation email

**Status: configured and verified live**, sending from a verified domain (`bookings@primesportsclubhouse.com`), not Resend's shared sandbox sender.

Fired from `app/api/payment-submissions/[id]/approve/route.ts` after a booking is confirmed, via `lib/supabase/notifications.ts` → `lib/email.ts`. The email includes a "Check in your group" link to the customer's booking-scoped roster check-in page (see the roster feature in [database-schema.md](database-schema.md) and [booking-and-checkin-guide.md](../guides/booking-and-checkin-guide.md)).

Requires `RESEND_API_KEY`; `RESEND_FROM_EMAIL` must point at a domain verified in the Resend dashboard, or mail only reaches the account owner's own address (Resend's sandbox restriction).

## Semaphore — booking confirmation SMS

**Status: built, intentionally not activated.** `SEMAPHORE_API_KEY` is unset on purpose (business decision, not a technical gap) — every booking confirmation currently logs its SMS attempt as `skipped` in `notification_log`, with the reason recorded.

The code path (`lib/sms.ts`, wired the same way as email in `lib/supabase/notifications.ts`) is real and ready — activating this is purely a matter of signing up at semaphore.co and setting the key. No code changes needed.

## Explicitly not built (by decision, not oversight)

- **Real payment gateway** (PayMongo/Xendit) — manual payment verification (the approve/reject queue) remains the process. Tagged "optional/skip for now" in the project's own backend checklist.
- **Real QR generation** encoding actual payment URIs — the QR shown at checkout is still a decorative rendering, not a scannable payment payload. Same "skip for now" tag.

Neither of these is a bug or an incomplete integration — both were explicitly descoped. See [roadmap-and-known-gaps.md](../roadmap-and-known-gaps.md) for the full current-status ledger.
