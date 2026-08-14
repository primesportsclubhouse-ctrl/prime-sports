import type { Metadata } from "next";

import AppShell from "@/components/prime-sports/layout/app-shell";
import ClosingCta from "@/components/prime-sports/home/closing-cta";
import FacilityShowcase from "@/components/prime-sports/home/facility-showcase";
import HalideTopoHero from "@/components/prime-sports/home/halide-topo-hero";
import HomeFaq, { type FaqItem } from "@/components/prime-sports/home/home-faq";
import LocationPanel from "@/components/prime-sports/home/location-panel";
import PricingCards from "@/components/prime-sports/home/pricing-cards";
import SectionIntro from "@/components/prime-sports/home/section-intro";
import SectionBackdrop from "@/components/prime-sports/ui/section-backdrop";
import {
  primeContainerClasses,
} from "@/lib/prime-sports";

const faqItems: FaqItem[] = [
  {
    question: "[FAQ question 01 — reservations & booking policy]",
    answer:
      "[FAQ answer 01 — fill in club policy on reservations, lead time, and modifications.]",
    meta: "Booking",
  },
  {
    question: "[FAQ question 02 — payment & scan-to-pay checkout]",
    answer:
      "[FAQ answer 02 — fill in accepted channels (GCash, Maya, Bank), receipt upload, and reference validation flow.]",
    meta: "Payment",
  },
  {
    question: "[FAQ question 03 — cancellation & refund window]",
    answer:
      "[FAQ answer 03 — fill in cancellation cutoff, refund processing time, and reschedule policy.]",
    meta: "Refunds",
  },
  {
    question: "[FAQ question 04 — guest access & player cap]",
    answer:
      "[FAQ answer 04 — fill in 10-player cap per court, guest passes, and membership requirements.]",
    meta: "Access",
  },
  {
    question: "[FAQ question 05 — covered vs. outdoor & weather policy]",
    answer:
      "[FAQ answer 05 — fill in surface differences, rain policy for outdoor courts, and covered-court availability.]",
    meta: "Courts",
  },
];

export const metadata: Metadata = {
  title: "PrimeSports Clubhouse",
  description:
    "Marketing overview and module launcher for the Prime Sports court reservation platform.",
};

export default function Home() {
  const containerClassName = primeContainerClasses.default;

  return (
    <AppShell currentPath="/">
          <HalideTopoHero />

          {/* Section 2 — cream variant: grain only, no linework, inverted ink. */}
          <section className="relative scroll-mt-28 overflow-hidden border-b border-border bg-foreground px-0 py-20 text-canvas max-[640px]:py-12" id="pricing" data-od-id="landing-pricing" data-nav-theme="light">
            <SectionBackdrop variant="grain" />
            <div className={`${containerClassName} relative z-10`}>
              <SectionIntro
                eyebrow="Court Pricing"
                title="Transparent rates by surface & time of day."
                description="Daytime runs 6:00 AM – 4:00 PM and nighttime runs 4:00 PM – 2:00 AM, with separate weekday and weekend rates. Toggle below to compare — all sessions are booked in hourly increments."
                className="mb-10"
              />
              <PricingCards />
            </div>
          </section>

          {/* Section 3 — backdrop alternates to the stellar style. */}
          <section className="relative scroll-mt-28 overflow-hidden border-b border-border px-0 py-20 max-[640px]:py-12" id="facility" data-od-id="landing-facility" data-nav-theme="dark">
            <SectionBackdrop variant="stellar" />
            <div className={`${containerClassName} relative z-10`}>
              <SectionIntro
                eyebrow="The Facility"
                title="A club worth the visit."
                description="Tour the grounds — covered and open-air courts, training space, and the members' lounge. Hover or tap a panel to open it."
                className="mb-10"
              />
              <FacilityShowcase />
            </div>
          </section>

          {/* Section 4 — cream variant: grain only, no linework, inverted ink. */}
          <section className="relative overflow-hidden border-b border-border bg-foreground px-0 py-20 text-canvas max-[640px]:py-12" data-od-id="landing-faq" data-nav-theme="light">
            <SectionBackdrop variant="grain" />
            <div className={`${containerClassName} relative z-10`}>
              <SectionIntro
                eyebrow="Frequently Asked"
                title="Answers before you ask."
                centered
                className="mb-10"
              />
              <HomeFaq items={faqItems} />
            </div>
          </section>

          <section className="scroll-mt-28 border-b border-border px-0 py-20 max-[640px]:py-12" id="location" data-od-id="landing-location" data-nav-theme="dark">
            <div className={containerClassName}>
              <SectionIntro
                eyebrow="Location"
                title="Find us."
                description="The clubhouse sits along the highway in Minglanilla, Cebu. Open daily with on-site parking."
                className="mb-10"
              />
              <LocationPanel />
            </div>
          </section>

          {/* Section 5 — back to the grid style. */}
          <section className="relative overflow-hidden border-t border-border bg-[linear-gradient(135deg,var(--surface)_0%,var(--canvas)_100%)] px-0 py-16 text-foreground" data-od-id="landing-cta" data-nav-theme="dark">
            <SectionBackdrop variant="grid" />
            <div className={`${containerClassName} relative z-10 flex flex-wrap items-center justify-between gap-6`}>
              <ClosingCta />
            </div>
          </section>
    </AppShell>
  );
}
