import { Clock, MapPin } from "lucide-react";

const MAPS_EMBED_SRC = "https://www.google.com/maps?q=PrimeSports+Clubhouse+Minglanilla&ll=10.2417885,123.7835417&z=17&output=embed";

const MAPS_DIRECTIONS_HREF =
  "https://www.google.com/maps/place/PrimeSports+Clubhouse+Minglanilla/@10.2417885,123.7835417,17z/data=!3m1!4b1!4m6!3m5!1s0x33a9775301240a8d:0xf552455d471f4cce!8m2!3d10.2417885!4d123.7835417!16s%2Fg%2F11npy8qgzh";

const details = [
  {
    id: "address",
    icon: MapPin,
    label: "Address",
    value: "Highway, Minglanilla",
    note: "Cebu, 6064",
  },
  {
    id: "hours",
    icon: Clock,
    label: "Opening Hours",
    value: "6:00 AM – 2:00 AM",
    note: "Open daily · Last slot starts 1:00 AM",
    mono: true,
  },
];

export default function LocationPanel() {
  return (
    <div className="grid grid-cols-[1.05fr_1fr] items-stretch gap-5 max-[920px]:grid-cols-1">
      <div className="relative min-h-[320px] overflow-hidden rounded-[var(--radius)] border border-border shadow-[var(--shadow-sm)] max-[640px]:min-h-[240px]">
        <iframe
          src={MAPS_EMBED_SRC}
          title="Map showing the Prime Sports Clubhouse location in Minglanilla, Cebu"
          aria-label="Map showing the Prime Sports Clubhouse location in Minglanilla, Cebu"
          className="absolute inset-0 size-full grayscale-[15%] contrast-[1.05]"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="flex flex-col overflow-hidden rounded-[var(--radius)] border border-border border-t-2 border-t-accent-secondary bg-surface shadow-[var(--shadow-sm)]">
        <div className="border-b border-border px-7 py-6 max-[640px]:px-5 max-[640px]:py-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-60">Visit the Club</span>
          <h3 className="mt-2 [font-family:var(--font-heading)] text-[26px] font-extrabold tracking-[0.06em] max-[640px]:text-[22px]">
            PrimeSports Clubhouse
          </h3>
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

        <a
          href={MAPS_DIRECTIONS_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 border-t border-border px-7 py-4.5 text-[13px] font-bold uppercase tracking-[0.08em] text-accent-secondary transition-colors duration-150 hover:bg-surface-muted hover:text-foreground max-[640px]:px-5"
        >
          Get Directions
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}
