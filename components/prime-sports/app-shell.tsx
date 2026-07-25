import { ReactNode } from "react";

import SiteFooter from "@/components/prime-sports/site-footer";
import SiteHeader from "@/components/prime-sports/site-header";
import { ContainerVariant } from "@/lib/prime-sports";

type AppShellProps = {
  currentPath: string;
  children: ReactNode;
  footerSimple?: boolean;
  containerVariant?: ContainerVariant;
  headerBadgeLabel?: string;
};

export default function AppShell({
  currentPath,
  children,
  footerSimple = false,
  containerVariant = "default",
  headerBadgeLabel,
}: AppShellProps) {
  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen flex-col">
        <SiteHeader
          currentPath={currentPath}
          containerVariant={containerVariant}
          badgeLabel={headerBadgeLabel}
        />
        <main className="flex-1">{children}</main>
        <SiteFooter
          currentPath={currentPath}
          simple={footerSimple}
          containerVariant={containerVariant}
        />
      </div>
    </div>
  );
}