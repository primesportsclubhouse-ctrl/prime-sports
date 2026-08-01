'use client';

import Link from "next/link";
import { useState } from "react";

import { primeButtonBaseClass, primeButtonPrimaryClass } from "@/lib/prime-sports";

type NavLink = {
  href: string;
  label: string;
};

type MobileNavProps = {
  currentPath: string;
  links: NavLink[];
  ctaHref: string;
  ctaLabel: string;
};

export default function MobileNav({ currentPath, links, ctaHref, ctaLabel }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative hidden max-[920px]:block">
      <button
        type="button"
        className={`${primeButtonBaseClass} min-h-10 px-0 text-sm shadow-none hover:translate-y-0`}
        aria-expanded={isOpen}
        aria-controls="prime-mobile-nav"
        aria-label="Toggle navigation"
        onClick={() => setIsOpen((open) => !open)}
      >
        Menu
      </button>
      <nav
        id="prime-mobile-nav"
        className={`absolute right-0 top-full z-50 mt-2 min-w-44 rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow-md)] ${isOpen ? "flex flex-col gap-3" : "hidden"}`}
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
        <Link
          href={ctaHref}
          className={`${primeButtonPrimaryClass} mt-1 min-h-10 w-full px-4 text-sm`}
          onClick={() => setIsOpen(false)}
        >
          {ctaLabel}
        </Link>
      </nav>
    </div>
  );
}