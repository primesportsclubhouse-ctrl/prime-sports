import { NextRequest, NextResponse } from "next/server";

import {
  isFiniteNonNegativeInteger,
  isNonEmptyString,
  isValidFacilityMediaType,
  normalizeNullableString,
} from "@/lib/facility-content";
import { recordAuditLog } from "@/lib/supabase/audit-log";
import { fetchFacilityMedia } from "@/lib/supabase/facility-content";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

type UpdateMediaPayload = {
  slug?: unknown;
  title?: unknown;
  description?: unknown;
  mediaType?: unknown;
  src?: unknown;
  alt?: unknown;
  meta?: unknown;
  sortOrder?: unknown;
};

function requireManagerOrAdmin(role: string) {
  return role === "manager" || role === "admin";
}

/** PATCH — staff-only, manager/admin tier (see /api/facility-media's own
 *  comment on why the route-level check is tighter than the table's
 *  `is_staff()` RLS policy). Partial update — only the fields present in the
 *  body are changed. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const staff = await getStaffContext();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 403 });
  }
  if (!requireManagerOrAdmin(staff.role)) {
    return NextResponse.json(
      { error: "Only managers and admins can edit facility content." },
      { status: 403 },
    );
  }

  let payload: UpdateMediaPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (payload.slug !== undefined) {
    if (!isNonEmptyString(payload.slug)) {
      return NextResponse.json({ error: "slug must be a non-empty string." }, { status: 400 });
    }
    update.slug = payload.slug.trim();
  }
  if (payload.title !== undefined) {
    if (!isNonEmptyString(payload.title)) {
      return NextResponse.json({ error: "title must be a non-empty string." }, { status: 400 });
    }
    update.title = payload.title.trim();
  }
  if (payload.description !== undefined) {
    if (!isNonEmptyString(payload.description)) {
      return NextResponse.json({ error: "description must be a non-empty string." }, { status: 400 });
    }
    update.description = payload.description.trim();
  }
  if (payload.mediaType !== undefined) {
    if (!isValidFacilityMediaType(payload.mediaType)) {
      return NextResponse.json({ error: 'mediaType must be "image" or "video".' }, { status: 400 });
    }
    update.media_type = payload.mediaType;
  }
  if (payload.src !== undefined) {
    update.src = normalizeNullableString(payload.src);
  }
  if (payload.alt !== undefined) {
    update.alt = normalizeNullableString(payload.alt);
  }
  if (payload.meta !== undefined) {
    update.meta = normalizeNullableString(payload.meta);
  }
  if (payload.sortOrder !== undefined) {
    if (!isFiniteNonNegativeInteger(payload.sortOrder)) {
      return NextResponse.json({ error: "sortOrder must be a non-negative integer." }, { status: 400 });
    }
    update.sort_order = payload.sortOrder;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("facility_media")
    .update(update)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    if (status === 409) {
      return NextResponse.json({ error: "Another media card already uses that slug." }, { status });
    }
    console.error("[facility-media] Failed to update media card:", error.message);
    return NextResponse.json({ error: "Could not save this media card. Please try again." }, { status });
  }
  if (!data) {
    return NextResponse.json({ error: "Media card not found." }, { status: 404 });
  }

  void recordAuditLog({
    staffId: staff.userId,
    action: "facility_media.update",
    targetTable: "facility_media",
    targetId: id,
    payload: update,
  });

  try {
    const media = await fetchFacilityMedia(supabase);
    return NextResponse.json({ media });
  } catch (fetchError) {
    console.error(
      "[facility-media] Failed to reload facility media after update:",
      fetchError instanceof Error ? fetchError.message : fetchError,
    );
    return NextResponse.json({ error: "Could not reload facility media. Please try again." }, { status: 500 });
  }
}

/** DELETE — staff-only, manager/admin tier. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const staff = await getStaffContext();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 403 });
  }
  if (!requireManagerOrAdmin(staff.role)) {
    return NextResponse.json(
      { error: "Only managers and admins can edit facility content." },
      { status: 403 },
    );
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("facility_media")
    .delete()
    .eq("id", id)
    .select("id, slug")
    .maybeSingle();

  if (error) {
    console.error("[facility-media] Failed to delete media card:", error.message);
    return NextResponse.json({ error: "Could not delete this media card. Please try again." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Media card not found." }, { status: 404 });
  }

  void recordAuditLog({
    staffId: staff.userId,
    action: "facility_media.delete",
    targetTable: "facility_media",
    targetId: id,
    payload: { slug: data.slug },
  });

  try {
    const media = await fetchFacilityMedia(supabase);
    return NextResponse.json({ media });
  } catch (fetchError) {
    console.error(
      "[facility-media] Failed to reload facility media after delete:",
      fetchError instanceof Error ? fetchError.message : fetchError,
    );
    return NextResponse.json({ error: "Could not reload facility media. Please try again." }, { status: 500 });
  }
}
