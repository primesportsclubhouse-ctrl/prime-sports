import type { Metadata } from "next";
import Link from "next/link";

import AppShell from "@/components/prime-sports/app-shell";
import HomeFaq from "@/components/prime-sports/home-faq";
import SectionIntro from "@/components/prime-sports/section-intro";
import {
  primeButtonLargeClass,
  primeButtonOutlineClass,
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
  {
    href: "/roster",
    number: "04",
    title: "Attendance Tracker",
    description:
      "Organizer check-in toggle, player gatekeeper roster, and 10-player cap enforcement.",
  },
  {
    href: "/admin",
    number: "05",
    title: "Administration Dashboard",
    description:
      "Master booking calendar, manual verification split-queue, and approve/reject actions.",
    dark: true,
  },
];

const faqItems = [
  {
    question: "[FAQ question 01 — reservations & booking policy]",
    answer:
      "[FAQ answer 01 — fill in club policy on reservations, lead time, and modifications.]",
  },
  {
    question: "[FAQ question 02 — payment & scan-to-pay checkout]",
    answer:
      "[FAQ answer 02 — fill in accepted channels (GCash, Maya, Bank), receipt upload, and reference validation flow.]",
  },
  {
    question: "[FAQ question 03 — cancellation & refund window]",
    answer:
      "[FAQ answer 03 — fill in cancellation cutoff, refund processing time, and reschedule policy.]",
  },
  {
    question: "[FAQ question 04 — guest access & player cap]",
    answer:
      "[FAQ answer 04 — fill in 10-player cap per court, guest passes, and membership requirements.]",
  },
  {
    question: "[FAQ question 05 — covered vs. outdoor & weather policy]",
    answer:
      "[FAQ answer 05 — fill in surface differences, rain policy for outdoor courts, and covered-court availability.]",
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
          <section className="overflow-hidden border-b border-border px-0 py-[72px] max-[640px]:py-12" data-od-id="landing-hero">
            <div className={`${containerClassName} max-w-[880px]`}>
              <p className="mb-6 inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.14em] text-accent before:block before:h-px before:w-6 before:bg-accent">Est. [Year] · Prestige Sports Club</p>
              <h1 className="font-serif text-[clamp(56px,11vw,120px)] font-bold leading-[0.95] tracking-[-0.025em]">
                Prime Sports
              </h1>
              <p className="mt-6 max-w-[54ch] text-[clamp(16px,2vw,19px)] leading-[1.6] opacity-78">
                An elite, beautifully maintained community hub where serious players and
                passionate hobbyists gather. Reserve a court in minutes — covered or
                outdoor, daytime or evening.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/reserve" className={`${primeButtonPrimaryClass} ${primeButtonLargeClass}`}>
                  Reserve a Court →
                </Link>
                <Link href="#pricing" className={`${primeButtonOutlineClass} ${primeButtonLargeClass}`}>
                  View pricing
                </Link>
              </div>
              <div className="mt-12 flex flex-wrap gap-10 border-t border-border pt-6">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.08em] opacity-55">Courts</span>
                  <span className="font-serif text-lg font-bold tabular-nums">[N] total</span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.08em] opacity-55">Surfaces</span>
                  <span className="font-serif text-lg font-bold">Covered &amp; Outdoor</span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.08em] opacity-55">Hours</span>
                  <span className="font-serif text-lg font-bold tabular-nums">[Open]–[Close]</span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.08em] opacity-55">Location</span>
                  <span className="font-serif text-lg font-bold">[City]</span>
                </div>
              </div>
            </div>
          </section>

          <section className="px-0 py-16 max-[640px]:py-10" data-od-id="launcher-modules">
            <div className={containerClassName}>
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-accent">
                    Prime Sports · Court Reservation Platform
                  </p>
                  <h2 className="font-serif text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.015em]">Application Modules</h2>
                </div>
                <p className="max-w-[40ch] text-sm opacity-65">
                  Open any module below to explore the interactive prototype. Each module
                  is now represented as a Next.js route.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-5 max-[920px]:grid-cols-2 max-[640px]:grid-cols-1">
                {modules.map((module) => (
                  <Link
                    key={module.number}
                    href={module.href}
                    className={`group flex min-h-[240px] flex-col gap-3 overflow-hidden rounded-[var(--radius)] border p-6 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${module.dark ? "border-accent-secondary bg-[linear-gradient(180deg,rgba(212,163,89,0.12)_0%,var(--surface-muted)_100%)] text-foreground hover:border-accent" : "border-border bg-surface hover:border-accent-secondary"}`}
                  >
                    <span className={`font-serif text-sm font-bold tracking-[0.05em] ${module.dark ? "text-accent-secondary" : "text-accent"}`}>{module.number}</span>
                    <h3 className="font-serif text-2xl font-bold tracking-[-0.01em]">{module.title}</h3>
                    <p className={`flex-1 text-sm ${module.dark ? "opacity-70" : "opacity-72"}`}>{module.description}</p>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold after:content-['→'] group-hover:after:translate-x-1 after:transition-transform">Open module</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="border-b border-border px-0 py-20 max-[640px]:py-12" id="pricing" data-od-id="landing-pricing">
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
                    <h3 className="mt-2 font-serif text-[28px] font-bold tracking-[-0.01em]">Covered Courts</h3>
                    <p className="mt-1.5 text-[13px] opacity-60">
                      Climate-controlled, professional-grade surfaces with gallery seating.
                    </p>
                  </div>
                  <div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-7 py-4.5 max-[640px]:px-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold">Daytime Rate</span>
                        <span className="text-xs opacity-55 tabular-nums">[Time range] · Off-peak</span>
                      </div>
                      <div className="font-serif text-2xl font-bold tracking-[-0.01em] tabular-nums">
                        [Rate]
                        <span className="font-sans text-[13px] font-medium opacity-55">/hr</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-7 py-4.5 max-[640px]:px-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold">Evening Rate</span>
                        <span className="text-xs opacity-55 tabular-nums">[Time range] · Peak</span>
                      </div>
                      <div className="font-serif text-2xl font-bold tracking-[-0.01em] tabular-nums">
                        [Rate]
                        <span className="font-sans text-[13px] font-medium opacity-55">/hr</span>
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
                    <h3 className="mt-2 font-serif text-[28px] font-bold tracking-[-0.01em]">Outdoor Courts</h3>
                    <p className="mt-1.5 text-[13px] opacity-60">Open-air, championship-spec surfaces under [lighting/condition].</p>
                  </div>
                  <div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-7 py-4.5 max-[640px]:px-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold">Daytime Rate</span>
                        <span className="text-xs opacity-55 tabular-nums">[Time range] · Off-peak</span>
                      </div>
                      <div className="font-serif text-2xl font-bold tracking-[-0.01em] tabular-nums">
                        [Rate]
                        <span className="font-sans text-[13px] font-medium opacity-55">/hr</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-7 py-4.5 max-[640px]:px-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold">Evening Rate</span>
                        <span className="text-xs opacity-55 tabular-nums">[Time range] · Peak</span>
                      </div>
                      <div className="font-serif text-2xl font-bold tracking-[-0.01em] tabular-nums">
                        [Rate]
                        <span className="font-sans text-[13px] font-medium opacity-55">/hr</span>
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

          <section className="border-b border-border px-0 py-20 max-[640px]:py-12" data-od-id="landing-facility">
            <div className={containerClassName}>
              <SectionIntro
                eyebrow="Facility & Location"
                title="A club worth the visit."
                description="Tour the grounds and find us. The facility is located at [address snippet] with [parking/access notes]."
                className="mb-10"
              />
              <div className="grid grid-cols-[2fr_1fr] items-start gap-5 max-[920px]:grid-cols-1">
                <div className="grid auto-rows-[160px] grid-cols-3 gap-3 max-[640px]:auto-rows-[140px] max-[640px]:grid-cols-2" data-od-id="landing-gallery">
                  <div className="row-span-2 flex items-center justify-center rounded-[var(--radius)] border-2 border-border bg-surface-muted text-[11px] font-bold uppercase tracking-[0.06em] text-muted/60 [background-image:repeating-linear-gradient(45deg,transparent_0_14px,rgba(32,60,90,0.38)_14px_28px)]">[Gallery image]</div>
                  <div className="flex items-center justify-center rounded-[var(--radius)] border-2 border-border bg-surface-muted text-[11px] font-bold uppercase tracking-[0.06em] text-muted/60 [background-image:repeating-linear-gradient(45deg,transparent_0_14px,rgba(32,60,90,0.38)_14px_28px)]">[Gallery image]</div>
                  <div className="flex items-center justify-center rounded-[var(--radius)] border-2 border-border bg-surface-muted text-[11px] font-bold uppercase tracking-[0.06em] text-muted/60 [background-image:repeating-linear-gradient(45deg,transparent_0_14px,rgba(32,60,90,0.38)_14px_28px)]">[Gallery image]</div>
                  <div className="col-span-2 flex items-center justify-center rounded-[var(--radius)] border-2 border-border bg-surface-muted text-[11px] font-bold uppercase tracking-[0.06em] text-muted/60 [background-image:repeating-linear-gradient(45deg,transparent_0_14px,rgba(32,60,90,0.38)_14px_28px)] max-[640px]:col-span-2">[Gallery image]</div>
                  <div className="flex items-center justify-center rounded-[var(--radius)] border-2 border-border bg-surface-muted text-[11px] font-bold uppercase tracking-[0.06em] text-muted/60 [background-image:repeating-linear-gradient(45deg,transparent_0_14px,rgba(32,60,90,0.38)_14px_28px)]">[Gallery image]</div>
                </div>
                <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow-sm)]" data-od-id="landing-map">
                  <div className="relative flex aspect-square items-center justify-center border-b border-border bg-[linear-gradient(90deg,rgba(156,176,195,0.18)_1px,transparent_1px)_0_0/40px_40px,linear-gradient(rgba(156,176,195,0.18)_1px,transparent_1px)_0_0/40px_40px,linear-gradient(135deg,var(--surface-muted)_0%,var(--canvas)_100%)]">
                    <div className="absolute left-[10%] right-[10%] top-[55%] h-[3px] rounded bg-muted" />
                    <div className="absolute bottom-[15%] left-[25%] h-[2px] w-[30%] rotate-[15deg] rounded bg-muted" />
                    <div className="relative z-10 flex flex-col items-center gap-1">
                      <div className="relative size-7 rotate-[-45deg] rounded-[50%_50%_50%_0] bg-accent shadow-[var(--shadow-md)] after:absolute after:left-2 after:top-2 after:size-3 after:rounded-full after:bg-canvas" aria-hidden="true" />
                      <span className="rounded-[var(--radius)] border border-border bg-surface-muted px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em]">Prime Sports</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="font-serif text-lg font-bold tracking-[-0.01em]">Prime Sports Club</h4>
                    <p className="mt-1 text-[13px] opacity-65">Prestige court reservation &amp; community hub</p>
                    <div className="mt-3.5 border-t border-border pt-3.5 text-[13px]">
                      <strong className="mb-0.5 block font-semibold">[Facility address line 1]</strong>
                      <span>[Address line 2] · [City] [Postal]</span>
                      <br />
                      <span>Open daily [Open]–[Close]</span>
                    </div>
                  </div>
                </div>
              </div>
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

          <section className="border-t border-border bg-[linear-gradient(135deg,var(--surface)_0%,var(--canvas)_100%)] px-0 py-16 text-foreground" data-od-id="landing-cta">
            <div className={`${containerClassName} flex flex-wrap items-center justify-between gap-6`}>
              <div>
                <h2 className="max-w-[14ch] font-serif text-[clamp(28px,4vw,42px)] font-bold leading-[1.1] tracking-[-0.015em]">Your court is waiting.</h2>
                <p className="mt-2 text-[15px] opacity-65">Reserve in under two minutes. Pay your way. Show up &amp; play.</p>
              </div>
              <Link href="/reserve" className={`${primeButtonPrimaryClass} ${primeButtonLargeClass}`}>
                Reserve a Court →
              </Link>
            </div>
          </section>
    </AppShell>
  );
}
