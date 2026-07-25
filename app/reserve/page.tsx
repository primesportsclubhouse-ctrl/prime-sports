import type { Metadata } from "next";

import AppShell from "@/components/prime-sports/app-shell";
import BookingClient from "@/components/prime-sports/booking-client";
import PageIntro from "@/components/prime-sports/page-intro";

export const metadata: Metadata = {
  title: "Reserve | Prime Sports",
  description: "Reserve a Prime Sports court by selecting a date, court, and hourly slot.",
};

export default function ReservePage() {
  return (
    <AppShell currentPath="/reserve" footerSimple>
      <PageIntro
        eyebrow="Step 01 — 04 · Reservation"
        title="Reserve a Court"
        description="Select a date, then pick an open time slot on any available court. Locked slots are already booked and cannot be double-selected."
      />
      <BookingClient />
    </AppShell>
  );
}