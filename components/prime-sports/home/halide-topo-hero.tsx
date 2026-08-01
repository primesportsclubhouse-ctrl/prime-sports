"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, type CSSProperties, type PointerEvent } from "react";

import courtPlate from "@/public/prime-sports/prime-core-court.jpeg";
import {
  getPrimeContainerClassName,
  primeHeadingBaseClass,
  primeMonoValueClass,
} from "@/lib/prime-sports";

type HalideTopoHeroProps = {
  label?: string;
  coordinate?: string;
  measurement?: string;
  headlineTop?: string;
  headlineBottom?: string;
  tag?: string;
  caption?: string;
  ctaHref?: string;
  ctaLabel?: string;
};

/**
 * Perspective-matrix timings. While tracking, the plate is on a near-instant linear
 * follow so it stays glued to the cursor; on release it springs back on a long ease.
 */
const TRACK_MS = "40ms";
const TRACK_EASE = "linear";
const RELEASE_MS = "900ms";
const RELEASE_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Easing/transition for the tracked image plate. */
const layerTransition = "transform var(--tilt-ms) var(--tilt-ease)";

/**
 * The court's playing surface as an affine plane over the plate box, measured off the
 * artwork's inner boundary lines and expressed in % of the plate's width/height:
 *
 *   point(u, v) = ORIGIN + U * u + V * v
 *
 * `u` runs baseline-to-baseline with the net at u = 0.5; `v` runs sideline-to-sideline.
 * Keeping the ball in this parameter space means it always lands on the court, at any
 * plate size, and reads correctly against the isometric projection.
 */
const COURT_ORIGIN = { x: 23.6, y: 53.5 };
const COURT_U = { x: 38.5, y: -35.8 };
const COURT_V = { x: 18.5, y: 18.4 };

/**
 * A ground-plane circle projects to an ellipse ~1.86:1 with an effectively horizontal
 * major axis under this projection, so the contact shadow is a circle squashed on Y.
 */
const SHADOW_FLATTEN = 0.54;

type Range = [number, number];

/** Bounce zones, kept clear of the net and the sidelines. */
const NEAR_SIDE_U: Range = [0.12, 0.4];
const FAR_SIDE_U: Range = [0.6, 0.88];
const ACROSS_V: Range = [0.16, 0.84];
/** Arc apex, in % of plate height — enough to clear the net without leaving the plate. */
const ARC_PEAK: Range = [15, 23];
const SHOT_MS: Range = [780, 1180];

type CourtPoint = { x: number; y: number };

type RallyShot = {
  from: CourtPoint;
  to: CourtPoint;
  toU: number;
  toV: number;
  toNear: boolean;
  peak: number;
  duration: number;
};

function between([min, max]: Range) {
  return min + Math.random() * (max - min);
}

function courtPoint(u: number, v: number): CourtPoint {
  return {
    x: COURT_ORIGIN.x + COURT_U.x * u + COURT_V.x * v,
    y: COURT_ORIGIN.y + COURT_U.y * u + COURT_V.y * v,
  };
}

/** Build the next crossing: always to the opposite half, always to a fresh spot. */
function createShot(fromU: number, fromV: number, toNear: boolean): RallyShot {
  const toU = between(toNear ? NEAR_SIDE_U : FAR_SIDE_U);
  const toV = between(ACROSS_V);

  return {
    from: courtPoint(fromU, fromV),
    to: courtPoint(toU, toV),
    toU,
    toV,
    toNear,
    peak: between(ARC_PEAK),
    // Deeper crossings hang in the air proportionally longer.
    duration: between(SHOT_MS) * (0.78 + Math.abs(toU - fromU) * 0.5),
  };
}

export default function HalideTopoHero({
  label = "PRIME_CORE",
  coordinate = "14°35'12\"N · 121°02'44\"E",
  measurement = "SURF 13.41M · ELEV 24.6M",
  headlineTop = "Prime",
  headlineBottom = "Sports",
  tag = "[ EST. 2024 ]",
  caption = "Survey plate 04 — covered & outdoor championship courts, booked by the hour.",
  ctaHref = "/reserve",
  ctaLabel = "Reserve a court",
}: HalideTopoHeroProps) {
  const stageRef = useRef<HTMLElement | null>(null);
  const plateRef = useRef<HTMLDivElement | null>(null);
  const ballRigRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const boundsRef = useRef<DOMRect | null>(null);
  const plateBoundsRef = useRef<DOMRect | null>(null);
  const pointerRef = useRef({ mx: 0, my: 0, gx: 50, gy: 50 });
  const reducedMotionRef = useRef(false);

  // Cache both boxes so pointer moves never trigger a layout read. The glare needs the
  // plate's own (untransformed) rect — the stage rect only drives the tilt ratios.
  useEffect(() => {
    const measure = () => {
      boundsRef.current = stageRef.current?.getBoundingClientRect() ?? null;
      plateBoundsRef.current = plateRef.current?.getBoundingClientRect() ?? null;
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = query.matches;

    const onChange = (event: MediaQueryListEvent) => {
      reducedMotionRef.current = event.matches;
    };

    query.addEventListener("change", onChange);

    return () => {
      query.removeEventListener("change", onChange);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  // Rally loop: an endless chain of parabolic crossings, each landing on the opposite
  // half of the court at a freshly randomised spot. Writes CSS custom properties on a
  // single rig element, so no React re-render and no layout work per frame.
  useEffect(() => {
    const rig = ballRigRef.current;
    const stage = stageRef.current;
    if (!rig || !stage) return;

    let shot = createShot(between(NEAR_SIDE_U), between(ACROSS_V), false);
    let start: number | null = null;
    let rallyFrame: number | null = null;

    const draw = (now: number) => {
      if (start === null) start = now;

      let elapsed = now - start;

      if (elapsed >= shot.duration) {
        // Carry the leftover time into the next shot so crossings stay seamless,
        // clamped so a backgrounded tab cannot fast-forward the rally.
        const overflow = Math.min(elapsed - shot.duration, shot.duration);
        shot = createShot(shot.toU, shot.toV, !shot.toNear);
        start = now - overflow;
        elapsed = overflow;
      }

      const progress = elapsed / shot.duration;

      // Constant velocity across the court plane, parabolic apex in between.
      const x = shot.from.x + (shot.to.x - shot.from.x) * progress;
      const y = shot.from.y + (shot.to.y - shot.from.y) * progress;
      const liftRatio = 4 * progress * (1 - progress);
      const lift = shot.peak * liftRatio;

      // Brief squash on either side of a bounce, area roughly preserved.
      const contact = Math.min(progress, 1 - progress);
      const squash = contact < 0.05 ? 0.74 + (contact / 0.05) * 0.26 : 1;

      rig.style.setProperty("--ball-x", x.toFixed(3));
      rig.style.setProperty("--ball-y", y.toFixed(3));
      rig.style.setProperty("--ball-lift", lift.toFixed(3));
      rig.style.setProperty("--ball-squash", squash.toFixed(3));
      rig.style.setProperty("--ball-stretch", (1 + (1 - squash) * 0.55).toFixed(3));
      // The shadow spreads and fades as the ball climbs away from the surface.
      rig.style.setProperty("--ball-shadow-scale", (1 + liftRatio * 1.15).toFixed(3));
      rig.style.setProperty("--ball-shadow-opacity", (0.46 - liftRatio * 0.32).toFixed(3));

      rallyFrame = requestAnimationFrame(draw);
    };

    const play = () => {
      if (rallyFrame !== null) return;
      start = null;
      rallyFrame = requestAnimationFrame(draw);
    };

    const pause = () => {
      if (rallyFrame === null) return;
      cancelAnimationFrame(rallyFrame);
      rallyFrame = null;
    };

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let onScreen = false;

    // Only rally when the hero is actually on screen and motion is welcome; the ball
    // fades in and out with that same condition.
    const sync = () => {
      const shouldPlay = onScreen && !motionQuery.matches;
      rig.dataset.active = String(shouldPlay);

      if (shouldPlay) {
        play();
      } else {
        pause();
      }
    };

    const observer = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });

    observer.observe(stage);
    motionQuery.addEventListener("change", sync);

    return () => {
      observer.disconnect();
      motionQuery.removeEventListener("change", sync);
      pause();
    };
  }, []);

  const commit = useCallback(() => {
    frameRef.current = null;

    const stage = stageRef.current;
    if (!stage) return;

    const { mx, my, gx, gy } = pointerRef.current;
    stage.style.setProperty("--mx", mx.toFixed(4));
    stage.style.setProperty("--my", my.toFixed(4));
    stage.style.setProperty("--gx", gx.toFixed(2));
    stage.style.setProperty("--gy", gy.toFixed(2));
  }, []);

  const schedule = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(commit);
  }, [commit]);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      // Cursor-driven only: coarse pointers have no hover state to track.
      if (event.pointerType !== "mouse" || reducedMotionRef.current) return;

      const stage = stageRef.current;
      if (!stage) return;

      const bounds = boundsRef.current ?? stage.getBoundingClientRect();
      boundsRef.current = bounds;
      if (!bounds.width || !bounds.height) return;

      // Normalise the cursor to -1..1 within the virtual bounding box — this drives
      // the wide-range tilt rotation and is intentionally based on the whole stage.
      const ratioX = (event.clientX - bounds.left) / bounds.width;
      const ratioY = (event.clientY - bounds.top) / bounds.height;

      // The glare, however, must line up with the actual cursor position on the
      // plate itself, not the section — otherwise it drifts once the plate is
      // shifted or scaled away from the stage's center.
      const plateBounds = plateBoundsRef.current ?? plateRef.current?.getBoundingClientRect() ?? bounds;
      plateBoundsRef.current = plateBounds;
      const plateRatioX = plateBounds.width
        ? (event.clientX - plateBounds.left) / plateBounds.width
        : ratioX;
      const plateRatioY = plateBounds.height
        ? (event.clientY - plateBounds.top) / plateBounds.height
        : ratioY;

      pointerRef.current = {
        mx: Math.min(Math.max(ratioX * 2 - 1, -1), 1),
        my: Math.min(Math.max(ratioY * 2 - 1, -1), 1),
        gx: plateRatioX * 100,
        gy: plateRatioY * 100,
      };

      stage.style.setProperty("--tilt-ms", TRACK_MS);
      stage.style.setProperty("--tilt-ease", TRACK_EASE);
      schedule();
    },
    [schedule],
  );

  const handlePointerLeave = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    pointerRef.current = { mx: 0, my: 0, gx: 50, gy: 50 };
    stage.style.setProperty("--tilt-ms", RELEASE_MS);
    stage.style.setProperty("--tilt-ease", RELEASE_EASE);
    schedule();
  }, [schedule]);

  return (
    <section
      ref={stageRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative isolate overflow-hidden border-b border-border bg-canvas [perspective-origin:50%_50%] [perspective:1500px] max-[900px]:[perspective:2200px]"
      style={
        {
          "--mx": 0,
          "--my": 0,
          "--gx": 50,
          "--gy": 50,
          "--tilt-ms": RELEASE_MS,
          "--tilt-ease": RELEASE_EASE,
        } as CSSProperties
      }
      data-od-id="halide-topo-hero"
    >
      {/* Survey grid — static backdrop texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(90deg,rgba(245,239,230,0.11)_1px,transparent_1px),linear-gradient(rgba(245,239,230,0.11)_1px,transparent_1px)] [background-size:72px_72px] max-[640px]:[background-size:44px_44px]"
      />

      {/* Tilted image plate — cursor-aware perspective matrix over its fixed Z-roll.
          preserve-3d is required here so the plate inherits the section's perspective.
          The frame below only ever translates (never rotates), so its bounding box
          stays a true reference for mapping the cursor onto the glare. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]">
        <div
          ref={plateRef}
          className="relative aspect-[16/9] w-[min(1120px,86vw)] [--plate-shift:20%] [transform-style:preserve-3d] max-[900px]:[--plate-shift:10%] max-[640px]:w-[124vw] max-[640px]:[--plate-shift:0%]"
          style={{
            transform: "translateX(var(--plate-shift))",
            transition: layerTransition,
          }}
        >
          {/* Children of this layer are flat overlays painted onto the tilted plane, so
              it stays transform-style: flat and their paint order is deterministic. */}
          <div
            className="absolute inset-0 border border-foreground/15 shadow-[var(--shadow-lg)]"
            style={{
              transform:
                "translate3d(calc(var(--mx) * 26px), calc(var(--my) * 18px), 0) rotateX(calc(var(--my) * -17deg)) rotateY(calc(var(--mx) * 23deg)) rotateZ(-21deg) scale(1.03)",
              transition: layerTransition,
              willChange: "transform",
            }}
          >
            <Image
              src={courtPlate}
              alt="Isometric survey plate of a Prime Sports pickleball court"
              fill
              priority
              sizes="(max-width: 640px) 124vw, (max-width: 1280px) 86vw, 1120px"
              className="object-cover [filter:grayscale(0.72)_contrast(1.4)_brightness(0.82)]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(105deg,rgba(11,27,43,0.68)_0%,rgba(11,27,43,0.3)_46%,rgba(11,27,43,0.6)_100%)]"
            />

            {/* Rally ball. Each nested layer maps one part of the motion, and every
                offset is a percentage of a full-plate-sized box, so the whole rig
                scales with the plate and never touches layout.
                  rig    → holds the animated custom properties
                  mover  → travel across the court plane (carries the contact shadow)
                  hop    → vertical lift above that plane
                  ball   → the ball itself, plus its bounce squash */}
            <div
              ref={ballRigRef}
              aria-hidden="true"
              className="absolute inset-0 opacity-0 transition-opacity duration-700 ease-out data-[active=true]:opacity-100"
              style={
                {
                  "--ball-x": 36,
                  "--ball-y": 58,
                  "--ball-lift": 0,
                  "--ball-squash": 1,
                  "--ball-stretch": 1,
                  "--ball-shadow-scale": 1,
                  "--ball-shadow-opacity": 0.46,
                } as CSSProperties
              }
            >
              <div
                className="absolute inset-0"
                style={{
                  transform: "translate(calc(var(--ball-x) * 1%), calc(var(--ball-y) * 1%))",
                  willChange: "transform",
                }}
              >
                <div
                  className="absolute left-0 top-0 aspect-square w-[clamp(18px,2.4%,36px)] rounded-full bg-[radial-gradient(circle,rgba(2,8,18,0.8)_0%,rgba(2,8,18,0)_70%)]"
                  style={{
                    opacity: "var(--ball-shadow-opacity)",
                    transform: `translate(-50%, -50%) scale(var(--ball-shadow-scale)) scaleY(${SHADOW_FLATTEN})`,
                    willChange: "transform, opacity",
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    transform: "translateY(calc(var(--ball-lift) * -1%))",
                    willChange: "transform",
                  }}
                >
                  <div
                    className="absolute left-0 top-0 aspect-square w-[clamp(7px,0.85%,13px)] rounded-full bg-foreground shadow-[0_0_10px_rgba(245,239,230,0.4)] ring-1 ring-canvas/60"
                    style={{
                      transform:
                        "translate(-50%, -50%) scaleX(var(--ball-stretch)) scaleY(var(--ball-squash))",
                      willChange: "transform",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Specular glare tracking the cursor across the plate */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(620px circle at calc(var(--gx) * 1%) calc(var(--gy) * 1%), rgba(245,239,230,0.16), rgba(245,239,230,0.04) 34%, transparent 62%)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Overlay content — fully static: no tilt, no parallax, always horizontal */}
      <div
        className={`${getPrimeContainerClassName("wide")} relative z-10 grid min-h-[max(620px,86svh)] grid-rows-[auto_1fr_auto] gap-12 py-16 max-[640px]:min-h-[560px] max-[640px]:gap-10 max-[640px]:py-12`}
      >
        <div className="flex items-start justify-between gap-6">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-foreground max-[640px]:text-[10px] max-[640px]:tracking-[0.16em]">
            {label}
          </span>
       
        </div>

        <div className="flex items-center">
          <h1 className={`${primeHeadingBaseClass} text-[clamp(56px,13vw,168px)] font-extrabold leading-[0.86] tracking-[0.02em] text-foreground [text-shadow:0_18px_48px_rgba(2,8,18,0.45)]`}>
            {headlineTop}
            <br />
            {headlineBottom}
          </h1>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-8 max-[640px]:gap-7">
          <div className={`${primeMonoValueClass} max-w-[40ch] text-[11px] uppercase leading-[1.7] tracking-[0.1em] text-foreground/55`}>
            <span className="block text-foreground/75">{tag}</span>
            <span className="block">{caption}</span>
          </div>

          <Link
            href={ctaHref}
            className="group relative inline-flex min-h-12 skew-x-[-11deg] items-center justify-center overflow-hidden bg-foreground px-8 text-canvas transition-colors duration-300 ease-out [clip-path:polygon(0_0,calc(100%-16px)_0,100%_16px,100%_100%,0_100%)] hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-secondary max-[640px]:min-h-11 max-[640px]:px-6"
          >
            <span className="skew-x-[11deg] text-[13px] font-bold uppercase tracking-[0.16em]">
              {ctaLabel}
            </span>
            {/* Folded-corner / ribbon detail */}
            <span
              aria-hidden="true"
              className="absolute right-0 top-0 size-4 bg-canvas/25 transition-colors duration-300 ease-out [clip-path:polygon(0_0,0_100%,100%_100%)] group-hover:bg-foreground/30"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
