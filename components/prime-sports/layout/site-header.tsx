"use client";

import { Home } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { getPrimeContainerClassName, primeButtonOutlineClass } from "@/lib/prime-sports";

import MobileNav from "@/components/prime-sports/layout/mobile-nav";
import SkewCta from "@/components/prime-sports/ui/skew-cta";
import { NavBar } from "@/components/ui/tubelight-navbar";

import navBarLogo from "@/public/prime-sports/header-logo.png";

const headerNavLinks = [
  { name: "Courts & Pricing", url: "/#pricing", icon: "pricing" },
  { name: "Facility", url: "/#facility", icon: "facility" },
  { name: "FAQs", url: "/#faq", icon: "faq" },
];

const mobileNavLinks = headerNavLinks.map((item) => ({ href: item.url, label: item.name }));

type SiteHeaderProps = {
  currentPath: string;
  containerVariant?: "default" | "narrow" | "wide";
  simple?: boolean;
};

/**
 * Tracks which page section currently sits behind the sticky header and reports back its
 * declared theme (`data-nav-theme="dark" | "light"` on that section). Pages without any
 * marked sections (the `simple` booking flows) never touch this and the header just keeps
 * its default dark look.
 */
function useHeaderTheme(headerRef: React.RefObject<HTMLElement | null>) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-theme]"));
    if (!sections.length) {
      return;
    }

    let frame = 0;

    const updateTheme = () => {
      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      const probe = headerHeight + 1;

      // Sections are in document (top-to-bottom) order — the last one whose top has
      // already scrolled above the header line is the section currently behind it.
      let current = sections[0];
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= probe) {
          current = section;
        } else {
          break;
        }
      }

      const next = current.dataset.navTheme === "light" ? "light" : "dark";
      setTheme((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateTheme();
      });
    };

    updateTheme();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [headerRef]);

  return theme;
}

export default function SiteHeader({
  currentPath,
  containerVariant = "default",
  simple = false,
}: SiteHeaderProps) {
  const containerClassName = getPrimeContainerClassName(containerVariant);
  const headerRef = useRef<HTMLElement | null>(null);
  const theme = useHeaderTheme(headerRef);
  const isLight = theme === "light";

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 z-50 border-b shadow-[var(--shadow-sm)] backdrop-blur-[8px] backdrop-saturate-150 transition-colors duration-300",
        isLight ? "border-[rgba(32,60,90,0.16)] bg-[rgba(245,239,230,0.88)]" : "border-border bg-[rgba(11,27,43,0.88)]",
      )}
      data-od-id="site-topnav"
    >
      <div className={`${containerClassName} relative flex min-h-16 items-center justify-between gap-4`}>
        <Link
          href="/"
          aria-current={currentPath === "/" ? "page" : undefined}
          className="inline-flex shrink-0 items-center"
        >
          <Image src={navBarLogo} alt="Prime Sports" priority className="h-14 lg:h-18 w-auto object-contain py-3" />
        </Link>

        {simple ? (
          <Link href="/" className={primeButtonOutlineClass}>
            <Home size={15} aria-hidden="true" />
            Home
          </Link>
        ) : (
          <>
            <div className="absolute left-1/2 -translate-x-1/2 max-[920px]:hidden">
              <NavBar items={headerNavLinks} placement="top" theme={theme} />
            </div>
            <SkewCta href="/reserve" invert={isLight} className="max-[920px]:hidden">
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