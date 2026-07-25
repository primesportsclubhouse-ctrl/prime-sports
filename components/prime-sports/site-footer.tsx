import Link from "next/link";

import { getPrimeContainerClassName, primeNavLinks } from "@/lib/prime-sports";

type SiteFooterProps = {
  currentPath: string;
  simple?: boolean;
  containerVariant?: "default" | "narrow" | "wide";
};

export default function SiteFooter({
  currentPath,
  simple = false,
  containerVariant = "default",
}: SiteFooterProps) {
  const containerClassName = getPrimeContainerClassName(containerVariant);

  if (simple) {
    return (
      <footer className="mt-10 border-t border-border py-8" data-od-id="site-footer">
        <div className={`${containerClassName} flex flex-wrap items-center justify-between gap-4 text-[13px] opacity-60`}>
          <p>Prime Sports · Vintage Americana &amp; Prestige Sports Club</p>
          <p>[Facility address] · [Contact]</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="px-0 pb-8 pt-12" data-od-id="site-footer">
      <div className={containerClassName}>
        <div className="mb-8 grid grid-cols-[2fr_1fr_1fr] gap-8 max-[920px]:grid-cols-1">
          <div>
            <div className="mb-2 inline-flex items-baseline gap-1 font-serif text-2xl font-bold tracking-[-0.015em]">
              Prime Sports<span className="text-accent">.</span>
            </div>
            <p className="max-w-[40ch] text-[13px] opacity-60">
              Vintage Americana &amp; Prestige Sports Club. An elite, beautifully
              maintained community hub for serious players and passionate hobbyists.
            </p>
          </div>
          <div>
            <h5 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] opacity-55">Platform</h5>
            <ul className="flex list-none flex-col gap-2 p-0">
              {primeNavLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] opacity-70 transition hover:opacity-100 aria-[current=page]:text-accent aria-[current=page]:opacity-100"
                    aria-current={currentPath === link.href ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] opacity-55">Club</h5>
            <ul className="flex list-none flex-col gap-2 p-0">
              <li>
                <Link href="/#pricing" className="text-[13px] opacity-70 transition hover:opacity-100">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-[13px] opacity-70 transition hover:opacity-100">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="#" className="text-[13px] opacity-70 transition hover:opacity-100">
                  Membership
                </Link>
              </li>
              <li>
                <Link href="#" className="text-[13px] opacity-70 transition hover:opacity-100">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-6 text-xs opacity-50">
          <p>© [Year] Prime Sports. All rights reserved.</p>
          <p>[Facility address] · [Contact]</p>
        </div>
      </div>
    </footer>
  );
}