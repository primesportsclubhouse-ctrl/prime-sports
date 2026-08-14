// Shared "is this request coming from a logged-in staff member" check for
// Route Handlers, layered on top of the cookie-based server client (not the
// service-role client — we want RLS-aware auth.getUser(), not a bypass).
//
// NOTE: proxy.ts currently only lets `admin`-role accounts past the
// /admin/* gate at all (staff/manager RBAC isn't wired into the login flow
// yet — see that file's own comments). This helper checks against `is_staff`
// (staff/manager/admin) rather than admin-only, matching the target RBAC
// model in the audit ("staff: verify payments, manage roster") for when
// that login-side gate is widened; today, in practice, only admin accounts
// can reach these routes anyway.

import type { StaffRole } from "@/lib/booking";
import { createClient } from "@/lib/supabase/server";

export type StaffContext = {
  userId: string;
  role: StaffRole;
};

/** Resolves the current request's staff session, if any. Returns `null` for
 *  anonymous visitors and for authenticated-but-non-staff Supabase Auth
 *  users alike — callers only need to branch on "did we get a StaffContext
 *  back", not on why not. */
export async function getStaffContext(): Promise<StaffContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: role, error } = await supabase.rpc("current_staff_role");

  if (error || !role) {
    return null;
  }

  return { userId: user.id, role: role as StaffRole };
}
