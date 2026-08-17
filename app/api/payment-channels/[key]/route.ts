import { NextRequest, NextResponse } from "next/server";

import { isValidPaymentChannel, type PaymentChannelKey } from "@/lib/payments";
import { recordAuditLog } from "@/lib/supabase/audit-log";
import { fetchPaymentChannels } from "@/lib/supabase/payment-channels";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function requireManagerOrAdmin(role: string) {
  return role === "manager" || role === "admin";
}

type UpdatePayload = {
  label?: unknown;
  accountName?: unknown;
  accountNumber?: unknown;
};

/**
 * PATCH — staff-only, manager/admin tier (same content-editing tier as
 * /api/facility-media and /api/facility-settings). Edits an *existing*
 * channel's label/account details — `key` itself is the fixed enum value in
 * the URL and is never changed by this route (see the
 * payment-channels-QR-image migration's own comment on why the 3 channels
 * stay a closed set in this slice).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  if (!isValidPaymentChannel(key)) {
    return NextResponse.json({ error: "key must be one of: gcash, maya, bank_transfer." }, { status: 400 });
  }

  const staff = await getStaffContext();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 403 });
  }
  if (!requireManagerOrAdmin(staff.role)) {
    return NextResponse.json({ error: "Only managers and admins can edit payment channels." }, { status: 403 });
  }

  let payload: UpdatePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (payload.label !== undefined) {
    if (!isNonEmptyString(payload.label)) {
      return NextResponse.json({ error: "label must be a non-empty string." }, { status: 400 });
    }
    update.label = payload.label.trim();
  }
  if (payload.accountName !== undefined) {
    if (!isNonEmptyString(payload.accountName)) {
      return NextResponse.json({ error: "accountName must be a non-empty string." }, { status: 400 });
    }
    update.account_name = payload.accountName.trim();
  }
  if (payload.accountNumber !== undefined) {
    if (!isNonEmptyString(payload.accountNumber)) {
      return NextResponse.json({ error: "accountNumber must be a non-empty string." }, { status: 400 });
    }
    update.account_number = payload.accountNumber.trim();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("payment_channels")
    .update(update)
    .eq("key", key satisfies PaymentChannelKey)
    .select("key")
    .maybeSingle();

  if (error) {
    console.error("[payment-channels] Failed to update payment channel:", error.message);
    return NextResponse.json({ error: "Could not save this payment channel. Please try again." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Payment channel not found." }, { status: 404 });
  }

  void recordAuditLog({
    staffId: staff.userId,
    action: "payment_channels.update",
    targetTable: "payment_channels",
    targetId: key,
    payload: update,
  });

  try {
    const channels = await fetchPaymentChannels(supabase);
    return NextResponse.json({ channels });
  } catch (fetchError) {
    console.error(
      "[payment-channels] Failed to reload payment channels after update:",
      fetchError instanceof Error ? fetchError.message : fetchError,
    );
    return NextResponse.json({ error: "Could not reload payment channels. Please try again." }, { status: 500 });
  }
}
