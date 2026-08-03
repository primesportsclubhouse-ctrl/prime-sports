import type { CSSProperties } from "react";

/** Inline styles that also carry the custom properties the keyframes read. */
type GlintStyle = CSSProperties & Record<`--${string}`, string | number>;

export type SectionBackdropVariant = "grid" | "stellar" | "grain";

type SectionBackdropProps = {
  variant: SectionBackdropVariant;
  className?: string;
};

/**
 * A glint holds one line for a full pulse — fading up, resting lit, fading back out —
 * and only then steps to the next line. Deriving the sweep from `steps * pulse` keeps
 * the two animations phase-locked, so the move always happens at opacity 0 and the eye
 * never catches a jump. Pulses run long (9-17s) and the periods are mutually offset so
 * the backdrop never falls into a visible rhythm.
 */
function glintAnimation(name: string, steps: number, pulse: number, delay: number) {
  return [
    `${name} ${steps * pulse}s steps(${steps}, end) ${delay}s infinite`,
    `survey-glint-pulse ${pulse}s ease-in-out ${delay}s infinite`,
  ].join(", ");
}

/**
 * Orthogonal survey grid. `start` is the glint's first position in grid cells and
 * `steps` is how many cells it walks before looping — the keyframe derives its travel
 * distance from that same number, so a glint always lands exactly on a drawn line.
 */
const GRID_GLINTS = [
  { axis: "x", start: 1, steps: 13, pulse: 9, delay: 0 },
  { axis: "x", start: 9, steps: 11, pulse: 11, delay: 4 },
  { axis: "y", start: 1, steps: 7, pulse: 10, delay: 7 },
  { axis: "y", start: 4, steps: 5, pulse: 12, delay: 11 },
] as const;

/** Concentric rings, indexed outward from the origin — these pulse in place. */
const STELLAR_RINGS = [
  { ring: 1, pulse: 11, delay: 1.5 },
  { ring: 2, pulse: 13, delay: 6 },
  { ring: 3, pulse: 15, delay: 3 },
  { ring: 4, pulse: 17, delay: 9 },
] as const;

/** Radiating spokes — these walk the 30 spoke positions, one per pulse. */
const STELLAR_SPOKES = [
  { from: "0deg", pulse: 12, delay: 0 },
  { from: "144deg", pulse: 14, delay: 5 },
  { from: "252deg", pulse: 16, delay: 10 },
] as const;

/** Spoke count in the conic gradient below — a sweep step must match its 12deg pitch. */
const SPOKE_STEPS = 30;

const GRID_LAYER =
  "linear-gradient(90deg, var(--survey-line) 1px, transparent 1px), linear-gradient(var(--survey-line) 1px, transparent 1px)";

const STELLAR_LAYER = [
  // Rings every --survey-ring out from the origin.
  "repeating-radial-gradient(circle at var(--survey-star-x) var(--survey-star-y), var(--survey-line) 0 1px, transparent 1px var(--survey-ring))",
  // 30 spokes radiating from that same origin.
  "repeating-conic-gradient(from 0deg at var(--survey-star-x) var(--survey-star-y), var(--survey-line-soft) 0deg 0.16deg, transparent 0.16deg 12deg)",
].join(", ");

/**
 * Photographic grain for the sections between the drawn-line plates: desaturated
 * fractal noise, tiled and completely static. It has no direction or structure, so it
 * gives the flat canvas some tooth (and dithers gradient banding) without reading as a
 * pattern that competes with the grid and stellar sections.
 */
const GRAIN_LAYER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='survey-grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23survey-grain)'/%3E%3C/svg%3E\")";

const GLINT_GLOW = "0 0 8px var(--survey-glint-soft)";

function glintGradient(direction: string) {
  return `linear-gradient(${direction}, transparent 0%, var(--survey-glint-soft) 32%, var(--survey-glint) 50%, var(--survey-glint-soft) 68%, transparent 100%)`;
}

/**
 * Decorative "survey plate" backdrop for a section. Sits behind the content, so the
 * host section needs `relative overflow-hidden` and its content wrapper needs a stacking
 * context above this layer (`relative z-10`).
 */
export default function SectionBackdrop({ variant, className }: SectionBackdropProps) {
  const isGrid = variant === "grid";
  const isStellar = variant === "stellar";

  const patternClass = isGrid
    ? "[--survey-grid:72px] max-[640px]:[--survey-grid:44px]"
    : isStellar
      ? "[--survey-ring:132px] [--survey-star-x:74%] [--survey-star-y:34%] max-[640px]:[--survey-ring:84px] max-[640px]:[--survey-star-x:58%]"
      : "";

  const patternStyle: CSSProperties = isGrid
    ? { backgroundImage: GRID_LAYER, backgroundSize: "var(--survey-grid) var(--survey-grid)" }
    : isStellar
      ? { backgroundImage: STELLAR_LAYER }
      : { backgroundImage: GRAIN_LAYER, backgroundSize: "200px 200px" };

  return (
    <div
      aria-hidden="true"
      className={["pointer-events-none absolute inset-0 overflow-hidden", patternClass, className]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Drawn lines, or grain on the sections between them */}
      <div
        className={`absolute inset-0 ${isGrid || isStellar ? "opacity-60" : "opacity-[0.03]"}`}
        style={patternStyle}
      />

      {/* Shining lines */}
      {isGrid
        ? GRID_GLINTS.map((glint, index) => {
            const offset = `calc(var(--survey-grid) * ${glint.start})`;

            // axis "x" is a vertical line that walks sideways; "y" is the transpose.
            const placement: CSSProperties =
              glint.axis === "x"
                ? {
                    top: 0,
                    left: offset,
                    width: "1px",
                    height: "100%",
                    backgroundImage: glintGradient("180deg"),
                  }
                : {
                    left: 0,
                    top: offset,
                    height: "1px",
                    width: "100%",
                    backgroundImage: glintGradient("90deg"),
                  };

            const style: GlintStyle = {
              ...placement,
              "--glint-steps": glint.steps,
              boxShadow: GLINT_GLOW,
              animation: glintAnimation(
                `survey-glint-${glint.axis}`,
                glint.steps,
                glint.pulse,
                glint.delay,
              ),
            };

            return (
              <div key={`glint-${index}`} className="survey-glint absolute opacity-0" style={style} />
            );
          })
        : null}

      {isStellar
        ? STELLAR_RINGS.map((glint) => (
            <div
              key={`ring-${glint.ring}`}
              className="survey-glint absolute rounded-full border opacity-0"
              style={{
                left: "var(--survey-star-x)",
                top: "var(--survey-star-y)",
                width: `calc(var(--survey-ring) * ${glint.ring * 2})`,
                aspectRatio: "1",
                borderColor: "var(--survey-glint-soft)",
                transform: "translate(-50%, -50%)",
                animation: `survey-glint-pulse ${glint.pulse}s ease-in-out ${glint.delay}s infinite`,
              }}
            />
          ))
        : null}

      {isStellar
        ? STELLAR_SPOKES.map((glint) => {
            const style: GlintStyle = {
              "--glint-from": glint.from,
              left: "var(--survey-star-x)",
              top: "var(--survey-star-y)",
              transformOrigin: "0 50%",
              backgroundImage: glintGradient("90deg"),
              boxShadow: GLINT_GLOW,
              animation: glintAnimation("survey-spoke-sweep", SPOKE_STEPS, glint.pulse, glint.delay),
            };

            return (
              <div
                key={`spoke-${glint.from}`}
                className="survey-glint absolute h-px w-[120vw] opacity-0"
                style={style}
              />
            );
          })
        : null}
    </div>
  );
}