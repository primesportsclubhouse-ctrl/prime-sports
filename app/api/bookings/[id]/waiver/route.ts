import { NextRequest, NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifySlotHoldOwnership } from "@/lib/supabase/slot-holds";

export const dynamic = "force-dynamic";

type WaiverPayload = {
  sessionToken?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Persists waiver acceptance for a single booking, replacing
 * waiver-form-dialog.tsx's `isAccepted` local-component-state-only flag
 * (which never survived a refresh). Ownership is proven the same
 * session_token-against-slot_holds way every other guest-checkout write in
 * this app is — see /api/bookings/[id]'s PATCH handler.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let payload: WaiverPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { sessionToken } = payload;

  if (!isNonEmptyString(sessionToken)) {
    return NextResponse.json({ error: "sessionToken is required." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, court_id, booking_date, time_slot, waiver_accepted")
    .eq("id", id)
    .maybeSingle();

  if (bookingError) {
    console.error(`[bookings/${id}/waiver] Failed to load booking:`, bookingError.message);
    return NextResponse.json({ error: "Could not load that booking. Please try again." }, { status: 500 });
  }
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  let isOwner: boolean;
  try {
    isOwner = await verifySlotHoldOwnership(
      supabase,
      { courtId: booking.court_id, bookingDate: booking.booking_date, timeSlot: booking.time_slot },
      sessionToken,
    );
  } catch (error) {
    console.error(`[bookings/${id}/waiver] Ownership check failed:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not verify your reservation. Please try again." }, { status: 500 });
  }
  if (!isOwner) {
    return NextResponse.json({ error: "Not authorized to modify this booking." }, { status: 403 });
  }

  const { data: waiverVersion, error: waiverVersionError } = await supabase
    .from("waiver_versions")
    .select("id")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (waiverVersionError) {
    console.error(`[bookings/${id}/waiver] Failed to load the current waiver version:`, waiverVersionError.message);
    return NextResponse.json({ error: "Could not save your acceptance. Please try again." }, { status: 500 });
  }
  if (!waiverVersion) {
    console.error(`[bookings/${id}/waiver] No published waiver version is configured.`);
    return NextResponse.json({ error: "The waiver isn't available right now — please contact staff." }, { status: 500 });
  }

  // Same forwarded-header convention Next's own request-context APIs read
  // from — request.ip was removed in this Next.js version (see the App
  // Router upgrade notes under node_modules/next/dist/docs), so this is the
  // direct replacement rather than an ad hoc addition.
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const { error: acceptanceError } = await supabase.from("waiver_acceptances").insert({
    booking_id: booking.id,
    waiver_version_id: waiverVersion.id,
    ip_address: ipAddress,
  });

  if (acceptanceError) {
    console.error(`[bookings/${id}/waiver] Failed to record acceptance:`, acceptanceError.message);
    return NextResponse.json({ error: "Could not save your acceptance. Please try again." }, { status: 500 });
  }

  if (!booking.waiver_accepted) {
    const { error: bookingUpdateError } = await supabase
      .from("bookings")
      .update({ waiver_accepted: true })
      .eq("id", booking.id);

    if (bookingUpdateError) {
      console.error(`[bookings/${id}/waiver] Failed to flag booking as waived:`, bookingUpdateError.message);
      return NextResponse.json({ error: "Could not save your acceptance. Please try again." }, { status: 500 });
    }
  }

  return NextResponse.json({ waiverAccepted: true });
}
