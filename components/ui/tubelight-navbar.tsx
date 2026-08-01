"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, CircleDollarSign, CircleHelp, CircleSlash, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  url: string;
  icon: string;
}

interface NavBarProps {
  items: NavItem[];
  className?: string;
  placement?: "top" | "bottom";
}

export function NavBar({ items, className, placement = "top" }: NavBarProps) {
  const firstItemName = useMemo(() => items[0]?.name ?? "", [items]);
  const [activeTab, setActiveTab] = useState(firstItemName);

  const iconMap = {
    pricing: CircleDollarSign,
    facility: Building2,
    faq: CircleHelp,
    location: MapPin,
  } as const;

  useEffect(() => {
    if (!items.length) {
      return;
    }

    const updateFromHash = () => {
      const currentHash = window.location.hash;
      const matchingItem = items.find((item) => {
        const urlHash = item.url.split("#")[1];
        return urlHash ? `#${urlHash}` === currentHash : false;
      });

      setActiveTab(matchingItem?.name ?? items[0].name);
    };

    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);

    return () => {
      window.removeEventListener("hashchange", updateFromHash);
    };
  }, [items]);

  if (!items.length) {
    return null;
  }

  const placementClassName =
    placement === "bottom"
      ? "fixed bottom-4 left-1/2 z-40 -translate-x-1/2 md:bottom-6"
      : "relative z-40";

  return (
    <div
      className={cn(
        placementClassName,
        className,
      )}
    >
      <div className="flex items-center gap-1 p-1.5 shadow-[var(--shadow-md)] backdrop-blur-[10px]">
        {items.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap] ?? CircleSlash;
          const isActive = activeTab === item.name;

          return (
            <Link
              key={item.name}
              href={item.url}
              onClick={() => setActiveTab(item.name)}
              className={cn(
                "relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-3.5 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] transition-colors md:px-5",
                "text-foreground/80 hover:text-accent-secondary",
                isActive && "text-accent-secondary",
              )}
              aria-label={item.name}
            >
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden" aria-hidden="true">
                <Icon size={18} strokeWidth={2.4} />
              </span>
              {isActive && (
                <motion.div
                  layoutId="prime-section-lamp"
                  className="absolute inset-0 -z-10 rounded-full border border-accent-secondary/35 bg-[rgba(212,163,89,0.15)]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 280, damping: 28 }}
                >
                  <div className="absolute -top-1.5 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-t-full bg-accent-secondary/80">
                    <div className="absolute -left-2 -top-1.5 h-5 w-14 rounded-full bg-accent-secondary/25 blur-md" />
                  </div>
                </motion.div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
