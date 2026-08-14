'use client';

import { X } from "lucide-react";
import { useEffect } from "react";

import {
  NextRosterSession,
  primeButtonOutlineClass,
  primeMetaLabelClass,
  primeSectionTitleClass,
  primeStatusPillBaseClass,
  primeToolbarIconButtonClass,
} from "@/lib/prime-sports";

type NextSessionDialogProps = {
  session: NextRosterSession;
  sportLabel: string;
  onClose: () => void;
};

export default function NextSessionDialog({ session, sportLabel, onClose }: NextSessionDialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const fillPercent = Math.round((session.playersCheckedIn / session.capacity) * 100);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="next-session-title"
        className="w-full max-w-[480px] rounded-[var(--radius)] border border-border bg-surface text-foreground shadow-[var(--shadow-md)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-6 pb-4">
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-accent">Next Session</p>
            <h3 id="next-session-title" className={primeSectionTitleClass}>
              {session.court}
            </h3>
          </div>
          <button type="button" aria-label="Close" className={primeToolbarIconButtonClass} onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="p-6">
          <span className={`${primeStatusPillBaseClass} border-accent-secondary bg-[rgba(212,163,89,0.12)] text-accent-secondary`}>
            {session.startsIn}
          </span>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 max-[480px]:grid-cols-1">
            <div>
              <dt className={primeMetaLabelClass}>Sport</dt>
              <dd className="m-0 text-[13px] font-semibold">{sportLabel}</dd>
            </div>
            <div>
              <dt className={primeMetaLabelClass}>Court</dt>
              <dd className="m-0 text-[13px] font-semibold">{session.court}</dd>
            </div>
            <div>
              <dt className={primeMetaLabelClass}>Date</dt>
              <dd className="m-0 text-[13px] [font-family:var(--font-mono)] font-semibold tabular-nums">{session.date}</dd>
            </div>
            <div>
              <dt className={primeMetaLabelClass}>Time Slot</dt>
              <dd className="m-0 text-[13px] [font-family:var(--font-mono)] font-semibold tabular-nums">{session.timeSlot}</dd>
            </div>
            <div className="col-span-2">
              <dt className={primeMetaLabelClass}>Booked By</dt>
              <dd className="m-0 text-[13px] font-semibold">{session.organizer}</dd>
            </div>
          </dl>

          <div className="mt-5 rounded-[var(--radius)] border border-border bg-surface-muted p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className={primeMetaLabelClass}>Roster State</span>
              <span className="[font-family:var(--font-mono)] text-[13px] font-semibold tabular-nums">
                {session.playersCheckedIn} / {session.capacity} checked in
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-accent-secondary transition-[width] duration-300" style={{ width: `${fillPercent}%` }} />
            </div>
            <p className="mt-2 text-[12px] opacity-60">
              {session.playersCheckedIn === 0
                ? "No players have checked in yet — the organizer toggle unlocks once this session goes live."
                : `${session.playersCheckedIn} of ${session.capacity} players already checked in ahead of the start time.`}
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-border p-6 pt-5">
          <button type="button" className={primeButtonOutlineClass} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
