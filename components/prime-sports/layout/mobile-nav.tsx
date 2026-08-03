'use client';

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import SkewCta from "@/components/prime-sports/ui/skew-cta";
import { primeToolbarIconButtonClass } from "@/lib/prime-sports";

type NavLink = {
  href: string;
  label: string;
};

type MobileNavProps = {
  currentPath: string;
  links: NavLink[];
  ctaHref?: string;
  ctaLabel?: string;
};

export default function MobileNav({ currentPath, links, ctaHref, ctaLabel }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative hidden max-[920px]:block">
      <button
        type="button"
        className={primeToolbarIconButtonClass}
        aria-expanded={isOpen}
        aria-controls="prime-mobile-nav"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default bg-black/40 backdrop-blur-[2px]"
            onClick={() => setIsOpen(false)}
          />
          <nav
            id="prime-mobile-nav"
            className="absolute right-0 top-full z-50 mt-2 flex min-w-52 flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow-md)]"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-foreground/90 transition-colors hover:text-foreground hover:underline hover:decoration-accent-secondary hover:underline-offset-4"
                aria-current={currentPath === link.href ? "page" : undefined}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {ctaHref && ctaLabel ? (
              <SkewCta
                href={ctaHref}
                size="compact"
                className="mt-1 w-full"
                onClick={() => setIsOpen(false)}
              >
                {ctaLabel}
              </SkewCta>
            ) : null}
          </nav>
        </>
      ) : null}
    </div>
  );
}