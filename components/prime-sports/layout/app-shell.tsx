import { ReactNode } from "react";

import SiteFooter from "@/components/prime-sports/layout/site-footer";
import SiteHeader from "@/components/prime-sports/layout/site-header";
import { ContainerVariant } from "@/lib/prime-sports";

type AppShellProps = {
  currentPath: string;
  children: ReactNode;
  simple?: boolean;
  containerVariant?: ContainerVariant;
};

export default function AppShell({
  currentPath,
  children,
  simple = false,
  containerVariant = "default",
}: AppShellProps) {
  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen flex-col">
        <SiteHeader
          currentPath={currentPath}
          containerVariant={containerVariant}
          simple={simple}
        />
        <main className="flex-1">{children}</main>
        <SiteFooter
          currentPath={currentPath}
          simple={simple}
          containerVariant={containerVariant}
        />
      </div>
    </div>
  );
}