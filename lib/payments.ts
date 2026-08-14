// Shared server-side helpers for the payment-submission + waiver-acceptance
// slice: pure validation/mapping only, no Supabase client here — mirrors the
// separation lib/booking.ts already establishes, so route handlers stay the
// only place request-scoped Supabase clients get created.

export type PaymentChannelKey = "gcash" | "maya" | "bank_transfer";
export type PaymentSubmissionStatus = "pending" | "approved" | "rejected";

/** Mirrors payment_submissions.reference_source from the Phase 3 OCR
 *  migration — tracks whether `reference_no` came from the customer typing
 *  it in or from an unedited, confident /api/ocr/receipt extraction. */
export type ReferenceSource = "manual" | "ocr";

const REFERENCE_SOURCES: readonly ReferenceSource[] = ["manual", "ocr"];

export function isValidReferenceSource(value: unknown): value is ReferenceSource {
  return typeof value === "string" && (REFERENCE_SOURCES as readonly string[]).includes(value);
}

const PAYMENT_CHANNEL_KEYS: readonly PaymentChannelKey[] = ["gcash", "maya", "bank_transfer"];

export function isValidPaymentChannel(value: unknown): value is PaymentChannelKey {
  return typeof value === "string" && (PAYMENT_CHANNEL_KEYS as readonly string[]).includes(value);
}

/** checkout-client.tsx's payment channel tabs use the display key ("GCash",
 *  "Maya", "Bank Transfer") the payment_channels seed's `label`/UI used to
 *  hardcode — this maps that display key to the `payment_channel_key` enum
 *  value actually stored in Postgres. */
export function displayKeyToChannel(displayKey: unknown): PaymentChannelKey | null {
  if (typeof displayKey !== "string") {
    return null;
  }

  switch (displayKey) {
    case "GCash":
      return "gcash";
    case "Maya":
      return "maya";
    case "Bank Transfer":
      return "bank_transfer";
    default:
      return null;
  }
}

export function channelToDisplayKey(channel: PaymentChannelKey): string {
  switch (channel) {
    case "gcash":
      return "GCash";
    case "maya":
      return "Maya";
    case "bank_transfer":
      return "Bank Transfer";
  }
}

export type PaymentSubmissionQueueItem = {
  id: string;
  bookingId: string;
  customerName: string;
  reference: string;
  courtName: string;
  bookingDate: string;
  timeSlot: string;
  amountPhp: number;
  channel: PaymentChannelKey;
  submittedAt: string;
  phone: string;
  email: string;
  notes: string | null;
  receiptImageUrl: string | null;
  status: PaymentSubmissionStatus;
  referenceSource: ReferenceSource;
};
