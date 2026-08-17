import { NextRequest, NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { freeSlotHold, verifySlotHoldOwnership } from "@/lib/supabase/slot-holds";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["draft", "held", "pending_payment", "confirmed", "cancelled", "no_show"] as const;
type BookingStatusValue = (typeof VALID_STATUSES)[number];

function isValidStatus(value: unknown): value is BookingStatusValue {
  return typeof value === "string" && (VALID_STATUSES as readonly string[]).includes(value);
}

type PatchPayload = {
  status?: unknown;
  sessionToken?: unknown;
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let payload: PatchPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { status, sessionToken } = payload;

  if (!isValidStatus(status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}.` }, { status: 400 });
  }
  if (typeof sessionToken !== "string" || !sessionToken.trim()) {
    return NextResponse.json({ error: "sessionToken is required." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, court_id, booking_date, time_slot, status")
    .eq("id", id)
    .maybeSingle();

  if (bookingError) {
    console.error(`[bookings/${id}] Failed to load booking:`, bookingError.message);
    return NextResponse.json({ error: "Could not load that booking. Please try again." }, { status: 500 });
  }
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  // Guest bookings have no auth session to check against, so ownership is
  // proven the same way the booking was created: holding the session token
  // recorded on the slot_holds row for this exact slot. This is deliberately
  // lightweight (matches the rest of the guest-checkout model — see the
  // Phase 1 migration's RLS comments) rather than a full auth check.
  const slotKey = { courtId: booking.court_id, bookingDate: booking.booking_date, timeSlot: booking.time_slot };
  let isOwner: boolean;
  try {
    isOwner = await verifySlotHoldOwnership(supabase, slotKey, sessionToken);
  } catch (error) {
    console.error(`[bookings/${id}] Ownership check failed:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not verify your reservation. Please try again." }, { status: 500 });
  }
  if (!isOwner) {
    return NextResponse.json({ error: "Not authorized to modify this booking." }, { status: 403 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .select("id, court_id, booking_date, time_slot, status, price_php, waiver_accepted")
    .single();

  if (updateError) {
    const isConflict = updateError.code === "23505";

    if (!isConflict) {
      console.error(`[bookings/${id}] Status update failed:`, updateError.message);
    }

    return NextResponse.json(
      { error: isConflict ? "Another booking already exists for that slot." : "Could not update that booking. Please try again." },
      { status: isConflict ? 409 : 500 },
    );
  }

  // Cancelling/no-showing frees the slot immediately rather than waiting out
  // the hold's TTL — delete the hold so the slot is instantly bookable again
  // instead of appearing "held" until it naturally expires.
  if (status === "cancelled" || status === "no_show") {
    await freeSlotHold(supabase, slotKey);
  }

  return NextResponse.json({
    booking: {
      id: updated.id,
      courtId: updated.court_id,
      bookingDate: updated.booking_date,
      timeSlot: updated.time_slot,
      status: updated.status,
      pricePhp: Number(updated.price_php),
      waiverAccepted: updated.waiver_accepted,
    },
  });
}
