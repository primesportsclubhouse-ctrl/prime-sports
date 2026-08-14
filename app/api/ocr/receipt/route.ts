import { NextRequest, NextResponse } from "next/server";

import { extractReferenceNumber } from "@/lib/ocr";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

// Simple REST "API key" auth mode for Cloud Vision — needs zero client-library
// setup (no service-account JSON, no google-auth-library dependency), which
// fits this single-endpoint, single-feature (TEXT_DETECTION) use case. To get
// a value for local/hosted `.env.local`:
//   1. In Google Cloud Console, select/create a project.
//   2. APIs & Services > Library > enable "Cloud Vision API".
//   3. APIs & Services > Credentials > Create Credentials > API key.
//   4. (Recommended) Restrict the key to the Cloud Vision API only.
// See .env.local.example for the same instructions next to the var.
const ENV_VAR_NAME = "GOOGLE_CLOUD_VISION_API_KEY";
const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";
const RECEIPTS_BUCKET = "receipts";

type OcrRequestPayload = {
  sessionToken?: unknown;
  receiptPath?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

type VisionAnnotateResponse = {
  responses?: Array<{
    fullTextAnnotation?: { text?: string };
    textAnnotations?: Array<{ description?: string }>;
    error?: { message?: string };
  }>;
};

/**
 * Real Google Cloud Vision TEXT_DETECTION integration for receipt reference
 * extraction — replaces nothing that still exists in checkout-client.tsx
 * (Phase 2 already removed the fake setTimeout OCR simulation; the reference
 * field has been manual-entry-only until this route). This is additive: on
 * any non-2xx or low-confidence result, the frontend leaves manual entry
 * exactly as it already works.
 *
 * Input is the Storage *path* already returned by POST /api/uploads/receipt
 * (not a URL) — the `receipts` bucket is private (see the Phase 2 payments
 * migration), so this handler downloads the bytes itself with the
 * service-role client and sends them to Vision as inline base64 content
 * (`image.content`), rather than relying on Vision being able to fetch a
 * signed URL over the network (which Vision's docs only document for GCS
 * URIs / publicly-hosted images, not arbitrary short-lived signed URLs).
 */
export async function POST(request: NextRequest) {
  let payload: OcrRequestPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { sessionToken, receiptPath } = payload;

  if (!isNonEmptyString(sessionToken)) {
    return NextResponse.json({ error: "sessionToken is required." }, { status: 400 });
  }
  if (!isNonEmptyString(receiptPath)) {
    return NextResponse.json({ error: "receiptPath is required." }, { status: 400 });
  }
  // /api/uploads/receipt writes every file under `${sessionToken}/...` —
  // same ownership proof shape as verifySlotHoldOwnership() elsewhere in the
  // checkout flow, just scoped to the upload path instead of a slot_holds row
  // (a receipt isn't tied to one specific booking until submission time).
  if (!receiptPath.startsWith(`${sessionToken}/`)) {
    return NextResponse.json({ error: "Not authorized to read this receipt." }, { status: 403 });
  }

  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

  // Honest "not configured" response — never a fake/simulated extraction and
  // never a silent no-op that looks like success. Distinct 501 status plus
  // an explicit `ocrAvailable: false` shape so the frontend can tell "not
  // configured" apart from "configured but found nothing" (200) or
  // "configured but the call failed" (502).
  if (!apiKey) {
    return NextResponse.json(
      {
        ocrAvailable: false,
        reference: null,
        confident: false,
        reason: `OCR is not configured — set ${ENV_VAR_NAME} to enable receipt reference extraction (see .env.local.example).`,
      },
      { status: 501 },
    );
  }

  const supabase = createServiceRoleClient();

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .download(receiptPath);

  if (downloadError || !fileBlob) {
    return NextResponse.json(
      { error: downloadError?.message ?? "Receipt image not found in storage." },
      { status: 404 },
    );
  }

  const base64Content = Buffer.from(await fileBlob.arrayBuffer()).toString("base64");

  let visionJson: VisionAnnotateResponse;

  try {
    const visionResponse = await fetch(`${VISION_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Content },
            features: [{ type: "TEXT_DETECTION" }],
          },
        ],
      }),
    });

    visionJson = (await visionResponse.json()) as VisionAnnotateResponse;

    if (!visionResponse.ok) {
      const message = visionJson.responses?.[0]?.error?.message ?? `Vision API responded with ${visionResponse.status}.`;
      return NextResponse.json({ ocrAvailable: true, error: message }, { status: 502 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        ocrAvailable: true,
        error: error instanceof Error ? error.message : "Vision API request failed.",
      },
      { status: 502 },
    );
  }

  const visionError = visionJson.responses?.[0]?.error?.message;
  if (visionError) {
    return NextResponse.json({ ocrAvailable: true, error: visionError }, { status: 502 });
  }

  const detectedText =
    visionJson.responses?.[0]?.fullTextAnnotation?.text ??
    visionJson.responses?.[0]?.textAnnotations?.[0]?.description ??
    "";

  const { reference, confident } = extractReferenceNumber(detectedText);

  return NextResponse.json({ ocrAvailable: true, reference, confident });
}
