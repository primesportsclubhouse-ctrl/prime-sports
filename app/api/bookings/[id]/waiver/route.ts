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
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify slot ownership." },
      { status: 500 },
    );
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
    return NextResponse.json({ error: waiverVersionError.message }, { status: 500 });
  }
  if (!waiverVersion) {
    return NextResponse.json({ error: "No published waiver version is configured." }, { status: 500 });
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
    return NextResponse.json({ error: acceptanceError.message }, { status: 500 });
  }

  if (!booking.waiver_accepted) {
    const { error: bookingUpdateError } = await supabase
      .from("bookings")
      .update({ waiver_accepted: true })
      .eq("id", booking.id);

    if (bookingUpdateError) {
      return NextResponse.json({ error: bookingUpdateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ waiverAccepted: true });
}
