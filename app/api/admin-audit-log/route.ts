import { NextRequest, NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

/**
 * GET — staff-only, paginated read of `admin_audit_log` (see the Phase 3
 * audit-log migration). No UI consumer yet in this slice — this exists so the
 * log recorded by lib/supabase/audit-log.ts's recordAuditLog() is actually
 * queryable, not a write-only table.
 *
 * Query params:
 *   - limit  (default 50, max 200)
 *   - offset (default 0)
 *   - action       — exact match filter, e.g. "payment_submission.approve"
 *   - targetTable  — exact match filter, e.g. "roster_sessions"
 *   - staffId      — exact match filter (a specific staff member's actions)
 *
 * Ordered newest-first (created_at desc), matching every other admin ledger
 * view in this app (verification queue, roster history).
 */
export async function GET(request: NextRequest) {
  const staff = await getStaffContext();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;

  const limit = parsePositiveInt(params.get("limit"), DEFAULT_LIMIT, MAX_LIMIT);
  const offsetParam = params.get("offset");
  const offset = offsetParam ? Number.parseInt(offsetParam, 10) : 0;
  if (!Number.isFinite(offset) || offset < 0) {
    return NextResponse.json({ error: "offset must be a non-negative integer." }, { status: 400 });
  }

  const action = params.get("action");
  const targetTable = params.get("targetTable");
  const staffId = params.get("staffId");

  const supabase = createServiceRoleClient();

  let query = supabase
    .from("admin_audit_log")
    .select("id, staff_id, action, target_table, target_id, payload_json, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) {
    query = query.eq("action", action);
  }
  if (targetTable) {
    query = query.eq("target_table", targetTable);
  }
  if (staffId) {
    query = query.eq("staff_id", staffId);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries = (data ?? []).map((row) => ({
    id: row.id,
    staffId: row.staff_id,
    action: row.action,
    targetTable: row.target_table,
    targetId: row.target_id,
    payload: row.payload_json,
    createdAt: row.created_at,
  }));

  return NextResponse.json({
    entries,
    pagination: {
      limit,
      offset,
      total: count ?? entries.length,
    },
  });
}
