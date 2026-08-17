import { NextRequest, NextResponse } from "next/server";

import { normalizeNullableString } from "@/lib/facility-content";
import { recordAuditLog } from "@/lib/supabase/audit-log";
import { fetchFacilitySettings, saveFacilitySettings } from "@/lib/supabase/facility-content";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

/**
 * GET — public, no auth required. Address/hours/contact info is already
 * public marketing content (site-footer.tsx and location-panel.tsx show it
 * to every visitor), so this reads through the service-role client the same
 * way /api/rate-cards does. Replaces the hardcoded `details` array in
 * location-panel.tsx and the literal `[Contact]` placeholders in
 * site-footer.tsx.
 */
export async function GET() {
  const supabase = createServiceRoleClient();

  try {
    const settings = await fetchFacilitySettings(supabase);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[facility-settings] Failed to load facility settings:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not load facility settings. Please try again." }, { status: 500 });
  }
}

type SettingsPayload = {
  addressLine?: unknown;
  addressArea?: unknown;
  hoursValue?: unknown;
  hoursNote?: unknown;
  parkingSlots?: unknown;
  parkingNote?: unknown;
  landmarkNote?: unknown;
  contactPhone?: unknown;
  contactEmail?: unknown;
};

function isNullableFiniteInteger(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isInteger(value) && value >= 0);
}

/**
 * PATCH — staff-only, manager/admin tier (same content-editing tier as
 * /api/facility-media — see that route's own comment on the RLS
 * (`is_staff()`) vs. route-level (manager/admin) check split). Upserts the
 * singleton row so a missing seed row can't block the very first edit.
 */
export async function PATCH(request: NextRequest) {
  const staff = await getStaffContext();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 403 });
  }
  if (staff.role !== "manager" && staff.role !== "admin") {
    return NextResponse.json(
      { error: "Only managers and admins can edit facility content." },
      { status: 403 },
    );
  }

  let payload: SettingsPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (payload.parkingSlots !== undefined && !isNullableFiniteInteger(payload.parkingSlots)) {
    return NextResponse.json(
      { error: "parkingSlots must be a non-negative integer or null." },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();

  let current;
  try {
    current = await fetchFacilitySettings(supabase);
  } catch (error) {
    console.error(
      "[facility-settings] Failed to load current facility settings before merge:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Could not load current facility settings. Please try again." }, { status: 500 });
  }

  const next = {
    addressLine: typeof payload.addressLine === "string" ? payload.addressLine.trim() : current.addressLine,
    addressArea: typeof payload.addressArea === "string" ? payload.addressArea.trim() : current.addressArea,
    hoursValue: typeof payload.hoursValue === "string" ? payload.hoursValue.trim() : current.hoursValue,
    hoursNote: typeof payload.hoursNote === "string" ? payload.hoursNote.trim() : current.hoursNote,
    parkingSlots:
      payload.parkingSlots !== undefined ? (payload.parkingSlots as number | null) : current.parkingSlots,
    parkingNote:
      payload.parkingNote !== undefined ? normalizeNullableString(payload.parkingNote) : current.parkingNote,
    landmarkNote:
      payload.landmarkNote !== undefined ? normalizeNullableString(payload.landmarkNote) : current.landmarkNote,
    contactPhone:
      payload.contactPhone !== undefined ? normalizeNullableString(payload.contactPhone) : current.contactPhone,
    contactEmail:
      payload.contactEmail !== undefined ? normalizeNullableString(payload.contactEmail) : current.contactEmail,
  };

  try {
    const settings = await saveFacilitySettings(supabase, next);

    void recordAuditLog({
      staffId: staff.userId,
      action: "facility_settings.update",
      targetTable: "facility_settings",
      targetId: crypto.randomUUID(),
      payload: next,
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[facility-settings] Failed to save facility settings:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not save facility settings. Please try again." }, { status: 500 });
  }
}
