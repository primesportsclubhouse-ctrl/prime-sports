// Pure text-extraction heuristic for pulling a payment reference number out
// of Google Cloud Vision's TEXT_DETECTION output. No Supabase/Vision network
// calls live here — see app/api/ocr/receipt/route.ts for the actual
// request/response plumbing — this file stays pure (deterministic, no I/O)
// so the extraction logic can be reasoned about in isolation, mirroring the
// lib/booking.ts / lib/payments.ts split already established for this app.

export type OcrExtractionResult = {
  reference: string | null;
  /**
   * true only when exactly one distinct candidate was found in the detected
   * text — the frontend only auto-fills the reference field when this is
   * true; an unconfident/ambiguous result is treated the same as "nothing
   * found" and manual entry stays untouched.
   */
  confident: boolean;
};

/**
 * Prime Sports' own internal booking-reference shape ("PRS-" + 6
 * alphanumeric characters). Checked first since it's a fixed, distinctive
 * pattern with near-zero false-positive risk — but note real GCash/Maya/bank
 * receipts never contain this text (nothing in the booking flow asks a
 * customer to write it as their payment memo), so in practice this branch
 * essentially never matches a genuine customer-uploaded receipt. It's kept
 * for the one legitimate case where it would: a customer typed it into a
 * bank transfer's memo field on their own.
 *
 * Tolerates common OCR noise between "PRS" and the code — Vision's line
 * breaking / kerning frequently drops, duplicates, or substitutes the
 * separator character, so a run of whitespace, a hyphen, or nothing at all
 * are all accepted (`PRS-1A2B3C`, `PRS 1A2B3C`, `PRS1A2B3C`).
 */
const PRS_REFERENCE_PATTERN = /PRS[\s-]?([A-Z0-9]{6})\b/gi;

/**
 * What a real payment receipt actually shows: the payment app's own
 * transaction reference, introduced by a label — GCash/Maya's "Ref No.",
 * bank apps' "Trace No.", "Transaction ID", etc. — followed by a run of
 * digits (often grouped with spaces or dashes for readability, e.g.
 * "1234 5678 9012"). Deliberately numeric-only (rather than matching any
 * alphanumeric token after the label): these providers' reference numbers
 * are numeric in practice, and staying numeric-only avoids false-positive
 * matches on stray words near a label (e.g. "Refund" elsewhere on the
 * image) that a looser alphanumeric match would risk. As documented before,
 * this is a heuristic without real sample receipts to validate every
 * provider's exact layout against — kept deliberately conservative since an
 * incorrect auto-fill the customer doesn't notice is worse than none.
 */
const LABELED_REFERENCE_PATTERN =
  /\b(?:ref(?:erence)?\.?\s*(?:no\.?|number|#)|trace\s*(?:no\.?|number)|txn\.?\s*(?:id|no\.?)|transaction\s*(?:id|no\.?|number))\s*[:.\-]?\s*(\d[\d\s-]{5,22}\d)/gi;

function normalizeDigitToken(raw: string) {
  return raw.replace(/[\s-]+/g, "");
}

/** Picks the single unambiguous match out of a set of candidates found by
 *  one pattern — more than one distinct match is ambiguous (e.g. the image
 *  also shows an unrelated earlier reference), so it's surfaced as a
 *  low-confidence hint rather than something to auto-fill. */
function resolveCandidates(candidates: Set<string>): OcrExtractionResult | null {
  if (candidates.size === 0) {
    return null;
  }

  const values = [...candidates];
  if (values.length > 1) {
    return { reference: values[0], confident: false };
  }

  return { reference: values[0], confident: true };
}

export function extractReferenceNumber(rawText: string): OcrExtractionResult {
  if (!rawText) {
    return { reference: null, confident: false };
  }

  const prsMatches = new Set<string>();
  for (const match of rawText.matchAll(PRS_REFERENCE_PATTERN)) {
    prsMatches.add(`PRS-${match[1].toUpperCase()}`);
  }

  const prsResult = resolveCandidates(prsMatches);
  if (prsResult) {
    return prsResult;
  }

  const labeledMatches = new Set<string>();
  for (const match of rawText.matchAll(LABELED_REFERENCE_PATTERN)) {
    const candidate = normalizeDigitToken(match[1]);
    // 6–20 digits covers everything from a short bank trace number to a
    // full 16-digit transaction ID; outside that range is more likely a
    // mis-scoped match (a date, an amount) than a real reference.
    if (candidate.length >= 6 && candidate.length <= 20) {
      labeledMatches.add(candidate);
    }
  }

  const labeledResult = resolveCandidates(labeledMatches);
  if (labeledResult) {
    return labeledResult;
  }

  return { reference: null, confident: false };
}
