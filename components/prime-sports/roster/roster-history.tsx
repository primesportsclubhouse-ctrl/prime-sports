'use client';

import { useEffect, useMemo, useState } from "react";

import {
  primeSurfaceCardClass,
  primeToolbarTextButtonClass,
  RosterSessionHistoryEntry,
  RosterSessionStatus,
  SportKey,
} from "@/lib/prime-sports";

type RosterHistoryProps = {
  sport: SportKey;
};

type StatusFilter = "all" | RosterSessionStatus;

const PAGE_SIZE = 8;

const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "no-show", label: "No-Show" },
  { key: "cancelled", label: "Cancelled" },
];

const statusPillClass: Record<RosterSessionStatus, string> = {
  completed: "border-success/50 bg-[rgba(34,197,94,0.12)] text-success",
  "no-show": "border-accent/50 bg-[rgba(200,55,45,0.1)] text-accent",
  cancelled: "border-border bg-surface-muted text-muted",
};

const statusLabel: Record<RosterSessionStatus, string> = {
  completed: "Completed",
  "no-show": "No-Show",
  cancelled: "Cancelled",
};

export default function RosterHistory({ sport }: RosterHistoryProps) {
  const [history, setHistory] = useState<RosterSessionHistoryEntry[]>([]);
  // Tracks which `sport` the current `history` actually reflects — mirrors
  // roster-client.tsx's `loadedOptionsDate`/`isLoadingOptions` pair:
  // `isLoading` is derived from comparing the two rather than a separate
  // boolean flipped synchronously at the top of the fetch effect (that flip
  // would be a setState call with no preceding `await`, which the
  // react-hooks/set-state-in-effect rule flags as state that could just be
  // computed during render instead).
  const [loadedHistorySport, setLoadedHistorySport] = useState<SportKey | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isLoading = loadedHistorySport !== sport;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [loadedSport, setLoadedSport] = useState(sport);

  // Switching the roster tabs' sport swaps to a different court roster —
  // clear stale filters/pagination synchronously so the new sport never
  // opens on a leftover filter from the previous one, even before the fetch
  // below resolves. Adjusted during render (React's documented pattern for
  // state derived from a changed prop) rather than an effect, so it settles
  // before paint instead of after.
  if (sport !== loadedSport) {
    setLoadedSport(sport);
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  }

  // Real replacement for the old mock createRosterSessionHistory() —
  // fetches the derived past-sessions ledger for whichever sport's roster
  // tab is active from GET /api/roster-sessions/history.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/roster-sessions/history?sport=${encodeURIComponent(sport)}`);
        const data = await response.json();

        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setLoadError(data?.error ?? "Could not load session history.");
          setHistory([]);
          setLoadedHistorySport(sport);
          return;
        }

        setLoadError(null);
        setHistory(Array.isArray(data.sessions) ? data.sessions : []);
        setLoadedHistorySport(sport);
      } catch {
        if (!cancelled) {
          setLoadError("Network error — could not load session history.");
          setHistory([]);
          setLoadedHistorySport(sport);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sport]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return history.filter((entry) => {
      if (statusFilter !== "all" && entry.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return entry.organizer.toLowerCase().includes(query) || entry.court.toLowerCase().includes(query);
    });
  }, [history, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateStatusFilter(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  return (
    <div data-od-id="roster-history">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => updateSearch(event.target.value)}
          placeholder="Search by organizer or court…"
          aria-label="Search past sessions"
          className="min-h-10 w-full max-w-[280px] rounded-[var(--radius)] border border-border bg-surface-muted px-3 text-[13px] font-normal outline-none transition focus:border-accent-secondary max-[480px]:max-w-none"
        />
        <div className="inline-flex flex-wrap gap-1 rounded-[var(--radius)] border border-border bg-surface-muted p-1" role="tablist" aria-label="Filter by status">
          {statusFilters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={statusFilter === key}
              className={`rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.05em] transition ${
                statusFilter === key ? "bg-accent-secondary text-canvas shadow-[var(--shadow-sm)]" : "text-foreground/70 hover:text-foreground"
              }`}
              onClick={() => updateStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[12px] opacity-55">
          {isLoading ? "Loading…" : `${filtered.length} session${filtered.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {loadError ? <p className="mb-4 text-xs font-medium text-accent">{loadError}</p> : null}

      <div className={`${primeSurfaceCardClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-[11px] font-bold uppercase tracking-[0.06em] opacity-65">
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold">Court</th>
                <th className="px-4 py-3 font-bold">Time Slot</th>
                <th className="px-4 py-3 font-bold">Organizer</th>
                <th className="px-4 py-3 font-bold">Players</th>
                <th className="px-4 py-3 font-bold">Duration</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] opacity-50">
                    Loading past sessions…
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] opacity-50">
                    No past sessions match your filters.
                  </td>
                </tr>
              ) : (
                pageItems.map((entry) => (
                  <tr key={entry.id} className="border-b border-border transition hover:bg-surface-muted">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${statusPillClass[entry.status]}`}>
                        {statusLabel[entry.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 [font-family:var(--font-mono)] tabular-nums">{entry.date}</td>
                    <td className="px-4 py-3">{entry.court}</td>
                    <td className="px-4 py-3 [font-family:var(--font-mono)] tabular-nums">{entry.timeSlot}</td>
                    <td className="px-4 py-3 font-semibold">{entry.organizer}</td>
                    <td className="px-4 py-3 [font-family:var(--font-mono)] tabular-nums">
                      {entry.playersCheckedIn} / {entry.capacity}
                    </td>
                    <td className="px-4 py-3 [font-family:var(--font-mono)] tabular-nums">{entry.durationMinutes} min</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <span className="text-[12px] opacity-60">
            Page {safePage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className={primeToolbarTextButtonClass}
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              ← Prev
            </button>
            <button
              type="button"
              className={primeToolbarTextButtonClass}
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
