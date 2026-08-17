'use client';

// Public, booking-scoped roster check-in — the booker's own link (shared via
// the booking-confirmation email, see approve/route.ts + lib/email.ts) lets
// them and their group check themselves in instead of staff doing it player
// by player. Deliberately its own component, not a reuse of
// components/prime-sports/roster/roster-client.tsx: that one is a
// staff-browsing tool (date/sport/booking picker across every court) that
// has nothing to do with a booker who already knows exactly which booking
// they're checking into. There is intentionally NO "End Session" control
// here — ending a session is staff-only; this view is check-in only.

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { parseDateStringLocal, timeSlotToHour24 } from "@/lib/booking";
import {
  formatHour12,
  formatPrimeDate,
  primeButtonPrimaryClass,
  primeContainerClasses,
  primeStatusPillBaseClass,
  primeSurfaceCardClass,
} from "@/lib/prime-sports";
import { DEFAULT_ROSTER_CAPACITY, type RosterBookingSummary, type RosterSessionDetail } from "@/lib/roster";
import { useRealtimeRefresh } from "@/lib/supabase/realtime";

const nameInputClassName =
  "min-h-10 w-full min-w-0 rounded-[var(--radius)] border border-border bg-surface-muted px-3 text-[13px] font-medium text-foreground outline-none transition placeholder:text-muted/50 focus:border-accent-secondary";

function formatTimeSlotLabel(timeSlot: string) {
  return formatHour12(timeSlotToHour24(timeSlot));
}

function formatCheckInTime(iso: string | null) {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

type PublicRosterCheckinProps = {
  bookingId: string;
};

export default function PublicRosterCheckin({ bookingId }: PublicRosterCheckinProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [booking, setBooking] = useState<RosterBookingSummary | null>(null);
  const [session, setSession] = useState<RosterSessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newPlayerName, setNewPlayerName] = useState("");
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Shared by the mount effect below and by the realtime subscription's
  // background refresh — both need the exact same "go re-fetch what this
  // link is authorized to see" request.
  const loadCheckin = useCallback(async () => {
    try {
      const query = token ? `?token=${encodeURIComponent(token)}` : "";
      const response = await fetch(`/api/roster-sessions/by-booking/${bookingId}${query}`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setLoadError(data?.error ?? "Could not load this check-in link.");
        return;
      }

      setLoadError(null);
      setBooking(data?.booking ?? null);
      setSession(data?.session ?? null);
    } catch {
      setLoadError("Network error — could not load this check-in link.");
    }
  }, [bookingId, token]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await loadCheckin();
      if (!cancelled) {
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadCheckin]);

  // Live updates: once staff activates the session (Organizer Check-In on
  // roster-client.tsx), or adds/removes/toggles a player from that staff
  // view, this page reflects it without the booker needing to manually
  // refresh — this is what turns the "hasn't started yet" waiting state into
  // the live check-in view the moment staff flips the switch. Disabled once
  // this link is already known to be invalid (403/404) — no point polling a
  // dead link forever. Falls back to polling internally if the realtime
  // channel never subscribes — see lib/supabase/realtime.ts.
  useRealtimeRefresh(
    `public-roster-checkin-${bookingId}`,
    ["roster_sessions", "roster_entries"],
    () => {
      void loadCheckin();
    },
    { enabled: !loadError },
  );

  const sessionActive = session?.active ?? false;
  const capacity = session?.capacity ?? DEFAULT_ROSTER_CAPACITY;
  const players = session?.entries ?? [];
  const atCapacity = players.length >= capacity;

  /** Adds a player, auto-checked-in — matches roster-client.tsx's own
   *  addPlayer() default (`checked_in: true` on insert). Reuses the exact
   *  same POST /api/roster-sessions/[id]/entries route staff uses, just
   *  authorized via `sessionToken` (the guest path) instead of a staff
   *  cookie session. */
  async function addPlayer() {
    const playerName = newPlayerName.trim();
    if (!session || !sessionActive || atCapacity || !playerName || isAddingPlayer) {
      return;
    }

    setIsAddingPlayer(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/roster-sessions/${session.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName, sessionToken: token }),
      });
      const data = await response.json();
      if (!response.ok) {
        setActionError(data?.error ?? "Could not add this player.");
        return;
      }
      setSession(data.session ?? null);
      setNewPlayerName("");
    } catch {
      setActionError("Network error — could not add this player.");
    } finally {
      setIsAddingPlayer(false);
    }
  }

  async function toggleCheckedIn(entryId: string, checkedIn: boolean) {
    if (!session || pendingEntryId) {
      return;
    }

    setPendingEntryId(entryId);
    setActionError(null);

    try {
      const response = await fetch(`/api/roster-sessions/${session.id}/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkedIn, sessionToken: token }),
      });
      const data = await response.json();
      if (!response.ok) {
        setActionError(data?.error ?? "Could not update this player.");
        return;
      }
      setSession(data.session ?? null);
    } catch {
      setActionError("Network error — could not update this player.");
    } finally {
      setPendingEntryId(null);
    }
  }

  /** Removes a player this link's owner added — same DELETE route staff
   *  uses, with `sessionToken` (not a staff cookie) as the query-param
   *  ownership proof, matching that route's existing dual-mode contract. */
  async function removePlayer(entryId: string) {
    if (!session || pendingEntryId) {
      return;
    }

    setPendingEntryId(entryId);
    setActionError(null);

    try {
      const response = await fetch(
        `/api/roster-sessions/${session.id}/entries/${entryId}?sessionToken=${encodeURIComponent(token ?? "")}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) {
        setActionError(data?.error ?? "Could not remove this player.");
        return;
      }
      setSession(data.session ?? null);
    } catch {
      setActionError("Network error — could not remove this player.");
    } finally {
      setPendingEntryId(null);
    }
  }

  const containerClassName = primeContainerClasses.narrow;

  if (isLoading) {
    return (
      <section className={`${containerClassName} py-16 text-center text-[13px] opacity-60`}>
        Loading your check-in…
      </section>
    );
  }

  if (loadError || !booking) {
    return (
      <section className={`${containerClassName} py-16`}>
        <div className={`${primeSurfaceCardClass} p-6 text-center`}>
          <h2 className="[font-family:var(--font-heading)] text-lg font-extrabold uppercase tracking-[0.05em]">
            Check-in link not available
          </h2>
          <p className="mt-2 text-[13px] opacity-70">
            {loadError ?? "We couldn't find this booking."} If you think this is a mistake, please contact the club.
          </p>
        </div>
      </section>
    );
  }

  const bookingDateLabel = formatPrimeDate(parseDateStringLocal(booking.bookingDate));
  const timeSlotLabel = formatTimeSlotLabel(booking.timeSlot);

  return (
    <section className={`${containerClassName} py-10`} data-od-id="public-roster-checkin">
      <div className={`${primeSurfaceCardClass} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4 max-[480px]:flex-col max-[480px]:items-stretch">
          <div>
            <h2 className="[font-family:var(--font-heading)] text-[22px] font-extrabold uppercase tracking-[0.06em]">
              {booking.courtName}
            </h2>
            <p className="mt-1 text-xs [font-family:var(--font-mono)] font-medium opacity-60 tabular-nums">
              {bookingDateLabel} · {timeSlotLabel}
            </p>
          </div>
          <span
            className={`${primeStatusPillBaseClass} ${
              sessionActive
                ? "border-accent-secondary bg-[rgba(212,163,89,0.12)] text-accent-secondary"
                : "border-border bg-surface-muted text-muted"
            }`}
          >
            <span className={`size-2 rounded-full ${sessionActive ? "bg-accent-secondary" : "bg-inactive"}`} />
            <span>{sessionActive ? "Check-In Open" : "Not Started"}</span>
          </span>
        </div>
        <div className="mt-4 border-t border-border pt-4 text-[13px] opacity-70">
          Booked by <strong>{booking.customerName ?? "Guest"}</strong>
        </div>
      </div>

      {!session || !session.active ? (
        <div className="mt-6 rounded-[var(--radius)] border border-dashed border-border bg-surface-muted p-8 text-center text-[13px] opacity-70">
          A PrimeSports staff member hasn&apos;t started check-in yet — this page will update once your court session begins.
        </div>
      ) : (
        <div className="mt-6" data-od-id="public-roster-entries">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border border-border bg-surface-muted px-5 py-4 max-[480px]:flex-col max-[480px]:items-stretch">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-65">Players Checked In</h3>
              <div className="mt-1 [font-family:var(--font-mono)] text-[28px] font-semibold leading-none tabular-nums">
                <span>{players.length}</span>
                <span className="text-lg opacity-50"> / {capacity} Players Max</span>
              </div>
            </div>
            <div className="h-2 max-w-[240px] flex-1 overflow-hidden rounded-full bg-border max-[480px]:max-w-none">
              <div
                className="h-full rounded-full bg-accent-secondary transition-[width] duration-300"
                style={{ width: `${(players.length / capacity) * 100}%` }}
              />
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="[font-family:var(--font-heading)] text-lg font-extrabold uppercase tracking-[0.06em]">
              Add Your Group
            </h2>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 max-[480px]:w-full">
              <input
                type="text"
                value={newPlayerName}
                onChange={(event) => setNewPlayerName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void addPlayer();
                  }
                }}
                placeholder="Player name"
                aria-label="Player name"
                disabled={atCapacity}
                className={`${nameInputClassName} max-w-[220px]`}
              />
              <button
                type="button"
                className={`${primeButtonPrimaryClass} min-h-9 shrink-0 px-3.5 text-[13px]`}
                aria-disabled={atCapacity || !newPlayerName.trim() || isAddingPlayer}
                disabled={atCapacity || !newPlayerName.trim() || isAddingPlayer}
                onClick={() => void addPlayer()}
              >
                {isAddingPlayer ? "Adding…" : "+ Add Player"}
              </button>
            </div>
          </div>

          {actionError ? <p className="mb-3 text-xs font-medium text-accent">{actionError}</p> : null}

          <ul className="flex list-none flex-col gap-2 p-0">
            {players.map((player) => {
              const initial = player.playerName.trim().charAt(0).toUpperCase() || "?";
              const checkInTime = formatCheckInTime(player.checkInTime);
              const isBusy = pendingEntryId === player.id;

              return (
                <li
                  key={player.id}
                  className="grid grid-cols-[40px_1fr_auto_auto] items-center gap-3 rounded-[var(--radius)] border border-border bg-surface p-3 max-[640px]:grid-cols-[40px_1fr_auto]"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-accent-secondary [font-family:var(--font-heading)] text-base font-extrabold uppercase text-canvas">
                    {initial}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{player.playerName}</div>
                    <div className="text-[11px] [font-family:var(--font-mono)] font-medium opacity-55 tabular-nums">
                      {checkInTime ? `Checked in ${checkInTime}` : "Not checked in"}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isBusy}
                    className={`${primeStatusPillBaseClass} px-2.5 py-1 tracking-[0.05em] ${
                      player.checkedIn
                        ? "border-accent-secondary bg-[rgba(212,163,89,0.12)] text-accent-secondary"
                        : "border-border bg-surface-muted text-muted"
                    }`}
                    onClick={() => void toggleCheckedIn(player.id, !player.checkedIn)}
                  >
                    {player.checkedIn ? "Checked In" : "Pending"}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    className="px-2 py-1 text-lg leading-none text-foreground/30 transition hover:text-accent hover:opacity-100 max-[640px]:col-[2_/_-1] max-[640px]:justify-self-end"
                    aria-label="Remove player"
                    onClick={() => void removePlayer(player.id)}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>

          {players.length === 0 ? (
            <div className="rounded-[var(--radius)] border border-dashed border-border bg-surface p-8 text-center text-[13px] opacity-60">
              No players checked in yet. Add your group above.
            </div>
          ) : null}

          {atCapacity ? (
            <div className="mt-3 rounded-[var(--radius)] bg-accent px-4 py-3 text-[13px] font-semibold text-foreground">
              <strong>Court at capacity.</strong> {capacity} / {capacity} players checked in. Remove a player to add
              another.
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
