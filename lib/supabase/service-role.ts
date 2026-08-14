import { createClient } from "@supabase/supabase-js";

/**
 * Privileged, RLS-bypassing Supabase client for server-only use.
 *
 * Guest checkout has no Supabase Auth session (no customer accounts exist —
 * see AGENTS.md / the auth model notes), but `customers` and `bookings` are
 * staff-only under RLS (see the Phase 1 migration). Guest writes therefore
 * can't go through the anon client at all; they go through this service-role
 * client from inside Route Handlers, which is the "service role / server
 * action" path that migration's RLS comments call out.
 *
 * Never import this from a Client Component or expose
 * `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase service role client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
