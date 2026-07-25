import type { Metadata } from "next";

import AppShell from "@/components/prime-sports/app-shell";
import CheckoutClient from "@/components/prime-sports/checkout-client";
import PageIntro from "@/components/prime-sports/page-intro";

export const metadata: Metadata = {
  title: "Checkout | Prime Sports",
  description: "Upload a payment receipt and submit a transaction reference for manual verification.",
};

export default function CheckoutPage() {
  return (
    <AppShell currentPath="/checkout" footerSimple>
      <PageIntro
        eyebrow="Step 04 — 04 · Scan-to-Pay"
        title="Confirm Your Reservation"
        description="Pay to any of the club's official channels below, upload your receipt screenshot, and enter the transaction reference. Our OCR system reads the reference from your image automatically."
      />
      <CheckoutClient />
    </AppShell>
  );
}