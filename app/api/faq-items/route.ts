import { NextRequest, NextResponse } from "next/server";

import { isFiniteNonNegativeInteger, isNonEmptyString, normalizeNullableString } from "@/lib/facility-content";
import { recordAuditLog } from "@/lib/supabase/audit-log";
import { fetchFaqItems } from "@/lib/supabase/facility-content";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

/**
 * GET — public, no auth required. Same rationale as /api/facility-media:
 * FAQ copy is already public marketing content, so this reads through the
 * service-role client with nothing guest-specific to check. Replaces the
 * hardcoded `faqItems` array literal in app/(public)/page.tsx.
 */
export async function GET() {
  const supabase = createServiceRoleClient();

  try {
    const faq = await fetchFaqItems(supabase);
    return NextResponse.json({ faq });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load FAQ items." },
      { status: 500 },
    );
  }
}

type CreateFaqPayload = {
  question?: unknown;
  answer?: unknown;
  category?: unknown;
  sortOrder?: unknown;
};

/** POST — staff-only, manager/admin tier (same content-editing tier as
 *  /api/facility-media — see that route's own comment on the RLS vs.
 *  route-level check split). Creates a new FAQ row. */
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

  let payload: CreateFaqPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { question, answer, category, sortOrder } = payload;

  if (!isNonEmptyString(question) || !isNonEmptyString(answer)) {
    return NextResponse.json({ error: "question and answer are required." }, { status: 400 });
  }
  if (sortOrder !== undefined && !isFiniteNonNegativeInteger(sortOrder)) {
    return NextResponse.json({ error: "sortOrder must be a non-negative integer." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("faq_items")
    .insert({
      question: question.trim(),
      answer: answer.trim(),
      category: normalizeNullableString(category),
      sort_order: sortOrder ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void recordAuditLog({
    staffId: staff.userId,
    action: "faq_items.create",
    targetTable: "faq_items",
    targetId: data.id,
    payload: { question },
  });

  try {
    const faq = await fetchFaqItems(supabase);
    return NextResponse.json({ faq }, { status: 201 });
  } catch (fetchError) {
    return NextResponse.json(
      { error: fetchError instanceof Error ? fetchError.message : "Failed to reload FAQ items." },
      { status: 500 },
    );
  }
}
