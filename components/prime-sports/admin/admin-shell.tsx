import { ReactNode } from "react";

import AdminSidebar, { AdminRoute } from "@/components/prime-sports/admin/admin-sidebar";
import { getPrimeContainerClassName } from "@/lib/prime-sports";

type AdminShellProps = {
  children: ReactNode;
  title: string;
  description: string;
  currentPath: AdminRoute;
};

export default function AdminShell({
  children,
  title,
  description,
  currentPath,
}: AdminShellProps) {
  const containerClassName = getPrimeContainerClassName("wide");

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(120%_140%_at_10%_0%,rgba(212,163,89,0.16)_0%,transparent_45%),linear-gradient(180deg,var(--canvas)_0%,var(--surface-muted)_100%)] min-[921px]:flex-row">
      <AdminSidebar currentPath={currentPath} />

      <div className="min-w-0 flex-1">
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
    </div>
  );
}
