import type { Metadata } from "next";
import Link from "next/link";

import AppShell from "@/components/prime-sports/layout/app-shell";
import FacilityShowcase from "@/components/prime-sports/home/facility-showcase";
import HalideTopoHero from "@/components/prime-sports/home/halide-topo-hero";
import HomeFaq, { type FaqItem } from "@/components/prime-sports/home/home-faq";
import LocationPanel from "@/components/prime-sports/home/location-panel";
import SectionIntro from "@/components/prime-sports/home/section-intro";
import {
  primeButtonLargeClass,
  primeButtonPrimaryClass,
  primeContainerClasses,
} from "@/lib/prime-sports";

const modules = [
  {
    href: "/",
    number: "01",
    title: "Marketing Frontend",
    description:
      "Editorial homepage — hero, court pricing grid, facility gallery, and FAQ accordion.",
    dark: true,
  },
  {
    href: "/reserve",
    number: "02",
    title: "Booking System",
    description:
      "Rolling week calendar, court selection grid, and live hourly time-slot states.",
  },
  {
    href: "/checkout",
    number: "03",
    title: "Scan-to-Pay Checkout",
    description:
      "QR payment panels, drag-and-drop receipt upload with OCR, and reference validation.",
  },
];

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
  title: "Prime Sports",
  description:
    "Marketing overview and module launcher for the Prime Sports court reservation platform.",
};

export default function Home() {
  const containerClassName = primeContainerClasses.default;

  return (
    <AppShell currentPath="/">
          <HalideTopoHero />

          <section className="scroll-mt-28 border-b border-border px-0 py-20 max-[640px]:py-12" id="pricing" data-od-id="landing-pricing">
            <div className={containerClassName}>
              <SectionIntro
                eyebrow="Court Pricing"
                title="Transparent rates by surface & time of day."
                description="Daytime rates apply [time range]. Evening rates apply [time range]. All sessions are booked in hourly increments."
                className="mb-10"
              />
              <div className="grid grid-cols-2 gap-5 max-[920px]:grid-cols-1">
                <div className="overflow-hidden rounded-[var(--radius)] border border-border border-t-2 border-t-accent-secondary bg-surface text-foreground shadow-[var(--shadow-md)]" data-od-id="pricing-covered">
                  <div className="border-b border-border px-7 py-7 pb-5 max-[640px]:px-5 max-[640px]:pb-4 max-[640px]:pt-5">
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-60">Premium Indoor</span>
                    <h3 className="mt-2 [font-family:var(--font-heading)] text-[28px] font-extrabold uppercase tracking-[0.06em]">Covered Courts</h3>
                    <p className="mt-1.5 text-[13px] opacity-60">
                      Climate-controlled, professional-grade surfaces with gallery seating.
                    </p>
                  </div>
                  <div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-7 py-4.5 max-[640px]:px-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold">Daytime Rate</span>
                        <span className="[font-family:var(--font-mono)] text-xs font-medium opacity-55 tabular-nums">[Time range] · Off-peak</span>
                      </div>
                      <div className="[font-family:var(--font-mono)] text-2xl font-semibold tabular-nums">
                        [Rate]
                        <span className="[font-family:var(--font-mono)] text-[13px] font-medium opacity-55 tabular-nums">/hr</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-7 py-4.5 max-[640px]:px-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold">Evening Rate</span>
                        <span className="[font-family:var(--font-mono)] text-xs font-medium opacity-55 tabular-nums">[Time range] · Peak</span>
                      </div>
                      <div className="[font-family:var(--font-mono)] text-2xl font-semibold tabular-nums">
                        [Rate]
                        <span className="[font-family:var(--font-mono)] text-[13px] font-medium opacity-55 tabular-nums">/hr</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border px-7 py-[18px] pb-6 text-xs opacity-55 max-[640px]:px-5">
                    Includes [N] courts · [Surface type] · [Amenities]
                  </div>
                </div>

                <div className="overflow-hidden rounded-[var(--radius)] border border-border border-t-2 border-t-accent bg-surface text-foreground shadow-[var(--shadow-md)]" data-od-id="pricing-outdoor">
                  <div className="border-b border-border px-7 py-7 pb-5 max-[640px]:px-5 max-[640px]:pb-4 max-[640px]:pt-5">
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-60">Open-Air Championship</span>
                    <h3 className="mt-2 [font-family:var(--font-heading)] text-[28px] font-extrabold uppercase tracking-[0.06em]">Outdoor Courts</h3>
                    <p className="mt-1.5 text-[13px] opacity-60">Open-air, championship-spec surfaces under [lighting/condition].</p>
                  </div>
                  <div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-7 py-4.5 max-[640px]:px-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold">Daytime Rate</span>
                        <span className="[font-family:var(--font-mono)] text-xs font-medium opacity-55 tabular-nums">[Time range] · Off-peak</span>
                      </div>
                      <div className="[font-family:var(--font-mono)] text-2xl font-semibold tabular-nums">
                        [Rate]
                        <span className="[font-family:var(--font-mono)] text-[13px] font-medium opacity-55 tabular-nums">/hr</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-7 py-4.5 max-[640px]:px-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold">Evening Rate</span>
                        <span className="[font-family:var(--font-mono)] text-xs font-medium opacity-55 tabular-nums">[Time range] · Peak</span>
                      </div>
                      <div className="[font-family:var(--font-mono)] text-2xl font-semibold tabular-nums">
                        [Rate]
                        <span className="[font-family:var(--font-mono)] text-[13px] font-medium opacity-55 tabular-nums">/hr</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border px-7 py-[18px] pb-6 text-xs opacity-55 max-[640px]:px-5">
                    Includes [N] courts · [Surface type] · [Amenities]
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="scroll-mt-28 border-b border-border px-0 py-20 max-[640px]:py-12" id="facility" data-od-id="landing-facility">
            <div className={containerClassName}>
              <SectionIntro
                eyebrow="The Facility"
                title="A club worth the visit."
                description="Tour the grounds — covered and open-air courts, training space, and the members' lounge. Hover or tap a panel to open it."
                className="mb-10"
              />
              <FacilityShowcase />
            </div>
          </section>

          <section className="border-b border-border px-0 py-20 max-[640px]:py-12" data-od-id="landing-faq">
            <div className={containerClassName}>
              <SectionIntro
                eyebrow="Frequently Asked"
                title="Answers before you ask."
                centered
                className="mb-10"
              />
              <HomeFaq items={faqItems} />
            </div>
          </section>

          <section className="scroll-mt-28 border-b border-border px-0 py-20 max-[640px]:py-12" id="location" data-od-id="landing-location">
            <div className={containerClassName}>
              <SectionIntro
                eyebrow="Location"
                title="Find us."
                description="The facility is located at [address snippet] with [parking/access notes]."
                className="mb-10"
              />
              <LocationPanel />
            </div>
          </section>

          <section className="border-t border-border bg-[linear-gradient(135deg,var(--surface)_0%,var(--canvas)_100%)] px-0 py-16 text-foreground" data-od-id="landing-cta">
            <div className={`${containerClassName} flex flex-wrap items-center justify-between gap-6`}>
              <div>
                <h2 className="max-w-[14ch] [font-family:var(--font-heading)] text-[clamp(28px,4vw,42px)] font-extrabold uppercase leading-[1.1] tracking-[0.06em]">Your court is waiting.</h2>
                <p className="mt-2 text-[15px] opacity-65">Reserve in under two minutes. Pay your way. Show up &amp; play.</p>
              </div>
              <Link
                href="/reserve"
                className="group relative inline-flex min-h-12 skew-x-[-11deg] items-center justify-center overflow-hidden bg-foreground px-8 text-canvas transition-colors duration-300 ease-out [clip-path:polygon(0_0,calc(100%-16px)_0,100%_16px,100%_100%,0_100%)] hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-secondary max-[640px]:min-h-11 max-[640px]:px-6"
              >
                <span className="skew-x-[11deg] text-[13px] font-bold uppercase tracking-[0.16em]">
                  Reserve a Court →
                </span>
                {/* Folded-corner / ribbon detail */}
                <span
                  aria-hidden="true"
                  className="absolute right-0 top-0 size-4 bg-canvas/25 transition-colors duration-300 ease-out [clip-path:polygon(0_0,0_100%,100%_100%)] group-hover:bg-foreground/30"
                />
              </Link>
            </div>
          </section>
    </AppShell>
  );
}
