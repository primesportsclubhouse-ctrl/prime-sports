'use client';

import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, FileText, LogOut, Menu, PhilippinePeso, SlidersHorizontal, Users, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { primeToolbarIconButtonClass } from "@/lib/prime-sports";
import { useRealtimeRefresh } from "@/lib/supabase/realtime";

import adminLogo from "@/public/prime-sports/header-logo.png";

export type AdminRoute =
  | "/admin/dashboard"
  | "/admin/availability"
  | "/admin/rates"
  | "/admin/queue"
  | "/admin/roster"
  | "/admin/content";

const adminNavLinks: { href: AdminRoute; label: string; icon: typeof CalendarDays }[] = [
  { href: "/admin/dashboard", label: "Master Calendar", icon: CalendarDays },
  { href: "/admin/availability", label: "Availability", icon: SlidersHorizontal },
  { href: "/admin/queue", label: "Verification Queue", icon: ClipboardList },
  { href: "/admin/rates", label: "Rate Cards", icon: PhilippinePeso },
  { href: "/admin/roster", label: "Roster", icon: Users },
  { href: "/admin/content", label: "Facility Content", icon: FileText },
];

const COLLAPSE_STORAGE_KEY = "prime-admin-sidebar-collapsed";

// The collapse preference is read from localStorage, which can differ
// between the server render (always expanded — no `window`) and what a
// returning admin last chose on this device. Since collapsed vs. expanded
// renders a genuinely different nav subtree (icon rail vs. full labels),
// this needs `useSyncExternalStore`, not a plain `useState` — it's the one
// hook React guarantees renders the server/hydration snapshot first and
// only swaps to the real client value in a follow-up update, so hydration
// never has to reconcile two different trees in the same pass.
const collapseListeners = new Set<() => void>();

function subscribeToCollapsePreference(onChange: () => void) {
  collapseListeners.add(onChange);
  return () => {
    collapseListeners.delete(onChange);
  };
}

function getCollapsePreference() {
  return window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1";
}

function getServerCollapsePreference() {
  return false;
}

function setCollapsePreference(next: boolean) {
  window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
  collapseListeners.forEach((onChange) => onChange());
}

type AdminSidebarProps = {
  currentPath: AdminRoute;
};

export default function AdminSidebar({ currentPath }: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isCollapsed = useSyncExternalStore(subscribeToCollapsePreference, getCollapsePreference, getServerCollapsePreference);
  const [pendingCount, setPendingCount] = useState(0);

  // Best-effort badge count for the Verification Queue nav item — a failed
  // fetch just leaves the last-known count showing rather than breaking
  // sidebar navigation. Fetched on mount, then kept live by the realtime
  // subscription below (same "await before setState" shape as
  // master-calendar.tsx's fetch effect, required by react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/payment-submissions/pending-count");
        if (cancelled || !response.ok) {
          return;
        }
        const body: { count?: number } = await response.json();
        if (!cancelled) {
          setPendingCount(typeof body.count === "number" ? body.count : 0);
        }
      } catch {
        // Ignored — best-effort.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useRealtimeRefresh("admin-sidebar-pending-count", ["payment_submissions"], () => {
    void (async () => {
      try {
        const response = await fetch("/api/payment-submissions/pending-count");
        if (!response.ok) {
          return;
        }
        const body: { count?: number } = await response.json();
        setPendingCount(typeof body.count === "number" ? body.count : 0);
      } catch {
        // Ignored — best-effort.
      }
    })();
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function toggleCollapsed() {
    setCollapsePreference(!isCollapsed);
  }

  // Shared between the desktop aside and the mobile drawer — `collapsed` is
  // only ever true for the desktop aside; the mobile drawer always renders
  // full-width since it's already a temporary overlay, not a fixed rail.
  function renderNav(collapsed: boolean, onToggleCollapse: (() => void) | null) {
    return (
      <>
        <div className={`flex items-center border-b border-border ${collapsed ? "flex-col gap-3 px-2 py-4" : "justify-between gap-2 px-5 py-5"}`}>
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2"
            onClick={() => setIsOpen(false)}
            title={collapsed ? "Prime Sports Staff" : undefined}
          >
            <Image
              src={adminLogo}
              alt="Prime Sports"
              priority
              className={`w-auto object-contain ${collapsed ? "h-8" : "h-9"}`}
            />
            {collapsed ? null : (
              <span className="rounded border border-accent-secondary bg-[rgba(212,163,89,0.12)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-secondary">
                Staff
              </span>
            )}
          </Link>

          {onToggleCollapse ? (
            <button
              type="button"
              className={primeToolbarIconButtonClass}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={onToggleCollapse}
            >
              {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}
            </button>
          ) : null}
        </div>

        <nav className={`flex-1 space-y-1 py-4 ${collapsed ? "px-2" : "px-3"}`} aria-label="Admin navigation">
          {adminNavLinks.map((link) => {
            const Icon = link.icon;
            const isActive = currentPath === link.href;
            const badgeCount = link.href === "/admin/queue" ? pendingCount : 0;
            const badgeLabel = badgeCount > 99 ? "99+" : String(badgeCount);

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? `${link.label}${badgeCount > 0 ? ` (${badgeCount} pending)` : ""}` : undefined}
                className={`flex items-center rounded-[var(--radius)] text-[13px] font-bold uppercase tracking-[0.04em] transition ${
                  collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
                } ${
                  isActive
                    ? "bg-accent-secondary text-canvas shadow-[var(--shadow-sm)]"
                    : "text-foreground/70 hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                <span className="relative inline-flex">
                  <Icon size={17} aria-hidden="true" />
                  {collapsed && badgeCount > 0 ? (
                    <span
                      className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                  ) : null}
                </span>
                {collapsed ? (
                  <span className="sr-only">
                    {link.label}
                    {badgeCount > 0 ? ` (${badgeCount} pending)` : ""}
                  </span>
                ) : (
                  <span className="flex flex-1 items-center justify-between gap-2">
                    {link.label}
                    {badgeCount > 0 ? (
                      <span
                        className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold tracking-normal text-canvas"
                        aria-hidden="true"
                      >
                        {badgeLabel}
                      </span>
                    ) : null}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <form action="/api/auth/logout" method="post" className={`border-t border-border ${collapsed ? "p-2" : "p-3"}`}>
          <button
            type="submit"
            title={collapsed ? "Logout" : undefined}
            className={`flex w-full items-center rounded-[var(--radius)] text-[13px] font-bold uppercase tracking-[0.04em] text-foreground/70 transition hover:bg-surface-muted hover:text-accent ${
              collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
            }`}
          >
            <LogOut size={17} aria-hidden="true" />
            {collapsed ? <span className="sr-only">Logout</span> : "Logout"}
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      {/* Mobile top bar — the persistent sidebar below only renders ≥921px. */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-[rgba(11,27,43,0.9)] px-4 py-3 backdrop-blur-[8px] min-[921px]:hidden">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <Image src={adminLogo} alt="Prime Sports" priority className="h-9 w-auto object-contain" />
          <span className="rounded border border-accent-secondary bg-[rgba(212,163,89,0.12)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-secondary">
            Staff
          </span>
        </Link>
        <button
          type="button"
          className={primeToolbarIconButtonClass}
          aria-expanded={isOpen}
          aria-controls="admin-sidebar-drawer"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
      </div>

      {/* Desktop persistent sidebar — collapsible to an icon-only rail, preference remembered in localStorage. */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 min-[921px]:flex ${
          isCollapsed ? "w-[76px]" : "w-64"
        }`}
      >
        {renderNav(isCollapsed, toggleCollapsed)}
      </aside>

      {/* Mobile off-canvas drawer — always full-width regardless of desktop collapse state. */}
      {isOpen ? (
        <div className="fixed inset-0 z-50 min-[921px]:hidden">
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 cursor-default bg-black/50 backdrop-blur-[2px]"
            onClick={() => setIsOpen(false)}
          />
          <aside
            id="admin-sidebar-drawer"
            className="fixed inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col border-r border-border bg-surface shadow-[var(--shadow-lg)]"
          >
            {renderNav(false, null)}
          </aside>
        </div>
      ) : null}
    </>
  );
}
