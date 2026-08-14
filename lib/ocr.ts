// Pure text-extraction heuristic for pulling a Prime Sports reference number
// out of Google Cloud Vision's TEXT_DETECTION output. No Supabase/Vision
// network calls live here — see app/api/ocr/receipt/route.ts for the actual
// request/response plumbing — this file stays pure (deterministic, no I/O)
// so the extraction logic can be reasoned about in isolation, mirroring the
// lib/booking.ts / lib/payments.ts split already established for this app.

export type OcrExtractionResult = {
  reference: string | null;
  /**
   * true only when exactly one distinct PRS-XXXXXX-shaped token was found in
   * the detected text — the frontend only auto-fills the reference field
   * when this is true; an unconfident/ambiguous result is treated the same
   * as "nothing found" and manual entry stays untouched.
   */
  confident: boolean;
};

/**
 * Heuristic, documented since receipt formats vary wildly:
 *
 * Prime Sports references are always shaped "PRS-" followed by 6
 * alphanumeric characters (see the `PRS-XXXXXX` placeholder on the
 * Transaction Reference field in checkout-client.tsx). This pattern is
 * deliberately narrow rather than an attempt to parse every payment app's
 * own transaction-ID format — GCash's "Ref No.", Maya's transaction IDs, and
 * bank transfer memo lines all use different, provider-specific shapes that
 * would each need their own bespoke heuristic (and real sample receipts to
 * validate against, which weren't available for this slice). Matching only
 * the club's own reference format keeps false-positive risk low: we would
 * rather leave the field blank for manual entry than confidently pre-fill
 * the wrong number.
 *
 * Tolerates common OCR noise between "PRS" and the code — Vision's line
 * breaking / kerning frequently drops, duplicates, or substitutes the
 * separator character, so a run of whitespace, a hyphen, or nothing at all
 * are all accepted (`PRS-1A2B3C`, `PRS 1A2B3C`, `PRS1A2B3C`).
 */
const REFERENCE_PATTERN = /PRS[\s-]?([A-Z0-9]{6})\b/gi;

export function extractReferenceNumber(rawText: string): OcrExtractionResult {
  if (!rawText) {
    return { reference: null, confident: false };
  }

  const matches = new Set<string>();
  for (const match of rawText.matchAll(REFERENCE_PATTERN)) {
    matches.add(`PRS-${match[1].toUpperCase()}`);
  }

  if (matches.size === 0) {
    return { reference: null, confident: false };
  }

  const candidates = [...matches];

  if (candidates.length > 1) {
    // Ambiguous — more than one distinct PRS-XXXXXX-shaped token was found
    // (e.g. the image also shows an earlier booking's reference). Surface
    // the first as a low-confidence hint, but don't ask the caller to
    // auto-fill something we can't be sure is the right one.
    return { reference: candidates[0], confident: false };
  }

  return { reference: candidates[0], confident: true };
}
