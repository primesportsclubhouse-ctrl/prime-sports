import Link from "next/link";

import { getPrimeContainerClassName, primeNavLinks } from "@/lib/prime-sports";
import { fetchFacilitySettings } from "@/lib/supabase/facility-content";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type SiteFooterProps = {
  currentPath: string;
  simple?: boolean;
  containerVariant?: "default" | "narrow" | "wide";
};

/** Server Component direct read, same rationale as app/(public)/page.tsx's
 *  `getFaqItems()` — this component has no client hooks, so there's no need
 *  to round-trip through GET /api/facility-settings over HTTP. Returns the
 *  literal "[Contact]" placeholder (not a fetch error, and not a fabricated
 *  phone number) whenever neither `contact_phone` nor `contact_email` is set
 *  yet — which is the honest, unfilled-placeholder state facility_settings
 *  seeds today; see the Phase 3 content-management seed migration's own
 *  comments on why no contact info was invented to seed with. */
async function getContactLabel(): Promise<string> {
  try {
    const supabase = createServiceRoleClient();
    const settings = await fetchFacilitySettings(supabase);
    return settings.contactPhone || settings.contactEmail || "[Contact]";
  } catch {
    return "[Contact]";
  }
}

export default async function SiteFooter({
  currentPath,
  simple = false,
  containerVariant = "default",
}: SiteFooterProps) {
  const containerClassName = getPrimeContainerClassName(containerVariant);
  const contactLabel = await getContactLabel();

  if (simple) {
    return (
      <footer className="mt-10 border-t border-border py-8" data-od-id="site-footer">
        <div className={`${containerClassName} flex flex-wrap items-center justify-between gap-4 text-[13px] opacity-60`}>
          <p>© 2026 PrimeSports Clubhouse. All rights reserved.</p>
          <p>Highway, Minglanilla, Cebu · {contactLabel}</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="px-0 pb-8 pt-12" data-od-id="site-footer">
      <div className={containerClassName}>
        <div className="mb-8 grid grid-cols-[2fr_1fr_1fr] gap-8 max-[920px]:grid-cols-1">
          <div>
            <div className="mb-2 inline-flex items-baseline gap-1 [font-family:var(--font-heading)] text-2xl font-extrabold uppercase tracking-[0.06em]">
              Prime Sports<span className="text-accent">.</span>
            </div>
            <p className="max-w-[40ch] text-[13px] opacity-60">
              Building communities, not just sports facilities.
            </p>
          </div>
          <div>
            <h5 className="mb-3 [font-family:var(--font-heading)] text-[11px] font-extrabold uppercase tracking-[0.08em] opacity-55">Platform</h5>
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
            <h5 className="mb-3 [font-family:var(--font-heading)] text-[11px] font-extrabold uppercase tracking-[0.08em] opacity-55">Club</h5>
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
          <p>© 2026 PrimeSports Clubhouse. All rights reserved.</p>
          <p>Highway, Minglanilla, Cebu · {contactLabel}</p>
        </div>
      </div>
    </footer>
  );
}