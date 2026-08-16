# Deployment

Two independent things need deploying: the Supabase schema (to the hosted project) and the Next.js app (to Vercel). Neither happens automatically from the other.

## Pushing schema to the hosted Supabase project

```bash
pnpm exec supabase migration list   # compare local vs. remote — anything with an empty "remote" column hasn't been pushed
pnpm exec supabase db push          # applies every pending migration to the linked hosted project
pnpm exec supabase migration list   # re-run to confirm local and remote now match
```

The project is already linked (`supabase/.temp/linked-project.json` references the hosted project). `db push` is additive and safe to re-run — already-applied migrations are skipped.

**Always verify after pushing**, don't just trust a clean exit code — see the incident below for why.

## The missing-baseline-grants incident (read this before your next fresh project)

When this project's migrations were first pushed to the hosted Supabase project, `db push` succeeded with no errors — but the live site's `/api/availability` immediately 500'd with `permission denied for table courts`. Investigation:

- The `service_role` API key decoded correctly (`role: service_role`, correct project ref) — not a bad key.
- `service_role` bypasses RLS entirely, so a Postgres `42501 permission denied` for that role can only mean the underlying table-level `GRANT` never existed — RLS was never even reached.
- Testing every table confirmed it: **every single table**, including ones from the very first migration, denied `service_role` outright.

**Root cause**: the hosted project never received the baseline `GRANT`s Supabase's API layer (PostgREST/Realtime) requires for `anon`/`authenticated`/`service_role` — grants that the local Supabase CLI stack sets up automatically on `supabase start`, but which apparently weren't present on this hosted project's history. The only table that worked at all for `anon` was `bookings`, and only because a migration happened to include an *explicit* column-level grant for it — nothing else had ever been reachable via the API.

**The fix** (`supabase/migrations/20260814000500_fix_missing_baseline_grants.sql`):

```sql
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
```

This does **not** bypass RLS — `anon`/`authenticated` still only see what their RLS policies allow (verified: `customers`/`staff_profiles`/`payment_submissions`/`admin_audit_log` all correctly returned empty results for `anon` after this fix, not full data). It only satisfies the table-level privilege check Postgres evaluates *before* RLS. The `ALTER DEFAULT PRIVILEGES` lines mean any *future* migration's new tables inherit these grants automatically, so this can't silently regress again.

**If you ever provision a brand-new Supabase project for this app** (or diagnose a similar 500 after a fresh push), run the same direct-table-query test to check:

```bash
curl "$SUPABASE_URL/rest/v1/courts?select=*&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

A `42501 permission denied` response means this same fix is needed again.

## Deploying the Next.js app (Vercel)

The repo has no `.vercel/` directory (deployed via Vercel's dashboard/GitHub integration, not the Vercel CLI locally) — check Vercel's own dashboard for the project, not this repo, for deploy history/settings.

**Every variable in [environment-variables.md](environment-variables.md) must be set in Vercel's dashboard directly** (Project → Settings → Environment Variables) — this repo's `.env.production` is gitignored and Vercel never reads it. Confirm particularly:
- `NEXT_PUBLIC_SITE_URL` must be `https://primesportsclubhouse.com` — reported set by the project owner directly in Vercel's dashboard. Not independently verified here (doing so would mean triggering a real production confirmation email); the cheap way to confirm is checking the "Check in your group" link's domain the next time a real payment gets approved in production.
- `NEXT_PUBLIC_SUPABASE_URL`/keys must point at the **hosted** project, never the local `56xxx` stack.

## Post-deploy smoke test

After deploying, verify against the live URL directly (not just that the build succeeded):

```bash
curl -o /dev/null -w "%{http_code}\n" https://primesportsclubhouse.com/                    # expect 200
curl "https://primesportsclubhouse.com/api/availability?date=YYYY-MM-DD&sport=pickleball"   # expect real court data, not a 500
curl -o /dev/null -w "%{http_code}\n" https://primesportsclubhouse.com/admin/dashboard       # expect 307 (redirect to /admin, unauthenticated)
```

This exact sequence caught the grants incident above — a build that "succeeds" tells you nothing about whether the deployed app can actually talk to its database.
