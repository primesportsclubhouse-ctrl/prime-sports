// Supabase-touching helpers for `payment_channels` (real GCash/Maya/bank QR
// images + account details) — shared by the public GET /api/payment-channels
// route, the manager/admin-only edit route
// (/api/payment-channels/[key]), and the QR image upload/remove route
// (/api/payment-channels/[key]/qr-image), so none of them hold a second copy
// of this read/mapping logic. Mirrors the lib/supabase/facility-content.ts
// split (pure Supabase I/O here, types/validation in lib/payments.ts).

import { channelToDisplayKey, type PaymentChannelKey, type PaymentChannelRecord } from "@/lib/payments";
import type { createServiceRoleClient } from "@/lib/supabase/service-role";

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

export const PAYMENT_QR_BUCKET = "payment-qr-codes";

/** Reads every payment channel row, resolving each `qr_image_path` (if any)
 *  to a public Storage URL. The bucket is public (see the
 *  payment-channels-QR-image migration), so this is a plain
 *  `getPublicUrl()` — unlike receipts, no signed-URL round trip is needed. */
export async function fetchPaymentChannels(supabase: ServiceRoleClient): Promise<PaymentChannelRecord[]> {
  const { data, error } = await supabase
    .from("payment_channels")
    .select("key, label, account_name, account_number, qr_payload, qr_image_path")
    .order("key");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const key = row.key as PaymentChannelKey;
    const qrImagePath = row.qr_image_path as string | null;

    return {
      key,
      displayKey: channelToDisplayKey(key),
      label: row.label as string,
      accountName: row.account_name as string,
      accountNumber: row.account_number as string,
      qrPayload: row.qr_payload as string | null,
      qrImagePath,
      qrImageUrl: qrImagePath
        ? supabase.storage.from(PAYMENT_QR_BUCKET).getPublicUrl(qrImagePath).data.publicUrl
        : null,
    } satisfies PaymentChannelRecord;
  });
}
