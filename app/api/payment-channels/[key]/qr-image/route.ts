import { NextRequest, NextResponse } from "next/server";

import { isValidPaymentChannel, type PaymentChannelKey } from "@/lib/payments";
import { recordAuditLog } from "@/lib/supabase/audit-log";
import { fetchPaymentChannels, PAYMENT_QR_BUCKET } from "@/lib/supabase/payment-channels";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStaffContext } from "@/lib/supabase/staff-auth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function requireManagerOrAdmin(role: string) {
  return role === "manager" || role === "admin";
}

function sanitizeFileName(name: string) {
  const trimmed = name.trim().slice(-80);
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_") || "qr-code";
}

/**
 * POST — staff-only, manager/admin tier. Uploads (or replaces) the real
 * GCash/Maya/bank QR image the business already has for this channel, into
 * the public `payment-qr-codes` Storage bucket (see the
 * payment-channels-QR-image migration) — mirrors /api/uploads/receipt's
 * mechanics but against a public, not private, bucket. Once this succeeds,
 * checkout-client.tsx's next /api/payment-channels fetch picks up the real
 * `qrImageUrl` and qr-code-card.tsx renders it instead of the decorative
 * placeholder.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "QR image must be 5MB or smaller." }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: "QR image must be a PNG, JPEG, or WEBP image." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: existing, error: existingError } = await supabase
    .from("payment_channels")
    .select("qr_image_path")
    .eq("key", key satisfies PaymentChannelKey)
    .maybeSingle();

  if (existingError) {
    console.error("[payment-channels] Failed to look up payment channel before QR upload:", existingError.message);
    return NextResponse.json({ error: "Could not upload this QR image. Please try again." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Payment channel not found." }, { status: 404 });
  }

  const path = `${key}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from(PAYMENT_QR_BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    console.error("[payment-channels] Failed to upload QR image:", uploadError.message);
    return NextResponse.json({ error: "Could not upload this QR image. Please try again." }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("payment_channels")
    .update({ qr_image_path: path })
    .eq("key", key satisfies PaymentChannelKey);

  if (updateError) {
    // Roll back the just-uploaded object rather than leaving an orphan file
    // the DB row doesn't point to.
    await supabase.storage.from(PAYMENT_QR_BUCKET).remove([path]);
    console.error("[payment-channels] Failed to save QR image path:", updateError.message);
    return NextResponse.json({ error: "Could not upload this QR image. Please try again." }, { status: 500 });
  }

  // Best-effort cleanup of the previous image, if any — never fails the
  // request that just successfully replaced it.
  const previousPath = existing.qr_image_path as string | null;
  if (previousPath && previousPath !== path) {
    await supabase.storage.from(PAYMENT_QR_BUCKET).remove([previousPath]);
  }

  void recordAuditLog({
    staffId: staff.userId,
    action: "payment_channels.qr_image.upload",
    targetTable: "payment_channels",
    targetId: key,
    payload: { path },
  });

  try {
    const channels = await fetchPaymentChannels(supabase);
    return NextResponse.json({ channels }, { status: 201 });
  } catch (fetchError) {
    console.error(
      "[payment-channels] Failed to reload payment channels after QR upload:",
      fetchError instanceof Error ? fetchError.message : fetchError,
    );
    return NextResponse.json({ error: "Could not reload payment channels. Please try again." }, { status: 500 });
  }
}

/**
 * DELETE — staff-only, manager/admin tier. Clears a channel's QR image,
 * reverting checkout back to the decorative placeholder render until a new
 * image is uploaded — the same "clear the field" affordance
 * facility-content-editor.tsx already gives media cards via their URL field.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
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

  const supabase = createServiceRoleClient();

  const { data: existing, error: existingError } = await supabase
    .from("payment_channels")
    .select("qr_image_path")
    .eq("key", key satisfies PaymentChannelKey)
    .maybeSingle();

  if (existingError) {
    console.error("[payment-channels] Failed to look up payment channel before QR removal:", existingError.message);
    return NextResponse.json({ error: "Could not remove this QR image. Please try again." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Payment channel not found." }, { status: 404 });
  }

  const previousPath = existing.qr_image_path as string | null;

  const { error: updateError } = await supabase
    .from("payment_channels")
    .update({ qr_image_path: null })
    .eq("key", key satisfies PaymentChannelKey);

  if (updateError) {
    console.error("[payment-channels] Failed to clear QR image path:", updateError.message);
    return NextResponse.json({ error: "Could not remove this QR image. Please try again." }, { status: 500 });
  }

  if (previousPath) {
    await supabase.storage.from(PAYMENT_QR_BUCKET).remove([previousPath]);
  }

  void recordAuditLog({
    staffId: staff.userId,
    action: "payment_channels.qr_image.remove",
    targetTable: "payment_channels",
    targetId: key,
    payload: { removedPath: previousPath },
  });

  try {
    const channels = await fetchPaymentChannels(supabase);
    return NextResponse.json({ channels });
  } catch (fetchError) {
    console.error(
      "[payment-channels] Failed to reload payment channels after QR removal:",
      fetchError instanceof Error ? fetchError.message : fetchError,
    );
    return NextResponse.json({ error: "Could not reload payment channels. Please try again." }, { status: 500 });
  }
}
