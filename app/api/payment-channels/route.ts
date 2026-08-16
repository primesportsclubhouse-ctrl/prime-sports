import { NextResponse } from "next/server";

import { fetchPaymentChannels } from "@/lib/supabase/payment-channels";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

/** Public reference data — replaces the `paymentChannels` array literal in
 *  checkout-client.tsx. Reads through the service-role client the same way
 *  /api/availability does (courts/rate_cards/operating_hours are already
 *  public-read under RLS too); there's nothing guest-specific to check
 *  here. Also doubles as the admin content editor's "Payment Channels" tab
 *  read (same GET-serves-both-public-and-admin shape as
 *  /api/facility-media) — `qrImageUrl` is the field that slice actually
 *  needs and the public checkout flow didn't have until now. */
export async function GET() {
  const supabase = createServiceRoleClient();

  try {
    const channels = await fetchPaymentChannels(supabase);

    return NextResponse.json({
      channels: channels.map((channel) => ({
        key: channel.key,
        displayKey: channel.displayKey,
        label: channel.label,
        account: `${channel.accountName}\n${channel.accountNumber}`,
        accountName: channel.accountName,
        accountNumber: channel.accountNumber,
        qrPayload: channel.qrPayload,
        qrImageUrl: channel.qrImageUrl,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load payment channels." },
      { status: 500 },
    );
  }
}
