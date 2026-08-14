import { NextResponse } from "next/server";

import { channelToDisplayKey } from "@/lib/payments";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

/** Public reference data — replaces the `paymentChannels` array literal in
 *  checkout-client.tsx. Reads through the service-role client the same way
 *  /api/availability does (courts/rate_cards/operating_hours are already
 *  public-read under RLS too); there's nothing guest-specific to check
 *  here. */
export async function GET() {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("payment_channels")
    .select("key, label, account_name, account_number, qr_payload")
    .order("key");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const channels = (data ?? []).map((row) => ({
    key: row.key as string,
    displayKey: channelToDisplayKey(row.key),
    label: row.label as string,
    account: `${row.account_name}\n${row.account_number}`,
    qrPayload: row.qr_payload as string | null,
  }));

  return NextResponse.json({ channels });
}
