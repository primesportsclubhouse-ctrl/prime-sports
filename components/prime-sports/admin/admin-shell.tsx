import { ReactNode } from "react";
import Link from "next/link";

import { getPrimeContainerClassName } from "@/lib/prime-sports";

type AdminShellProps = {
  children: ReactNode;
  title: string;
  description: string;
  currentPath: "/admin/dashboard" | "/admin/roster";
};

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/roster", label: "Roster" },
] as const;

export default function AdminShell({
  children,
  title,
  description,
  currentPath,
}: AdminShellProps) {
  const containerClassName = getPrimeContainerClassName("wide");

  return (
    <div className="min-h-screen bg-[radial-gradient(120%_140%_at_10%_0%,rgba(212,163,89,0.16)_0%,transparent_45%),linear-gradient(180deg,var(--canvas)_0%,var(--surface-muted)_100%)]">
      <header className="sticky top-0 z-40 border-b border-border bg-[rgba(11,27,43,0.9)] backdrop-blur-[8px] backdrop-saturate-150">
        <div className={`${containerClassName} flex min-h-16 items-center justify-between gap-3`}>
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2">
            <span className="[font-family:var(--font-heading)] text-[18px] font-extrabold uppercase tracking-[0.06em]">Prime Sports</span>
            <span className="rounded border border-accent-secondary bg-[rgba(212,163,89,0.12)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-secondary">
              Staff
            </span>
          </Link>

          <nav className="flex items-center gap-2" aria-label="Admin navigation">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-[var(--radius)] border px-3 py-2 text-[12px] font-bold uppercase tracking-[0.08em] transition ${currentPath === link.href ? "border-accent-secondary bg-[rgba(212,163,89,0.12)] text-accent-secondary" : "border-border bg-surface text-foreground hover:border-accent-secondary"}`}
                aria-current={currentPath === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/admin"
              className="rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-[12px] font-bold uppercase tracking-[0.08em] text-foreground transition hover:border-accent hover:text-accent"
            >
              Logout
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-border py-8">
          <div className={containerClassName}>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">Protected Dashboard · Staff</p>
            <h1 className="[font-family:var(--font-heading)] text-[clamp(30px,4vw,46px)] font-extrabold uppercase leading-[1.05] tracking-[0.06em]">
              {title}
            </h1>
            <p className="mt-2 max-w-[70ch] text-sm opacity-70">{description}</p>
          </div>
        </section>

        {children}
      </main>
    </div>
  );
}
