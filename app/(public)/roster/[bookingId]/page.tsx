import type { Metadata } from "next";
import { Suspense } from "react";

import AppShell from "@/components/prime-sports/layout/app-shell";
import PageIntro from "@/components/prime-sports/booking/page-intro";
import PublicRosterCheckin from "@/components/prime-sports/roster/public-roster-checkin";

export const metadata: Metadata = {
  title: "Court Check-In | Prime Sports",
  description: "Check yourself and your group in for your Prime Sports court session.",
};

function RosterCheckinFallback() {
  return (
    <section className="mx-auto w-full max-w-[680px] px-5 py-16 text-center text-[13px] opacity-60">
      Loading your check-in…
    </section>
  );
}

/**
 * Public, booking-scoped roster check-in — reached only via the shareable
 * link the booking-confirmation email sends
 * (`${NEXT_PUBLIC_SITE_URL}/roster/[bookingId]?token=[sessionToken]`, see
 * approve/route.ts). Distinct from app/(public)/roster/page.tsx, which stays
 * an unconditional redirect to the staff-only /admin/roster browse-all-
 * bookings view — that one has no ID to scope to and isn't touched by this
 * feature.
 *
 * A Server Component wrapper only: `bookingId` is resolved here (Next's
 * async `params`), then handed to the Client Component that actually reads
 * the `token` query param via `useSearchParams` and talks to the API. The
 * `Suspense` boundary is required — not optional — because
 * `useSearchParams` bails a Client Component out to client-side rendering up
 * to its nearest Suspense boundary during static builds.
 */
export default async function PublicRosterCheckinPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  return (
    <AppShell currentPath={`/roster/${bookingId}`} simple>
      <PageIntro
        eyebrow="Court-Side Check-In"
        title="Check In Your Group"
        description="Add your group's names below as you arrive — everyone you add is marked present immediately, no staff hand-off required."
      />
      <Suspense fallback={<RosterCheckinFallback />}>
        <PublicRosterCheckin bookingId={bookingId} />
      </Suspense>
    </AppShell>
  );
}
