import { NextRequest, NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function sanitizeFileName(name: string) {
  const trimmed = name.trim().slice(-80);
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_") || "receipt";
}

/**
 * Uploads a receipt screenshot to the private `receipts` Storage bucket
 * (see the Phase 2 payments migration) and returns the object's path —
 * replaces the old fake-OCR flow's local-only `UploadState` in
 * checkout-client.tsx with an actual stored file. The service-role client
 * does the write server-side (same "guest writes go through a Route
 * Handler, not a direct anon-client call" pattern as /api/bookings) since
 * the bucket has no anon-role storage.objects policy at all.
 */
export async function POST(request: NextRequest) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  const sessionToken = formData.get("sessionToken");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
  }
  if (typeof sessionToken !== "string" || !sessionToken.trim()) {
    return NextResponse.json({ error: "sessionToken is required." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Receipt image must be 10MB or smaller." }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Receipt must be a PNG, JPEG, or WEBP image." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const path = `${sessionToken}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from("receipts").upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  return NextResponse.json({ path }, { status: 201 });
}
