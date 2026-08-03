import { Home } from "lucide-react";
import Link from "next/link";

import { getPrimeContainerClassName, primeButtonOutlineClass } from "@/lib/prime-sports";

import MobileNav from "@/components/prime-sports/layout/mobile-nav";
import SkewCta from "@/components/prime-sports/ui/skew-cta";
import { NavBar } from "@/components/ui/tubelight-navbar";

const headerNavLinks = [
  { name: "Courts & Pricing", url: "/#pricing", icon: "pricing" },
  { name: "Facility", url: "/#facility", icon: "facility" },
  { name: "FAQ", url: "/#faq", icon: "faq" },
];

const mobileNavLinks = headerNavLinks.map((item) => ({ href: item.url, label: item.name }));

type SiteHeaderProps = {
  currentPath: string;
  containerVariant?: "default" | "narrow" | "wide";
  simple?: boolean;
};

export default function SiteHeader({
  currentPath,
  containerVariant = "default",
  simple = false,
}: SiteHeaderProps) {
  const containerClassName = getPrimeContainerClassName(containerVariant);

  return (
    <header
      className="sticky top-0 z-50 border-b border-border bg-[rgba(11,27,43,0.88)] shadow-[var(--shadow-sm)] backdrop-blur-[8px] backdrop-saturate-150"
      data-od-id="site-topnav"
    >
      <div className={`${containerClassName} relative flex min-h-16 items-center justify-between gap-4`}>
        <Link
          href="/"
          aria-current={currentPath === "/" ? "page" : undefined}
          className="inline-flex items-baseline gap-1 [font-family:var(--font-heading)] text-[22px] font-extrabold uppercase tracking-[0.06em]"
        >
          Prime Sports<span className="text-accent">.</span>
        </Link>

        {simple ? (
          <Link href="/" className={primeButtonOutlineClass}>
            <Home size={15} aria-hidden="true" />
            Home
          </Link>
        ) : (
          <>
            <div className="absolute left-1/2 -translate-x-1/2 max-[920px]:hidden">
              <NavBar items={headerNavLinks} placement="top" />
            </div>
            <SkewCta href="/reserve" className="max-[920px]:hidden">
              Reserve Now
            </SkewCta>
            <MobileNav
              currentPath={currentPath}
              links={mobileNavLinks}
              ctaHref="/reserve"
              ctaLabel="Reserve Now"
            />
          </>
        )}
      </div>
    </header>
  );
}