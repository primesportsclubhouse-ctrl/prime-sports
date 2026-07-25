import type { Metadata } from "next";

import AppShell from "@/components/prime-sports/app-shell";
import PageIntro from "@/components/prime-sports/page-intro";
import RosterClient from "@/components/prime-sports/roster-client";

export const metadata: Metadata = {
  title: "Roster | Prime Sports",
  description: "Court-side attendance tracking and player roster management for active sessions.",
};

export default function RosterPage() {
  return (
    <AppShell currentPath="/roster" footerSimple containerVariant="narrow">
      <PageIntro
        eyebrow="On-Ground Roster Tool"
        title="Court-Side Check-In"
        description="Mobile-first operations interface for court-side staff and event managers."
        containerVariant="narrow"
        sectionClassName="border-b border-border px-0 py-10"
        titleClassName="font-serif text-[clamp(32px,7vw,44px)] font-bold leading-[1.05] tracking-[-0.02em]"
        descriptionClassName="mt-2 text-sm opacity-70"
        eyebrowClassName="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-accent"
      />
      <RosterClient />
    </AppShell>
  );
}