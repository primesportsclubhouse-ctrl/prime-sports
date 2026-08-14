import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session for a given request/response pair.
 *
 * This mirrors `lib/supabase/server.ts`, but is shaped for `proxy.ts`
 * (Next's renamed `middleware.ts` convention — see
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`)
 * where cookies live on `NextRequest`/`NextResponse` rather than the async
 * `cookies()` API from `next/headers`.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // `getUser()` (not `getSession()`) revalidates the token against Supabase
  // Auth on every call, which is what we want before granting access to a
  // protected route.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, supabaseResponse, user };
}
