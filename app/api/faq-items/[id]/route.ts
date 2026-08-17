import { NextRequest, NextResponse } from "next/server";

import { isFiniteNonNegativeInteger, isNonEmptyString, normalizeNullableString } from "@/lib/facility-content";
import { recordAuditLog } from "@/lib/supabase/audit-log";
import { fetchFaqItems } from "@/lib/supabase/facility-content";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

type UpdateFaqPayload = {
  question?: unknown;
  answer?: unknown;
  category?: unknown;
  sortOrder?: unknown;
};

function requireManagerOrAdmin(role: string) {
  return role === "manager" || role === "admin";
}

/** PATCH — staff-only, manager/admin tier. Partial update. */
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

  let payload: UpdateFaqPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (payload.question !== undefined) {
    if (!isNonEmptyString(payload.question)) {
      return NextResponse.json({ error: "question must be a non-empty string." }, { status: 400 });
    }
    update.question = payload.question.trim();
  }
  if (payload.answer !== undefined) {
    if (!isNonEmptyString(payload.answer)) {
      return NextResponse.json({ error: "answer must be a non-empty string." }, { status: 400 });
    }
    update.answer = payload.answer.trim();
  }
  if (payload.category !== undefined) {
    update.category = normalizeNullableString(payload.category);
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
    .from("faq_items")
    .update(update)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[faq-items] Failed to update FAQ item:", error.message);
    return NextResponse.json({ error: "Could not save this FAQ item. Please try again." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "FAQ item not found." }, { status: 404 });
  }

  void recordAuditLog({
    staffId: staff.userId,
    action: "faq_items.update",
    targetTable: "faq_items",
    targetId: id,
    payload: update,
  });

  try {
    const faq = await fetchFaqItems(supabase);
    return NextResponse.json({ faq });
  } catch (fetchError) {
    console.error(
      "[faq-items] Failed to reload FAQ items after update:",
      fetchError instanceof Error ? fetchError.message : fetchError,
    );
    return NextResponse.json({ error: "Could not reload FAQ items. Please try again." }, { status: 500 });
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
    .from("faq_items")
    .delete()
    .eq("id", id)
    .select("id, question")
    .maybeSingle();

  if (error) {
    console.error("[faq-items] Failed to delete FAQ item:", error.message);
    return NextResponse.json({ error: "Could not delete this FAQ item. Please try again." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "FAQ item not found." }, { status: 404 });
  }

  void recordAuditLog({
    staffId: staff.userId,
    action: "faq_items.delete",
    targetTable: "faq_items",
    targetId: id,
    payload: { question: data.question },
  });

  try {
    const faq = await fetchFaqItems(supabase);
    return NextResponse.json({ faq });
  } catch (fetchError) {
    console.error(
      "[faq-items] Failed to reload FAQ items after delete:",
      fetchError instanceof Error ? fetchError.message : fetchError,
    );
    return NextResponse.json({ error: "Could not reload FAQ items. Please try again." }, { status: 500 });
  }
}
