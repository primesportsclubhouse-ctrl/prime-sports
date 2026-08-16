# Environment Variables

Full reference lives as comments in `.env.local.example` — copy it to `.env.local` for local dev. This page is the quick-reference table plus the **current, actually-verified configuration status** as of this writing (not a promise that it'll stay this way — re-check the actual files if this page gets stale).

| Variable | Required? | Purpose | Local (`.env.local`) | Production (Vercel + `.env.production`) |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project API URL | ✅ set | ✅ set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key | ✅ set | ✅ set |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only, bypasses RLS for guest writes | ✅ set | ✅ set |
| `NEXT_PUBLIC_SITE_URL` | Yes in prod | Base URL used to build absolute links (currently: the roster check-in link in confirmation emails). Defaults to `http://localhost:3000` if unset. | not set (fine — uses the localhost default) | reported set to `https://primesportsclubhouse.com` in Vercel's dashboard — not independently verified (see [roadmap-and-known-gaps.md](../roadmap-and-known-gaps.md)) |
| `GOOGLE_CLOUD_VISION_API_KEY` | No | Real OCR receipt-reference extraction | ✅ set and verified live (billing enabled) | ✅ set (same key as local) |
| `RESEND_API_KEY` | No | Booking-confirmation email | ✅ set and verified live (real send confirmed) | ✅ set (same key as local) |
| `RESEND_FROM_EMAIL` | No | Sender address; must be on a Resend-verified domain | ✅ set to `bookings@primesportsclubhouse.com`, verified live | ✅ set |
| `SEMAPHORE_API_KEY` | No | Booking-confirmation SMS | ❌ not set — **intentionally on hold** | ❌ not set |
| `SEMAPHORE_SENDER_NAME` | No | Custom SMS sender name | ❌ not set | ❌ not set |

## What "not set" actually does

Every optional integration above degrades **honestly**, not silently:
- **OCR unconfigured**: `/api/ocr/receipt` returns `501 {ocrAvailable: false}`; checkout falls back to the existing manual reference-entry field. Nothing breaks.
- **Email/SMS unconfigured**: `lib/email.ts`/`lib/sms.ts` return `{outcome: "skipped", reason: "..."}`; `notification_log` gets a `skipped` row (with a reason) for every attempt, so "is this actually going out" is always a queryable fact, never a silent guess.

None of these ever fake a success response when unconfigured — see [architecture.md](architecture.md)'s "honest degradation" rule.

## Getting each key

See the fully-detailed comments in `.env.local.example` for exact sign-up steps — they're kept there (next to the variable itself) rather than duplicated here, so they can't drift out of sync with what the code actually reads.

## Vercel-specific note

`.env.production` in this repo is **gitignored** (`.env*` in `.gitignore`, with `.env*.example` explicitly excepted) — it only affects a local `NODE_ENV=production` build/run on this machine. **Vercel does not read it.** Every variable above must also be set directly in Vercel's dashboard (Project → Settings → Environment Variables) or via `vercel env add`. Confirm this matches before assuming a Vercel deploy has the same configuration as your local `.env.production`.
