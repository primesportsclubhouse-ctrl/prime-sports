'use client';

import { Fragment, useMemo, useState } from "react";

import {
  createVerificationHistory,
  primeMetaLabelClass,
  primeSurfaceCardClass,
  primeToolbarTextButtonClass,
  QueueHistoryEntry,
} from "@/lib/prime-sports";

type StatusFilter = "all" | "approved" | "rejected";

const PAGE_SIZE = 8;

const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function VerificationHistory() {
  const [history] = useState<QueueHistoryEntry[]>(() => createVerificationHistory());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return history.filter((entry) => {
      if (statusFilter !== "all" && entry.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return entry.name.toLowerCase().includes(query) || entry.ref.toLowerCase().includes(query);
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
    <div data-od-id="verification-history">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => updateSearch(event.target.value)}
          placeholder="Search by customer or reference…"
          aria-label="Search resolved submissions"
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
          {filtered.length} record{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className={`${primeSurfaceCardClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-[11px] font-bold uppercase tracking-[0.06em] opacity-65">
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Customer</th>
                <th className="px-4 py-3 font-bold">Ref</th>
                <th className="px-4 py-3 font-bold">Court</th>
                <th className="px-4 py-3 font-bold">Time</th>
                <th className="px-4 py-3 font-bold">Amount</th>
                <th className="px-4 py-3 font-bold">Channel</th>
                <th className="px-4 py-3 font-bold">Resolved</th>
                <th className="px-4 py-3 font-bold">By</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[13px] opacity-50">
                    No history entries match your filters.
                  </td>
                </tr>
              ) : (
                pageItems.map((entry) => (
                  <Fragment key={entry.id}>
                    <tr
                      className="cursor-pointer border-b border-border transition hover:bg-surface-muted"
                      onClick={() => setExpandedId((current) => (current === entry.id ? null : entry.id))}
                      aria-expanded={expandedId === entry.id}
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${
                            entry.status === "approved"
                              ? "border-success/50 bg-[rgba(34,197,94,0.12)] text-success"
                              : "border-accent/50 bg-[rgba(200,55,45,0.1)] text-accent"
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">{entry.name}</td>
                      <td className="px-4 py-3 [font-family:var(--font-mono)] tabular-nums opacity-75">{entry.ref}</td>
                      <td className="px-4 py-3">{entry.court}</td>
                      <td className="px-4 py-3 [font-family:var(--font-mono)] tabular-nums">{entry.time}</td>
                      <td className="px-4 py-3 [font-family:var(--font-mono)] font-semibold tabular-nums">{entry.amount}</td>
                      <td className="px-4 py-3">{entry.channel}</td>
                      <td className="px-4 py-3 opacity-65">{entry.resolvedAt}</td>
                      <td className="px-4 py-3 opacity-65">{entry.resolvedBy}</td>
                    </tr>
                    {expandedId === entry.id ? (
                      <tr className="border-b border-border bg-canvas">
                        <td colSpan={9} className="px-4 py-4">
                          <dl className="grid grid-cols-3 gap-x-6 gap-y-3 max-[640px]:grid-cols-1">
                            <div>
                              <dt className={primeMetaLabelClass}>Phone</dt>
                              <dd className="m-0 text-[13px] font-semibold">{entry.phone}</dd>
                            </div>
                            <div>
                              <dt className={primeMetaLabelClass}>Email</dt>
                              <dd className="m-0 text-[13px] font-semibold">{entry.email}</dd>
                            </div>
                            <div>
                              <dt className={primeMetaLabelClass}>Customer Notes</dt>
                              <dd className="m-0 text-[13px] opacity-80">{entry.notes}</dd>
                            </div>
                          </dl>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
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
