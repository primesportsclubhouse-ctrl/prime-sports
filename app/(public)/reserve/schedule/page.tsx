import type { Metadata } from "next";

import AppShell from "@/components/prime-sports/layout/app-shell";
import BookingClient from "@/components/prime-sports/booking/booking-client";
import PageIntro from "@/components/prime-sports/booking/page-intro";

export const metadata: Metadata = {
  title: "Reserve | Prime Sports",
  description: "Reserve a Prime Sports court by selecting a date, court, and hourly slot.",
};

// See checkout/page.tsx's own comment — SiteFooter's `[Contact]` read
// benefits from the same periodic revalidation.
export const revalidate = 60;

export default function ReserveSchedulePage() {
  return (
    <AppShell currentPath="/reserve/schedule" simple>
      <PageIntro
        eyebrow="Step 02 — 04 · Reservation"
        title="Reserve a Court"
        description="Select a date, then pick an open time slot on any available court. Locked slots are already booked and cannot be double-selected."
      />
      <BookingClient />
    </AppShell>
  );
}
