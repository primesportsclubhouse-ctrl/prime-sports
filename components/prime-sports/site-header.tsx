import Link from "next/link";

import { getPrimeContainerClassName, primeNavLinks } from "@/lib/prime-sports";

import MobileNav from "@/components/prime-sports/mobile-nav";

type SiteHeaderProps = {
  currentPath: string;
  containerVariant?: "default" | "narrow" | "wide";
  badgeLabel?: string;
};

export default function SiteHeader({
  currentPath,
  containerVariant = "default",
  badgeLabel,
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
          className="inline-flex items-baseline gap-1 font-serif text-[22px] font-bold tracking-[-0.015em]"
        >
          Prime Sports<span className="text-accent">.</span>
        </Link>
        <nav className="flex items-center gap-7 max-[920px]:hidden" aria-label="Primary navigation">
          {primeNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium opacity-70 transition hover:opacity-100 aria-[current=page]:text-accent aria-[current=page]:opacity-100"
              aria-current={currentPath === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {badgeLabel ? (
            <span className="inline-flex items-center justify-center rounded-[var(--radius)] border border-accent-secondary bg-accent-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-canvas max-[920px]:hidden">
            {badgeLabel}
          </span>
        ) : null}
        <MobileNav currentPath={currentPath} links={primeNavLinks} />
      </div>
    </header>
  );
}