import type { Metadata } from "next";

import AppShell from "@/components/prime-sports/layout/app-shell";
import ContactDetailsClient from "@/components/prime-sports/booking/contact-details-client";
import PageIntro from "@/components/prime-sports/booking/page-intro";

export const metadata: Metadata = {
  title: "Reserve | Prime Sports",
  description: "Enter your contact details to begin reserving a Prime Sports court.",
};

export default function ReservePage() {
  return (
    <AppShell currentPath="/reserve" simple>
      <PageIntro
        eyebrow="Step 01 — 04 · Reservation"
        title="Reserve a Court"
        description="Start with your contact details. We'll use these to confirm your reservation and send updates."
      />
      <ContactDetailsClient />
    </AppShell>
  );
}
