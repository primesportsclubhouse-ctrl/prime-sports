import type { Metadata } from "next";

import AdminDashboard from "@/components/prime-sports/admin-dashboard";
import AppShell from "@/components/prime-sports/app-shell";
import PageIntro from "@/components/prime-sports/page-intro";

export const metadata: Metadata = {
  title: "Admin | Prime Sports",
  description: "Staff dashboard for master court scheduling and payment verification review.",
};

export default function AdminPage() {
  return (
    <AppShell
      currentPath="/admin"
      footerSimple
      containerVariant="wide"
      headerBadgeLabel="Staff"
    >
      <PageIntro
        eyebrow="Protected Dashboard · Staff"
        title="Administration"
        description="[Today's date] · Master calendar & verification queue"
        containerVariant="wide"
        sectionClassName="border-b border-border px-0 py-7"
        layoutClassName="flex w-full flex-wrap items-end justify-between gap-4"
        titleClassName="font-serif text-[clamp(28px,4vw,40px)] font-bold leading-[1.05] tracking-[-0.02em]"
        descriptionClassName="mt-1 text-xs opacity-60 tabular-nums"
        eyebrowClassName="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-accent"
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-[var(--radius)] border border-border bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground">
              Live
            </span>
          </div>
        }
      />
      <AdminDashboard />
    </AppShell>
  );
}