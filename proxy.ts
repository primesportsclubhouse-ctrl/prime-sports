import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// NOTE: Next 16 deprecated `middleware.ts` in favor of `proxy.ts` (the
// exported function is renamed `proxy`, not `middleware`) — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
// This file is the direct replacement for what the roadmap calls
// "middleware.ts"; the route-gating behavior is identical.

const LOGIN_PATH = "/admin";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, supabaseResponse, user } = await updateSession(request);

  const isAdminRoute = pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);
  const isLoginPage = pathname === LOGIN_PATH;

  if (!isAdminRoute) {
    return supabaseResponse;
  }

  // Role is authoritative in the database, not just "is there a session" —
  // reuse the `current_staff_role()` helper from the Phase 1 migration
  // rather than re-deriving role logic here. Staff/manager RBAC grants
  // aren't scoped yet, so for now only `admin`-role accounts pass the gate;
  // widen this once staff/manager permissions are actually defined.
  let isAdmin = false;

  if (user) {
    try {
      const { data, error } = await supabase.rpc("current_staff_role");
      isAdmin = !error && data === "admin";
    } catch {
      isAdmin = false;
    }
  }

  if (isLoginPage) {
    // Already-authenticated admins shouldn't see the login form again.
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return supabaseResponse;
  }

  if (!isAdmin) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
