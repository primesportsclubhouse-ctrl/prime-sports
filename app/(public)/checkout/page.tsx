import type { Metadata } from "next";

import AppShell from "@/components/prime-sports/layout/app-shell";
import CheckoutClient from "@/components/prime-sports/booking/checkout-client";
import PageIntro from "@/components/prime-sports/booking/page-intro";

export const metadata: Metadata = {
  title: "Checkout | Prime Sports",
  description: "Upload a payment receipt and submit a transaction reference for manual verification.",
};

// SiteFooter (rendered via AppShell below) reads `facility_settings` directly
// for its "[Contact]" spot — see site-footer.tsx's own comment. Revalidating
// every 60s (instead of only at build time) means an edit saved from
// /admin/content shows up here without a redeploy, same as the homepage.
export const revalidate = 60;

export default function CheckoutPage() {
  return (
    <AppShell currentPath="/checkout" simple>
      <PageIntro
        eyebrow="Step 04 — 04 · Scan-to-Pay"
        title="Confirm Your Reservation"
        description="Pay to any of the club's official channels below, upload your receipt screenshot, and enter the transaction reference. Our OCR system reads the reference from your image automatically."
      />
      <CheckoutClient />
    </AppShell>
  );
}