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

/**
 * GET — public, no auth required. Facility photos/videos are already public
 * marketing content (the homepage gallery shows them to every visitor), so
 * this reads through the service-role client the same way /api/rate-cards
 * and /api/payment-channels do for their own public reads — there's nothing
 * guest-specific to check here. Replaces the hardcoded `facilityCards` array
 * literal in facility-showcase.tsx as the real source of truth for both the
 * homepage gallery and the admin content editor's initial load.
 */
export async function GET() {
  const supabase = createServiceRoleClient();

  try {
    const media = await fetchFacilityMedia(supabase);
    return NextResponse.json({ media });
  } catch (error) {
    console.error("[facility-media] Failed to load facility media:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not load facility media. Please try again." }, { status: 500 });
  }
}

type CreateMediaPayload = {
  slug?: unknown;
  title?: unknown;
  description?: unknown;
  mediaType?: unknown;
  src?: unknown;
  alt?: unknown;
  meta?: unknown;
  sortOrder?: unknown;
};

/**
 * POST — staff-only, manager/admin tier (content editing is a manager+
 * capability per the RBAC model — see AGENTS.md's auth-model notes — even
 * though `facility_media`'s own RLS policy is the broader `is_staff()`, per
 * this slice's explicit instructions; the route-level check here is the
 * tighter of the two gates). Creates a new gallery card row.
 */
export async function POST(request: NextRequest) {
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

  let payload: CreateMediaPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { slug, title, description, mediaType, src, alt, meta, sortOrder } = payload;

  if (!isNonEmptyString(slug) || !isNonEmptyString(title) || !isNonEmptyString(description)) {
    return NextResponse.json({ error: "slug, title, and description are required." }, { status: 400 });
  }

  const resolvedMediaType = mediaType === undefined ? "image" : mediaType;
  if (!isValidFacilityMediaType(resolvedMediaType)) {
    return NextResponse.json({ error: 'mediaType must be "image" or "video".' }, { status: 400 });
  }

  if (sortOrder !== undefined && !isFiniteNonNegativeInteger(sortOrder)) {
    return NextResponse.json({ error: "sortOrder must be a non-negative integer." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("facility_media")
    .insert({
      slug: slug.trim(),
      title: title.trim(),
      description: description.trim(),
      media_type: resolvedMediaType,
      src: normalizeNullableString(src),
      alt: normalizeNullableString(alt),
      meta: normalizeNullableString(meta),
      sort_order: sortOrder ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    if (status === 409) {
      return NextResponse.json({ error: `A media card with slug "${slug}" already exists.` }, { status });
    }
    console.error("[facility-media] Failed to create media card:", error.message);
    return NextResponse.json({ error: "Could not save this media card. Please try again." }, { status });
  }

  void recordAuditLog({
    staffId: staff.userId,
    action: "facility_media.create",
    targetTable: "facility_media",
    targetId: data.id,
    payload: { slug, title },
  });

  try {
    const media = await fetchFacilityMedia(supabase);
    return NextResponse.json({ media }, { status: 201 });
  } catch (fetchError) {
    console.error(
      "[facility-media] Failed to reload facility media after create:",
      fetchError instanceof Error ? fetchError.message : fetchError,
    );
    return NextResponse.json({ error: "Could not reload facility media. Please try again." }, { status: 500 });
  }
}
