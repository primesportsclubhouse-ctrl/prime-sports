import Link from "next/link";

import {
  getPrimeContainerClassName,
  primeButtonPrimaryClass,
} from "@/lib/prime-sports";

import { NavBar } from "@/components/ui/tubelight-navbar";

const headerNavLinks = [
  { name: "Courts & Pricing", url: "/#pricing", icon: "pricing" },
  { name: "Facility", url: "/#facility", icon: "facility" },
  { name: "FAQ", url: "/#faq", icon: "faq" },
];

type SiteHeaderProps = {
  currentPath: string;
  containerVariant?: "default" | "narrow" | "wide";
};

export default function SiteHeader({
  currentPath,
  containerVariant = "default",
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
        <div className="absolute left-1/2 -translate-x-1/2 max-[1080px]:hidden">
          <NavBar items={headerNavLinks} placement="top" />
        </div>
        <Link
            href="/reserve"
            className="group relative inline-flex min-h-12 skew-x-[-11deg] items-center justify-center overflow-hidden bg-foreground px-8 text-canvas transition-colors duration-300 ease-out [clip-path:polygon(0_0,calc(100%-16px)_0,100%_16px,100%_100%,0_100%)] hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-secondary max-[640px]:min-h-11 max-[640px]:px-6"
          >
            <span className="skew-x-[11deg] text-[13px] font-bold uppercase tracking-[0.16em]">
              Reserve a Court
            </span>
            {/* Folded-corner / ribbon detail */}
            <span
              aria-hidden="true"
              className="absolute right-0 top-0 size-4 bg-canvas/25 transition-colors duration-300 ease-out [clip-path:polygon(0_0,0_100%,100%_100%)] group-hover:bg-foreground/30"
            />
          </Link>
      </div>

      <div className="hidden border-t border-border/70 px-4 py-2 max-[1080px]:block">
        <NavBar items={headerNavLinks} placement="top" className="mx-auto w-fit" />
      </div>
    </header>
  );
}