import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

/**
 * GET — staff-only count of `payment_submissions` still `pending`, backing
 * the sidebar's Verification Queue badge (admin-sidebar.tsx). Deliberately
 * separate from `GET /api/payment-submissions` (which does a full join +
 * per-row signed receipt URL generation) — the sidebar renders on every
 * admin page and just needs a number, not the queue payload.
 */
export async function GET() {
  const staff = await getStaffContext();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const { count, error } = await supabase
    .from("payment_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
