"use client";

import Link from "next/link";
import { motion } from "motion/react";

/**
 * The closing beat of the page — the last thing a visitor sees, so it earns a slightly
 * more deliberate reveal than the supporting sections above it. Still subordinate to the
 * hero: no idle pulse/glow loop on the button — its existing hover fill already carries
 * the "you can act on this" feedback (the Glow-Not-Lift rule reserves glow for
 * active/focus state, not an idle attention-getter).
 */
const REVEAL_TRANSITION = { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const };

export default function ClosingCta() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={REVEAL_TRANSITION}
      >
        <h2 className="max-w-[14ch] [font-family:var(--font-heading)] text-[clamp(28px,4vw,42px)] font-extrabold uppercase leading-[1.1] tracking-[0.06em]">
          Your court is waiting.
        </h2>
        <p className="mt-2 text-[15px] opacity-65">Reserve in under few minutes. Pay your way. Show up &amp; play.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ ...REVEAL_TRANSITION, delay: 0.1 }}
      >
        <Link
          href="/reserve"
          className="group relative inline-flex min-h-12 skew-x-[-11deg] items-center justify-center overflow-hidden bg-foreground px-8 text-canvas transition-colors duration-300 ease-out [clip-path:polygon(0_0,calc(100%-16px)_0,100%_16px,100%_100%,0_100%)] hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-secondary max-[640px]:min-h-11 max-[640px]:px-6"
        >
          <span className="skew-x-[11deg] text-[13px] font-bold uppercase tracking-[0.16em]">
            Reserve a Court →
          </span>
          {/* Folded-corner / ribbon detail */}
          <span
            aria-hidden="true"
            className="absolute right-0 top-0 size-4 bg-canvas/25 transition-colors duration-300 ease-out [clip-path:polygon(0_0,0_100%,100%_100%)] group-hover:bg-foreground/30"
          />
        </Link>
      </motion.div>
    </>
  );
}
