# Prime Sports — Documentation

PrimeSports Clubhouse is a facility-booking platform for a real pickleball/badminton clubhouse (Highway, Minglanilla, Cebu). This folder documents the backend that was built to replace the original frontend-only prototype — every table, route, integration, and the staff/customer workflows they power.

## For developers

- **[architecture.md](technical/architecture.md)** — the stack, folder layout, and the core design decisions (auth model, service-role pattern, honest-degradation rule for third-party integrations).
- **[database-schema.md](technical/database-schema.md)** — every table, its relationships, RLS model, and the full migration history.
- **[api-reference.md](technical/api-reference.md)** — every API route, its auth mode, and what it does.
- **[auth-and-rbac.md](technical/auth-and-rbac.md)** — how staff login/route-gating works, and the separate guest/organizer "session token" ownership model used everywhere a customer needs to act without an account.
- **[environment-variables.md](technical/environment-variables.md)** — every env var, what it's for, and its current configured status in local dev vs. production.
- **[third-party-integrations.md](technical/third-party-integrations.md)** — Supabase, Google Cloud Vision (OCR), Resend (email), and Semaphore (SMS): what each powers and its current activation status.
- **[local-development.md](technical/local-development.md)** — getting the app running locally, including the port-conflict issue you're likely to hit if you run other local Supabase projects.
- **[deployment.md](technical/deployment.md)** — pushing schema changes to the hosted Supabase project and deploying to Vercel, including a real gotcha this project hit (missing baseline database grants) and how to check for it again.

## For staff / non-technical readers

- **[admin-guide.md](guides/admin-guide.md)** — logging into the admin dashboard, verifying payments, and running court-side check-in.
- **[booking-and-checkin-guide.md](guides/booking-and-checkin-guide.md)** — the customer's full journey, from browsing courts to checking their group in on the day.

## Current status

- **[roadmap-and-known-gaps.md](roadmap-and-known-gaps.md)** — an honest ledger of what's fully built, what's built but intentionally inactive (e.g. SMS, pending an API key), and what was explicitly descoped. Read this before assuming any feature works end-to-end.

## Where this fits in the codebase

This `/docs` folder describes what the backend *does*. `backend_database_checklist.md` in the project root is the running build checklist that tracked getting here — check that first for a quick phase-by-phase status, and come here for the actual reference material.
