'use client';

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { parseCourtName, timeSlotToHour24, todayDateString } from "@/lib/booking";
import { DEFAULT_ROSTER_CAPACITY, type RosterBookingOption, type RosterSessionDetail } from "@/lib/roster";
import {
  formatHour12,
  formatPrimeDate,
  getSport,
  NextRosterSession,
  primeButtonPrimaryClass,
  primeButtonOutlineClass,
  primeContainerClasses,
  primeStatusPillBaseClass,
  primeSurfaceCardClass,
  SportKey,
  sports,
} from "@/lib/prime-sports";
import NextSessionDialog from "@/components/prime-sports/roster/next-session-dialog";
import RosterHistory from "@/components/prime-sports/roster/roster-history";

const selectClassName =
  "min-h-10 rounded-[var(--radius)] border border-border bg-surface-muted px-3 text-[13px] font-medium text-foreground outline-none transition focus:border-accent-secondary";

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

/** A booking's slot is "upcoming" if it's a future date, or today at/after
 *  the current hour — hourly granularity matches the club's hourly slot
 *  grid, so this doesn't need finer precision. */
function isSlotUpcoming(option: RosterBookingOption) {
  const today = todayDateString();
  if (option.bookingDate !== today) {
    return option.bookingDate > today;
  }
  return timeSlotToHour24(option.timeSlot) >= new Date().getHours();
}

function computeStartsInLabel(option: RosterBookingOption) {
  const diffMs = new Date(`${option.bookingDate}T${option.timeSlot}`).getTime() - Date.now();
  if (diffMs <= 0) {
    return "Starting now";
  }
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 60) {
    return `Starts in ${diffMin} min`;
  }
  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;
  return minutes > 0 ? `Starts in ${hours}h ${minutes}m` : `Starts in ${hours}h`;
}

/** Real replacement for lib/prime-sports.ts's mock createNextRosterSession()
 *  — builds the same NextRosterSession shape NextSessionDialog already
 *  expects, but from a real upcoming booking rather than deterministic fake
 *  data. `court` is the sport's short name (e.g. "Court 3"), matching what
 *  the mock version rendered — the sport is already shown as its own field
 *  in the dialog, so the full "Pickleball Court 3" DB name would be
 *  redundant there. */
function toNextRosterSession(option: RosterBookingOption, fallbackSport: SportKey): NextRosterSession {
  const parsed = parseCourtName(option.courtName);
  const sport = getSport(parsed?.sport ?? fallbackSport);
  const shortCourt = parsed ? sport.courtNames[parsed.courtIndex] ?? option.courtName : option.courtName;

  return {
    sport: sport.key,
    court: shortCourt,
    date: formatPrimeDate(new Date(`${option.bookingDate}T00:00:00`)),
    timeSlot: formatTimeSlotLabel(option.timeSlot),
    organizer: option.customerName ?? "Guest",
    capacity: option.session?.capacity ?? DEFAULT_ROSTER_CAPACITY,
    playersCheckedIn: option.session?.checkedInCount ?? 0,
    startsIn: computeStartsInLabel(option),
  };
}

function emptySelectionBySport(): Record<SportKey, string | null> {
  return { pickleball: null, badminton: null };
}

type RosterTab = "live" | "history";

export default function RosterClient() {
  const [activeSport, setActiveSport] = useState<SportKey>("pickleball");
  const [activeTab, setActiveTab] = useState<RosterTab>("live");
  const [showNextSession, setShowNextSession] = useState(false);

  const [date, setDate] = useState(() => todayDateString());
  const [bookingOptions, setBookingOptions] = useState<RosterBookingOption[]>([]);
  // Tracks which `date` the current `bookingOptions` actually reflects —
  // `isLoadingOptions` is derived from comparing the two below rather than a
  // separate boolean flipped inside the fetch effect, since that flip would
  // otherwise be a setState call with no preceding `await` (see the
  // react-hooks/set-state-in-effect comment on the session-loading state
  // further down for why that's avoided here).
  const [loadedOptionsDate, setLoadedOptionsDate] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // Each sport keeps its own selected booking so switching tabs never mixes
  // up which court/session is being managed — the underlying data is always
  // separated by booking_id anyway (see the Phase 2 roster migration), this
  // just keeps the picker's UI state separated to match.
  const [selectedBookingBySport, setSelectedBookingBySport] = useState<Record<SportKey, string | null>>(
    emptySelectionBySport,
  );

  const [session, setSession] = useState<RosterSessionDetail | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [newPlayerName, setNewPlayerName] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);

  const activeSportDefinition = getSport(activeSport);
  const isLoadingOptions = loadedOptionsDate !== date;

  // Loads every confirmed booking for the selected date across both sports
  // in one request — replaces the hardcoded "[Court name] · Session"
  // placeholder header with real data, and the mock createNextRosterSession()
  // ledger with a real "what's coming up" query. Bookings are matched to
  // sessions by booking_id, not by date/time alone, so a same-time
  // Pickleball vs. Badminton booking on the same day never collide.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/roster-sessions?date=${encodeURIComponent(date)}`);
        const data = await response.json();

        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setOptionsError(data?.error ?? "Could not load bookings for this date.");
          setBookingOptions([]);
          setLoadedOptionsDate(date);
          return;
        }

        setOptionsError(null);
        setBookingOptions(Array.isArray(data.bookings) ? data.bookings : []);
        setLoadedOptionsDate(date);
      } catch {
        if (!cancelled) {
          setOptionsError("Network error — could not load bookings for this date.");
          setBookingOptions([]);
          setLoadedOptionsDate(date);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date]);

  const optionsBySport = useMemo(() => {
    const grouped: Record<SportKey, RosterBookingOption[]> = { pickleball: [], badminton: [] };
    for (const option of bookingOptions) {
      const sport = sports.find((candidate) => option.courtName.startsWith(`${candidate.label} `));
      if (sport) {
        grouped[sport.key].push(option);
      }
    }
    return grouped;
  }, [bookingOptions]);

  // Keeps each sport's selection pointed at a booking that's actually in the
  // freshly loaded list (e.g. after changing the date), defaulting to the
  // earliest one instead of silently going stale. Adjusted during render
  // (React's documented pattern for state derived from a changed value,
  // already used the same way by roster-history.tsx's own sport-change
  // reset) rather than an effect, so it settles before paint instead of
  // after.
  const [lastOptionsBySport, setLastOptionsBySport] = useState(optionsBySport);
  if (optionsBySport !== lastOptionsBySport) {
    setLastOptionsBySport(optionsBySport);
    setSelectedBookingBySport((current) => {
      let changed = false;
      const next = { ...current };
      for (const sport of sports) {
        const options = optionsBySport[sport.key];
        const stillValid = current[sport.key] && options.some((option) => option.bookingId === current[sport.key]);
        if (!stillValid) {
          next[sport.key] = options[0]?.bookingId ?? null;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }

  const sportOptions = optionsBySport[activeSport];
  const selectedBookingId = selectedBookingBySport[activeSport];
  const selectedOption = useMemo(
    () => sportOptions.find((option) => option.bookingId === selectedBookingId) ?? null,
    [sportOptions, selectedBookingId],
  );

  const nextSessionOption = useMemo(
    () => sportOptions.find((option) => isSlotUpcoming(option) && option.bookingId !== selectedBookingId) ?? null,
    [sportOptions, selectedBookingId],
  );
  const nextSession = nextSessionOption ? toNextRosterSession(nextSessionOption, activeSport) : null;

  // The booking currently selected (if it has ever had a session) is the
  // source of truth for which session's detail should be loaded. Reset
  // `session` synchronously during render when that key changes — the same
  // render-phase-adjustment pattern used above — so a stale roster from a
  // previously selected booking never flashes while the new one loads.
  const sessionKey = selectedOption?.session?.id ?? null;
  const [lastSessionKey, setLastSessionKey] = useState<string | null>(sessionKey);
  if (sessionKey !== lastSessionKey) {
    setLastSessionKey(sessionKey);
    setSession(null);
    setSessionError(null);
  }
  const isLoadingSession = Boolean(sessionKey) && session?.id !== sessionKey;

  useEffect(() => {
    if (!sessionKey) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/roster-sessions/${sessionKey}`);
        const data = await response.json();

        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setSessionError(data?.error ?? "Could not load this roster session.");
          return;
        }
        setSession(data.session ?? null);
      } catch {
        if (!cancelled) {
          setSessionError("Network error — could not load this roster session.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  const sessionActive = session?.active ?? false;
  const capacity = session?.capacity ?? selectedOption?.session?.capacity ?? DEFAULT_ROSTER_CAPACITY;
  const players = session?.entries ?? [];
  const atCapacity = players.length >= capacity;

  function selectBookingForActiveSport(bookingId: string | null) {
    setSelectedBookingBySport((current) => ({ ...current, [activeSport]: bookingId }));
  }

  /** Organizer Check-In toggle. Turning it on activates (or reactivates) the
   *  session via POST /api/roster-sessions — the same endpoint whether this
   *  booking has never had a session or had one that already ended, since a
   *  booking only ever owns one roster_sessions row (unique on booking_id).
   *  Turning it off ends the session via PATCH but keeps every entry,
   *  unlike the old resetSession() which threw the whole local roster away. */
  async function toggleSession() {
    if (!selectedBookingId || isActivating) {
      return;
    }

    setIsActivating(true);
    setSessionError(null);

    try {
      if (!sessionActive) {
        const response = await fetch("/api/roster-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: selectedBookingId }),
        });
        const data = await response.json();
        if (!response.ok) {
          setSessionError(data?.error ?? "Could not activate this session.");
          return;
        }
        setSession(data.session ?? null);
      } else if (session) {
        const response = await fetch(`/api/roster-sessions/${session.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: false }),
        });
        const data = await response.json();
        if (!response.ok) {
          setSessionError(data?.error ?? "Could not end this session.");
          return;
        }
        setSession(data.session ?? null);
      }
    } catch {
      setSessionError("Network error — could not update this session.");
    } finally {
      setIsActivating(false);
    }
  }

  async function addPlayer() {
    const playerName = newPlayerName.trim();
    if (!session || !sessionActive || atCapacity || !playerName || isAddingPlayer) {
      return;
    }

    setIsAddingPlayer(true);
    setSessionError(null);

    try {
      const response = await fetch(`/api/roster-sessions/${session.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSessionError(data?.error ?? "Could not add this player.");
        return;
      }
      setSession(data.session ?? null);
      setNewPlayerName("");
    } catch {
      setSessionError("Network error — could not add this player.");
    } finally {
      setIsAddingPlayer(false);
    }
  }

  async function toggleCheckedIn(entryId: string, checkedIn: boolean) {
    if (!session || pendingEntryId) {
      return;
    }

    setPendingEntryId(entryId);
    setSessionError(null);

    try {
      const response = await fetch(`/api/roster-sessions/${session.id}/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkedIn }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSessionError(data?.error ?? "Could not update this player.");
        return;
      }
      setSession(data.session ?? null);
    } catch {
      setSessionError("Network error — could not update this player.");
    } finally {
      setPendingEntryId(null);
    }
  }

  async function removePlayer(entryId: string) {
    if (!session || pendingEntryId) {
      return;
    }

    setPendingEntryId(entryId);
    setSessionError(null);

    try {
      const response = await fetch(`/api/roster-sessions/${session.id}/entries/${entryId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        setSessionError(data?.error ?? "Could not remove this player.");
        return;
      }
      setSession(data.session ?? null);
    } catch {
      setSessionError("Network error — could not remove this player.");
    } finally {
      setPendingEntryId(null);
    }
  }

  const containerClassName = primeContainerClasses.wide;

  const headerCourtName = session?.courtName ?? selectedOption?.courtName ?? `No ${activeSportDefinition.label} booking selected`;
  const headerMeta = selectedOption
    ? `${formatPrimeDate(new Date(`${selectedOption.bookingDate}T00:00:00`))} · ${formatTimeSlotLabel(selectedOption.timeSlot)} · Ref ${selectedOption.bookingId.slice(0, 8).toUpperCase()}`
    : "Select a confirmed booking below to begin";
  const organizerName = selectedOption?.customerName ?? "—";

  return (
    <>
      <section className={`${containerClassName} mt-6`} data-od-id="roster-sport-tabs">
        <div role="tablist" aria-label="Roster sport" className="inline-flex flex-wrap gap-1 rounded-[var(--radius)] border border-border bg-surface-muted p-1">
          {sports.map((sport) => {
            const isActive = sport.key === activeSport;

            return (
              <button
                key={sport.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`rounded-[calc(var(--radius)-2px)] px-4 py-2 text-xs font-bold uppercase tracking-[0.05em] transition ${
                  isActive
                    ? sport.key === "badminton"
                      ? "bg-accent text-canvas shadow-[var(--shadow-sm)]"
                      : "bg-accent-secondary text-canvas shadow-[var(--shadow-sm)]"
                    : "text-foreground/70 hover:text-foreground"
                }`}
                onClick={() => setActiveSport(sport.key)}
              >
                {sport.label}
                <span className="ml-1.5 opacity-70">({optionsBySport[sport.key].length})</span>
              </button>
            );
          })}
        </div>
        <p className={`mt-2 text-[12px] font-bold uppercase tracking-[0.06em] ${activeSportDefinition.accentClass}`}>
          Now viewing — {activeSportDefinition.label} roster
        </p>
      </section>

      <section className={`${containerClassName} mt-6 pb-10`} data-od-id="roster-body">
        <div className="grid grid-cols-[280px_1fr] items-start gap-6 max-[900px]:grid-cols-1">
          <aside className={`${primeSurfaceCardClass} sticky top-6 p-4 max-[900px]:static`} data-od-id="next-session-panel">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] opacity-65">Next Session</h3>
            {nextSession ? (
              <button
                type="button"
                className="w-full rounded-[var(--radius)] border border-border bg-surface-muted p-3 text-left transition hover:-translate-y-px hover:shadow-[var(--shadow-sm)]"
                onClick={() => setShowNextSession(true)}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-[0.05em] ${activeSportDefinition.accentClass}`}>
                    {activeSportDefinition.label}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.04em] opacity-55">{nextSession.startsIn}</span>
                </div>
                <div className="text-sm font-semibold">{nextSession.court}</div>
                <div className="mt-1 text-[11px] [font-family:var(--font-mono)] font-medium opacity-60 tabular-nums">
                  {nextSession.date} · {nextSession.timeSlot}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-[11px] opacity-70">
                  <span>Booked by {nextSession.organizer}</span>
                  <span className="[font-family:var(--font-mono)] tabular-nums">
                    {nextSession.playersCheckedIn}/{nextSession.capacity}
                  </span>
                </div>
              </button>
            ) : (
              <div className="rounded-[var(--radius)] border border-dashed border-border bg-surface-muted p-3 text-center text-[12px] opacity-55">
                No upcoming {activeSportDefinition.label.toLowerCase()} bookings for this date.
              </div>
            )}
          </aside>

          <div data-od-id="roster-main">
            <div className="mb-6 inline-flex flex-wrap gap-1 rounded-[var(--radius)] border border-border bg-surface-muted p-1" role="tablist" aria-label="Roster view">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "live"}
                className={`rounded-[calc(var(--radius)-2px)] px-4 py-2 text-xs font-bold uppercase tracking-[0.05em] transition ${
                  activeTab === "live" ? "bg-accent-secondary text-canvas shadow-[var(--shadow-sm)]" : "text-foreground/70 hover:text-foreground"
                }`}
                onClick={() => setActiveTab("live")}
              >
                Live Session
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "history"}
                className={`rounded-[calc(var(--radius)-2px)] px-4 py-2 text-xs font-bold uppercase tracking-[0.05em] transition ${
                  activeTab === "history" ? "bg-accent-secondary text-canvas shadow-[var(--shadow-sm)]" : "text-foreground/70 hover:text-foreground"
                }`}
                onClick={() => setActiveTab("history")}
              >
                History
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {activeTab === "live" ? (
                <motion.div key="live" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: "easeOut" }}>
                  <div className={`${primeSurfaceCardClass} mb-6 flex flex-wrap items-center gap-3 p-4`} data-od-id="booking-picker">
                    <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em] opacity-65">
                      Date
                      <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={selectClassName} />
                    </label>
                    <label className="flex min-w-0 flex-1 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em] opacity-65">
                      {activeSportDefinition.label} Booking
                      <select
                        value={selectedBookingId ?? ""}
                        onChange={(event) => selectBookingForActiveSport(event.target.value || null)}
                        className={`${selectClassName} min-w-0 flex-1`}
                        disabled={isLoadingOptions || sportOptions.length === 0}
                      >
                        {sportOptions.length === 0 ? (
                          <option value="">No confirmed {activeSportDefinition.label.toLowerCase()} bookings for this date</option>
                        ) : (
                          sportOptions.map((option) => (
                            <option key={option.bookingId} value={option.bookingId}>
                              {option.courtName} · {formatTimeSlotLabel(option.timeSlot)} · {option.customerName ?? "Guest"}
                              {option.session?.active ? " (active)" : option.session ? " (ended)" : ""}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    {optionsError ? <p className="w-full text-xs font-medium text-accent">{optionsError}</p> : null}
                  </div>

                  <div data-od-id="attendance-session">
                    <div className={`${primeSurfaceCardClass} p-5`}>
                      <div className="flex flex-wrap items-start justify-between gap-4 max-[480px]:flex-col max-[480px]:items-stretch">
                        <div>
                          <h2 className="[font-family:var(--font-heading)] text-[22px] font-extrabold uppercase tracking-[0.06em]">
                            {activeSportDefinition.label} · {headerCourtName} · Session
                          </h2>
                          <p className="mt-1 text-xs [font-family:var(--font-mono)] font-medium opacity-60 tabular-nums">{headerMeta}</p>
                        </div>
                        <span className={`${primeStatusPillBaseClass} ${sessionActive ? "border-accent-secondary bg-[rgba(212,163,89,0.12)] text-accent-secondary" : "border-border bg-surface-muted text-muted"}`}>
                          <span className={`size-2 rounded-full ${sessionActive ? "bg-accent-secondary" : "bg-inactive"}`} />
                          <span>{sessionActive ? "Active" : "Scheduled"}</span>
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
                        <p className="text-[13px] opacity-70">
                          Booked by <strong>{organizerName}</strong> · Capacity <strong>{capacity} players max</strong>
                        </p>
                      </div>
                    </div>

                    <div className="mb-6 mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border border-border bg-surface-muted p-4" data-od-id="organizer-toggle">
                      <div className="flex flex-col gap-1">
                        <h3 className="[font-family:var(--font-heading)] text-base font-extrabold uppercase tracking-[0.05em]">Organizer Check-In</h3>
                        <p className="text-xs opacity-60">Activate this court block to begin player check-ins.</p>
                        <span className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-accent">Admin / Tournament Organizer</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {sessionActive ? (
                          <button type="button" className={primeButtonOutlineClass} disabled={isActivating} onClick={() => void toggleSession()}>
                            {isActivating ? "Working…" : "End Session"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={`relative h-7 w-12 shrink-0 rounded-full border transition ${sessionActive ? "border-accent-secondary bg-accent" : "border-border bg-border"} ${!selectedBookingId || isActivating || isLoadingSession ? "opacity-60" : ""}`}
                          role="switch"
                          aria-checked={sessionActive}
                          aria-label="Activate session"
                          disabled={!selectedBookingId || isActivating || isLoadingSession}
                          onClick={() => void toggleSession()}
                        >
                          <span
                            className={`absolute left-0.5 top-0.5 size-[22px] rounded-full bg-foreground shadow-[var(--shadow-sm)] transition ${sessionActive ? "translate-x-5" : "translate-x-0"}`}
                          />
                        </button>
                      </div>
                    </div>

                    {sessionError ? <p className="mb-4 text-xs font-medium text-accent">{sessionError}</p> : null}
                  </div>

                  <div data-od-id="attendance-roster">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border border-border bg-surface-muted px-5 py-4 text-foreground max-[480px]:flex-col max-[480px]:items-stretch">
                      <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-65">Active Players</h3>
                        <div className="mt-1 [font-family:var(--font-mono)] text-[28px] font-semibold leading-none tabular-nums">
                          <span>{players.length}</span>
                          <span className="text-lg opacity-50"> / {capacity} Players Max</span>
                        </div>
                      </div>
                      <div className="h-2 max-w-[240px] flex-1 overflow-hidden rounded-full bg-border max-[480px]:max-w-none">
                        <div className="h-full rounded-full bg-accent-secondary transition-[width] duration-300" style={{ width: `${(players.length / capacity) * 100}%` }} />
                      </div>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <h2 className="[font-family:var(--font-heading)] text-xl font-extrabold uppercase tracking-[0.06em]">Player Gatekeeper</h2>
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
                          disabled={!sessionActive || atCapacity}
                          className={`${nameInputClassName} max-w-[220px]`}
                        />
                        <button
                          type="button"
                          className={`${primeButtonPrimaryClass} min-h-9 shrink-0 px-3.5 text-[13px]`}
                          aria-disabled={!sessionActive || atCapacity || !newPlayerName.trim() || isAddingPlayer}
                          disabled={!sessionActive || atCapacity || !newPlayerName.trim() || isAddingPlayer}
                          onClick={() => void addPlayer()}
                        >
                          {isAddingPlayer ? "Adding…" : "+ Add Player"}
                        </button>
                      </div>
                    </div>

                    <ul className="flex list-none flex-col gap-2 p-0" id="roster">
                      {players.map((player) => {
                        const initial = player.playerName.trim().charAt(0).toUpperCase() || "?";
                        const checkInTime = formatCheckInTime(player.checkInTime);
                        const isBusy = pendingEntryId === player.id;

                        return (
                          <li
                            key={player.id}
                            className="grid grid-cols-[40px_1fr_auto_auto] items-center gap-3 rounded-[var(--radius)] border border-border bg-surface p-3 max-[640px]:grid-cols-[40px_1fr_auto]"
                          >
                            <div className="flex size-10 items-center justify-center rounded-full bg-accent-secondary [font-family:var(--font-heading)] text-base font-extrabold uppercase text-canvas">{initial}</div>
                            <div>
                              <div className="text-sm font-semibold">{player.playerName}</div>
                              <div className="text-[11px] [font-family:var(--font-mono)] font-medium opacity-55 tabular-nums">
                                {checkInTime ? `Checked in ${checkInTime}` : "Not checked in"}
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={isBusy}
                              className={`${primeStatusPillBaseClass} px-2.5 py-1 tracking-[0.05em] ${player.checkedIn ? "border-accent-secondary bg-[rgba(212,163,89,0.12)] text-accent-secondary" : "border-border bg-surface-muted text-muted"}`}
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
                      <div className="rounded-[var(--radius)] border border-dashed border-border bg-surface p-8 text-center text-[13px] opacity-60" id="emptyState">
                        {!selectedBookingId
                          ? "Pick a confirmed booking above to manage its roster."
                          : sessionActive
                            ? "No players checked in yet. Use the add player action to populate the roster."
                            : "Session not active. Flip the organizer toggle to begin checking in players."}
                      </div>
                    ) : null}

                    <div className={`${atCapacity ? "block" : "hidden"} mt-3 rounded-[var(--radius)] bg-accent px-4 py-3 text-[13px] font-semibold text-foreground`} id="capWarning">
                      <strong>Court at capacity.</strong> {capacity} / {capacity} players checked in. Remove a player to add another — overcrowding on the floor is not permitted.
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="history" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: "easeOut" }}>
                  <RosterHistory sport={activeSport} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {showNextSession && nextSession ? (
        <NextSessionDialog session={nextSession} sportLabel={activeSportDefinition.label} onClose={() => setShowNextSession(false)} />
      ) : null}
    </>
  );
}
