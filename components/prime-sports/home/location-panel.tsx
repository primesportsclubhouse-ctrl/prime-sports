import { CircleParking, Clock, MapPin, Route } from "lucide-react";

const details = [
  {
    id: "address",
    icon: MapPin,
    label: "Address",
    value: "[Facility address line 1]",
    note: "[Address line 2] · [City] [Postal]",
  },
  {
    id: "hours",
    icon: Clock,
    label: "Opening Hours",
    value: "[Open]–[Close]",
    note: "Open daily · Last slot starts [Last slot]",
    mono: true,
  },
  {
    id: "parking",
    icon: CircleParking,
    label: "Parking",
    value: "[N] slots",
    note: "[Parking / access notes]",
    mono: true,
  },
  {
    id: "getting-here",
    icon: Route,
    label: "Getting Here",
    value: "[Nearest landmark]",
    note: "[Transit / drop-off notes]",
  },
];

export default function LocationPanel() {
  return (
    <div className="grid grid-cols-[1.05fr_1fr] items-stretch gap-5 max-[920px]:grid-cols-1">
      <div
        className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[var(--radius)] border border-border bg-[linear-gradient(90deg,rgba(156,176,195,0.18)_1px,transparent_1px)_0_0/40px_40px,linear-gradient(rgba(156,176,195,0.18)_1px,transparent_1px)_0_0/40px_40px,linear-gradient(135deg,var(--surface-muted)_0%,var(--canvas)_100%)] shadow-[var(--shadow-sm)] max-[640px]:min-h-[240px]"
        role="img"
        aria-label="Map showing the Prime Sports Club location"
      >
        <div className="absolute left-[10%] right-[10%] top-[55%] h-[3px] rounded bg-muted" aria-hidden="true" />
        <div
          className="absolute bottom-[15%] left-[25%] h-[2px] w-[30%] rotate-[15deg] rounded bg-muted"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div
            className="relative size-7 rotate-[-45deg] rounded-[50%_50%_50%_0] bg-accent shadow-[var(--shadow-md)] after:absolute after:left-2 after:top-2 after:size-3 after:rounded-full after:bg-canvas"
            aria-hidden="true"
          />
          <span className="rounded-[var(--radius)] border border-border bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em]">
            Prime Sports
          </span>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-[var(--radius)] border border-border border-t-2 border-t-accent-secondary bg-surface shadow-[var(--shadow-sm)]">
        <div className="border-b border-border px-7 py-6 max-[640px]:px-5 max-[640px]:py-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-60">Visit the Club</span>
          <h3 className="mt-2 [font-family:var(--font-heading)] text-[26px] font-extrabold uppercase tracking-[0.06em] max-[640px]:text-[22px]">
            Prime Sports Club
          </h3>
          <p className="mt-1.5 text-[13px] opacity-60">Prestige court reservation &amp; community hub</p>
        </div>

        <dl className="grid flex-1 grid-cols-2 max-[560px]:grid-cols-1">
          {details.map(({ id, icon: Icon, label, value, note, mono }) => (
            <div
              key={id}
              className="flex gap-3.5 border-b border-r border-border px-7 py-5 last:border-b-0 even:border-r-0 max-[640px]:px-5 max-[560px]:border-r-0"
            >
              <span
                className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted text-accent-secondary"
                aria-hidden="true"
              >
                <Icon size={17} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <dt className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</dt>
                <dd>
                  <strong
                    className={
                      mono
                        ? "block [font-family:var(--font-mono)] text-[15px] font-semibold tabular-nums"
                        : "block text-[15px] font-semibold"
                    }
                  >
                    {value}
                  </strong>
                  <span className="mt-0.5 block text-[13px] leading-[1.5] opacity-60">{note}</span>
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
