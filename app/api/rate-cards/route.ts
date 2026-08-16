import { NextRequest, NextResponse } from "next/server";

import { recordAuditLog } from "@/lib/supabase/audit-log";
import { fetchUniformRates, saveUniformRates, type UniformRates } from "@/lib/supabase/rate-cards";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

/**
 * GET — public, no auth required. Same rationale as /api/payment-channels:
 * court rates are already public marketing information (the homepage
 * pricing cards show them to every visitor), so this reads through the
 * service-role client the same way /api/availability and
 * /api/payment-channels do — there's nothing guest-specific to check here.
 * Replaces the hardcoded `rateWindows` export from lib/prime-sports.ts as
 * the real source of truth for both the marketing pricing cards and the
 * admin rate editor's initial load.
 */
export async function GET() {
  const supabase = createServiceRoleClient();

  try {
    const rates = await fetchUniformRates(supabase);
    return NextResponse.json({ rates });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load rate cards." },
      { status: 500 },
    );
  }
}

type RateTierPayload = {
  daytime?: unknown;
  evening?: unknown;
};

type SaveRatesPayload = {
  weekday?: RateTierPayload;
  weekend?: RateTierPayload;
};

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * PATCH — staff-only, manager/admin tier (matches `rate_cards`'s own
 * `rate_cards_manager_write` RLS policy from the Phase 1 migration — pricing
 * is a manager+ capability per the RBAC model, not a plain-staff one, even
 * though this route goes through the RLS-bypassing service-role client the
 * same way every other staff-mutating route in this app does). Writes the
 * same 4 values to every court's rows (see lib/supabase/rate-cards.ts's
 * `saveUniformRates()` for why) and records an audit log entry on success.
 */
export async function PATCH(request: NextRequest) {
  const staff = await getStaffContext();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 403 });
  }
  if (staff.role !== "manager" && staff.role !== "admin") {
    return NextResponse.json(
      { error: "Only managers and admins can edit pricing." },
      { status: 403 },
    );
  }

  let payload: SaveRatesPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const weekdayDaytime = payload.weekday?.daytime;
  const weekdayEvening = payload.weekday?.evening;
  const weekendDaytime = payload.weekend?.daytime;
  const weekendEvening = payload.weekend?.evening;

  if (
    !isPositiveFiniteNumber(weekdayDaytime) ||
    !isPositiveFiniteNumber(weekdayEvening) ||
    !isPositiveFiniteNumber(weekendDaytime) ||
    !isPositiveFiniteNumber(weekendEvening)
  ) {
    return NextResponse.json(
      {
        error:
          "weekday.daytime, weekday.evening, weekend.daytime, and weekend.evening must all be non-negative numbers.",
      },
      { status: 400 },
    );
  }

  const rates: UniformRates = {
    weekday: { daytime: weekdayDaytime, evening: weekdayEvening },
    weekend: { daytime: weekendDaytime, evening: weekendEvening },
  };

  const supabase = createServiceRoleClient();

  try {
    await saveUniformRates(supabase, rates);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save rate cards." },
      { status: 500 },
    );
  }

  // Best-effort side effect — never blocks the response, see
  // recordAuditLog's own doc comment.
  void recordAuditLog({
    staffId: staff.userId,
    action: "rate_cards.update",
    targetTable: "rate_cards",
    targetId: crypto.randomUUID(),
    payload: rates,
  });

  return NextResponse.json({ rates });
}
