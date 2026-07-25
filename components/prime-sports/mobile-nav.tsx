'use client';

import Link from "next/link";
import { useState } from "react";

import { primeButtonBaseClass } from "@/lib/prime-sports";

type NavLink = {
  href: string;
  label: string;
};

type MobileNavProps = {
  currentPath: string;
  links: NavLink[];
};

export default function MobileNav({ currentPath, links }: MobileNavProps) {
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
            className="text-sm font-medium opacity-70 transition hover:opacity-100 aria-[current=page]:text-accent aria-[current=page]:opacity-100"
            aria-current={currentPath === link.href ? "page" : undefined}
            onClick={() => setIsOpen(false)}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}