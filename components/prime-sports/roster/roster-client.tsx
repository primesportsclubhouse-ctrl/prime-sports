'use client';

import { useState } from "react";

import {
  primeButtonPrimaryClass,
  primeButtonOutlineClass,
  primeContainerClasses,
  primeStatusPillBaseClass,
  primeSurfaceCardClass,
} from "@/lib/prime-sports";

type Player = {
  id: number;
  name: string;
  checkedIn: boolean;
  checkInTime: string;
};

const CAPACITY = 10;
const lastNames = [
  "Rivera",
  "Cruz",
  "Santos",
  "Reyes",
  "Tan",
  "Lim",
  "Garcia",
  "Mendoza",
  "Aquino",
  "Del Rosario",
  "Bautista",
  "Ocampo",
];

function getRandomName() {
  return `[Player ${lastNames[Math.floor(Math.random() * lastNames.length)]}]`;
}

export default function RosterClient() {
  const [sessionActive, setSessionActive] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);

  const atCapacity = players.length >= CAPACITY;

  function resetSession() {
    setSessionActive(false);
    setPlayers([]);
  }

  function addPlayer() {
    if (!sessionActive || atCapacity) {
      return;
    }

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    setPlayers((current) => [
      ...current,
      {
        id: Date.now(),
        name: getRandomName(),
        checkedIn: true,
        checkInTime: time,
      },
    ]);
  }

  const containerClassName = primeContainerClasses.narrow;

  return (
    <>
      <section className={containerClassName} data-od-id="attendance-session">
        <div className={`${primeSurfaceCardClass} mt-6 p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-4 max-[480px]:flex-col max-[480px]:items-stretch">
            <div>
              <h2 className="[font-family:var(--font-heading)] text-[22px] font-extrabold uppercase tracking-[0.06em]">[Court name] · Session</h2>
              <p className="mt-1 text-xs [font-family:var(--font-mono)] font-medium opacity-60 tabular-nums">[Date] · [Time slot] · [Booking ref]</p>
            </div>
            <span className={`${primeStatusPillBaseClass} ${sessionActive ? "border-accent-secondary bg-[rgba(212,163,89,0.12)] text-accent-secondary" : "border-border bg-surface-muted text-muted"}`}>
              <span className={`size-2 rounded-full ${sessionActive ? "bg-accent-secondary" : "bg-inactive"}`} />
              <span>{sessionActive ? "Active" : "Scheduled"}</span>
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
            <p className="text-[13px] opacity-70">
              Booked by <strong>[Player name]</strong> · Capacity <strong>10 players max</strong>
            </p>
            {sessionActive ? (
              <button type="button" className={primeButtonOutlineClass} onClick={resetSession}>
                End Session
              </button>
            ) : null}
          </div>
        </div>

        <div className="mb-6 mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border border-border bg-surface-muted p-4" data-od-id="organizer-toggle">
          <div className="flex flex-col gap-1">
            <h3 className="[font-family:var(--font-heading)] text-base font-extrabold uppercase tracking-[0.05em]">Organizer Check-In</h3>
            <p className="text-xs opacity-60">Activate this court block to begin player check-ins.</p>
            <span className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-accent">Admin / Tournament Organizer</span>
          </div>
          <button
            type="button"
            className={`relative h-7 w-12 shrink-0 rounded-full border transition ${sessionActive ? "border-accent-secondary bg-accent" : "border-border bg-border"}`}
            role="switch"
            aria-checked={sessionActive}
            aria-label="Activate session"
            onClick={() => setSessionActive((current) => !current)}
          >
            <span
              className={`absolute left-0.5 top-0.5 size-[22px] rounded-full bg-foreground shadow-[var(--shadow-sm)] transition ${sessionActive ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>
      </section>

      <section className={containerClassName} data-od-id="attendance-roster">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border border-border bg-surface-muted px-5 py-4 text-foreground max-[480px]:flex-col max-[480px]:items-stretch">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-65">Active Players</h3>
            <div className="mt-1 [font-family:var(--font-mono)] text-[28px] font-semibold leading-none tabular-nums">
              <span>{players.length}</span>
              <span className="text-lg opacity-50"> / 10 Players Max</span>
            </div>
          </div>
          <div className="h-2 max-w-[240px] flex-1 overflow-hidden rounded-full bg-border max-[480px]:max-w-none">
            <div className="h-full rounded-full bg-accent-secondary transition-[width] duration-300" style={{ width: `${(players.length / CAPACITY) * 100}%` }} />
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="[font-family:var(--font-heading)] text-xl font-extrabold uppercase tracking-[0.06em]">Player Gatekeeper</h2>
          <button
            type="button"
            className={`${primeButtonPrimaryClass} min-h-9 px-3.5 text-[13px]`}
            aria-disabled={!sessionActive || atCapacity}
            disabled={!sessionActive || atCapacity}
            onClick={addPlayer}
          >
            + Add Player
          </button>
        </div>

        <ul className="flex list-none flex-col gap-2 p-0" id="roster">
          {players.map((player) => {
            const initial = player.name.replace("[", "").replace("]", "").charAt(0).toUpperCase();

            return (
              <li
                key={player.id}
                className="grid grid-cols-[40px_1fr_auto_auto] items-center gap-3 rounded-[var(--radius)] border border-border bg-surface p-3 max-[640px]:grid-cols-[40px_1fr_auto]"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-accent-secondary [font-family:var(--font-heading)] text-base font-extrabold uppercase text-canvas">{initial}</div>
                <div>
                  <div className="text-sm font-semibold">{player.name}</div>
                  <div className="text-[11px] [font-family:var(--font-mono)] font-medium opacity-55 tabular-nums">Checked in {player.checkInTime}</div>
                </div>
                <button
                  type="button"
                  className={`${primeStatusPillBaseClass} px-2.5 py-1 tracking-[0.05em] ${player.checkedIn ? "border-accent-secondary bg-[rgba(212,163,89,0.12)] text-accent-secondary" : "border-border bg-surface-muted text-muted"}`}
                  onClick={() => {
                    setPlayers((current) =>
                      current.map((entry) =>
                        entry.id === player.id
                          ? { ...entry, checkedIn: !entry.checkedIn }
                          : entry,
                      ),
                    );
                  }}
                >
                  {player.checkedIn ? "Checked In" : "Pending"}
                </button>
                <button
                  type="button"
                  className="px-2 py-1 text-lg leading-none text-foreground/30 transition hover:text-accent hover:opacity-100 max-[640px]:col-[2_/_-1] max-[640px]:justify-self-end"
                  aria-label="Remove player"
                  onClick={() => {
                    setPlayers((current) => current.filter((entry) => entry.id !== player.id));
                  }}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>

        {players.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-border bg-surface p-8 text-center text-[13px] opacity-60" id="emptyState">
            {sessionActive
              ? "No players checked in yet. Use the add player action to populate the roster."
              : "Session not active. Flip the organizer toggle to begin checking in players."}
          </div>
        ) : null}

        <div className={`${atCapacity ? "block" : "hidden"} mt-3 rounded-[var(--radius)] bg-accent px-4 py-3 text-[13px] font-semibold text-foreground`} id="capWarning">
          <strong>Court at capacity.</strong> 10 / 10 players checked in. Remove a player to add another — overcrowding on the floor is not permitted.
        </div>
      </section>
    </>
  );
}