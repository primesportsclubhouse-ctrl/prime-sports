# Local Development

## First-time setup

```bash
pnpm install
cp .env.local.example .env.local     # fill in values — see environment-variables.md
pnpm exec supabase start             # starts the local Postgres/Auth/Storage/Realtime stack in Docker
pnpm dev
```

`supabase start` prints an `API_URL`, `ANON_KEY`, etc. — paste the URL/anon key into `.env.local` if you haven't already (they're stable across restarts as long as the project isn't reset with different config).

After any new migration lands (pulled from git, or written locally), run:

```bash
pnpm exec supabase db reset
```

This drops and recreates the local database, reapplies every migration in `supabase/migrations/` in order, and reseeds it (including `supabase/seed.sql`'s local-only admin account — see below).

## Local admin login

`supabase/seed.sql` seeds one local-dev-only staff account with the `admin` role. The password is a randomly generated string committed in that file's comment header and the `v_password` variable — read the file directly for the current value (never reuse it anywhere real; it's local-only). Log in at `/admin`.

## The port-conflict problem (you will likely hit this)

If you run more than one Supabase-CLI-managed project locally, `supabase start` will fail with something like:

```
Bind for 0.0.0.0:54322 failed: port is already allocated
```

Supabase's default local ports (54321–54329) are shared across every project on the CLI's defaults. This project's `supabase/config.toml` has already been remapped to the `56xxx` range (56321 API, 56322 DB, 56323 Studio, 56324 mail testing, 56327 analytics, 56329 pooler, 56320 shadow DB) specifically to coexist with other local projects. If you still hit a conflict:

1. `docker ps` to see what's actually bound to which port.
2. Either stop the conflicting project's stack (`supabase stop` from that project's directory), or remap this project's ports again in `supabase/config.toml` to a free range.
3. **If you change the ports, also update `.env.local`'s `NEXT_PUBLIC_SUPABASE_URL`** to match — these two files must agree, or the app will talk to a stale port.

## Testing checklist

Everything below should work against a freshly reset local database:

- [ ] `pnpm lint` and `pnpm build` both clean (aside from the known pre-existing, unrelated warnings in `facility-showcase.tsx`)
- [ ] Admin login at `/admin` with the seeded account, redirect to `/admin/dashboard`
- [ ] Full booking flow: browse → reserve → checkout → waiver → confirmation
- [ ] Payment submission → admin approve/reject in the verification queue, confirm booking status actually transitions differently for each
- [ ] Receipt upload + OCR reference pre-fill (if `GOOGLE_CLOUD_VISION_API_KEY` is set and billing is enabled)
- [ ] Approve a payment → check `notification_log` for a `sent` email row (and a `skipped` SMS row, if Semaphore is intentionally unconfigured)
- [ ] Staff activates a roster session at `/admin/roster`, then use the "Check in your group" link from the confirmation email to self-check-in as the booker
- [ ] `/api/admin-audit-log` shows entries after approve/reject and roster activate/end

## Known gap in local dev

`components/prime-sports/admin/availability-editor.tsx` (the admin UI for editing rate cards / operating hours) has **no backend wiring at all** — zero `fetch` calls, confirmed by grep. It's a frontend-only surface; editing anything there does not persist. See [roadmap-and-known-gaps.md](../roadmap-and-known-gaps.md).
