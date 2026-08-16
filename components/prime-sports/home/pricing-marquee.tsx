import { primeHeadingBaseClass } from "@/lib/prime-sports";

/**
 * Decorative outline-text marquee behind the Court Pricing section — same face, size,
 * and weight as the hero's "PRIME SPORTS" headline, just hollowed out (transparent fill,
 * thin stroke) so it reads as background texture rather than competing with the section's
 * actual content, which sits in front of this on `relative z-10`.
 *
 * Pure CSS (`@keyframes` in globals.css, see `pricing-marquee-left`/`-right`) — a
 * continuously-looping background belongs on the compositor, not driven by JS.
 */
const MARQUEE_ROWS = [
  { id: "pickleball", label: "PICKLEBALL", animationClass: "animate-[pricing-marquee-left_55s_linear_infinite]" },
  { id: "badminton", label: "BADMINTON", animationClass: "animate-[pricing-marquee-right_65s_linear_infinite]" },
] as const;

/** Repeated enough times that two copies (the seamless-loop trick) still overflow the
 *  widest realistic viewport with no visible gap. */
const REPEAT_COUNT = 8;

const outlineTextStyle = {
  WebkitTextStroke: "1.5px rgba(11,27,43,0.1)",
  WebkitTextFillColor: "transparent",
  color: "transparent",
} as const;

function buildStrip(label: string) {
  return Array.from({ length: REPEAT_COUNT }, () => label).join(" · ");
}

export default function PricingMarquee() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex flex-col justify-between overflow-hidden py-2"
    >
      {MARQUEE_ROWS.map((row) => {
        const strip = buildStrip(row.label);

        return (
          <div key={row.id} className="overflow-hidden">
            <div className={`pricing-marquee-track flex w-max whitespace-nowrap ${row.animationClass}`}>
              {[0, 1].map((copyIndex) => (
                <span
                  key={copyIndex}
                  className={`${primeHeadingBaseClass} px-4 text-[clamp(56px,13vw,150px)] font-extrabold leading-[0.86] tracking-[0.02em]`}
                  style={outlineTextStyle}
                >
                  {strip}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
