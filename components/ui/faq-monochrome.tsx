"use client";

import { motion } from "motion/react";
import { useState, type MouseEvent } from "react";

import { cn } from "@/lib/utils";

// A genuine list earns a sibling stagger — but capped, so five-plus questions don't
// take forever to finish arriving. Delay plateaus at 150ms instead of growing with N.
const FAQ_STAGGER_STEP_MS = 30;
const FAQ_STAGGER_CAP_MS = 150;

export type FaqItem = {
  question: string;
  answer: string;
  /** Optional short category label rendered as a mono sub-badge. */
  meta?: string;
};

type FaqMonochromeProps = {
  items: FaqItem[];
  /** Text inside the animated signal badge. Pass `null` to hide the badge. */
  badgeLabel?: string | null;
  /** Index open on first paint; `null` starts fully collapsed. */
  defaultOpenIndex?: number | null;
  className?: string;
  id?: string;
};

export function FaqMonochrome({
  items,
  defaultOpenIndex = 0,
  className,
  id,
}: FaqMonochromeProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpenIndex);

  const setCardGlow = (event: MouseEvent<HTMLLIElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    target.style.setProperty("--faq-x", `${event.clientX - rect.left}px`);
    target.style.setProperty("--faq-y", `${event.clientY - rect.top}px`);
  };

  const clearCardGlow = (event: MouseEvent<HTMLLIElement>) => {
    const target = event.currentTarget;
    target.style.removeProperty("--faq-x");
    target.style.removeProperty("--faq-y");
  };

  return (
    <div id={id} className={cn("mx-auto flex w-full max-w-[860px] scroll-mt-28 flex-col gap-8", className)}>
      <ul className="flex flex-col gap-3.5">
        {items.map((item, index) => {
          const open = openIndex === index;
          const panelId = `faq-panel-${index}`;
          const triggerId = `faq-trigger-${index}`;

          return (
            <motion.li
              key={item.question}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.35,
                delay: Math.min(index * FAQ_STAGGER_STEP_MS, FAQ_STAGGER_CAP_MS) / 1000,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={cn(
                // The card paints its own dark surface via the inline `background` below, so its
                // text color is pinned to `text-foreground` here rather than left to inherit —
                // otherwise a light-themed section behind it would flip this to dark ink and wash
                // the question text out against the dark card.
                "group relative overflow-hidden rounded-[calc(var(--radius)*2)] border text-foreground shadow-[var(--shadow-sm)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] focus-within:-translate-y-0.5",
                open ? "border-accent-secondary/60" : "border-border",
              )}
              onMouseMove={setCardGlow}
              onMouseLeave={clearCardGlow}
              style={{
                background:
                  "radial-gradient(240px circle at var(--faq-x, 50%) var(--faq-y, 50%), rgba(212, 163, 89, 0.1), transparent 70%), var(--surface)",
              }}
            >
              <h3 className="m-0">
                <button
                  type="button"
                  id={triggerId}
                  aria-controls={panelId}
                  aria-expanded={open}
                  onClick={() => setOpenIndex((current) => (current === index ? null : index))}
                  className="relative flex w-full items-start gap-5 px-7 py-6 text-left transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-secondary max-[640px]:gap-4 max-[640px]:px-5 max-[640px]:py-5"
                >
                  <span
                    className={cn(
                      "relative flex size-11 shrink-0 items-center justify-center rounded-full border transition duration-300 group-hover:scale-105 max-[640px]:size-9",
                      open
                        ? "border-accent-secondary bg-accent-secondary text-canvas"
                        : "border-border bg-surface-muted text-foreground",
                    )}
                  >
                    {open ? (
                      <span
                        className="faq-ring pointer-events-none absolute inset-0 rounded-full border border-accent-secondary"
                        aria-hidden="true"
                      />
                    ) : null}
                    <svg
                      className={cn("relative size-5 transition-transform duration-500 max-[640px]:size-4", open && "rotate-45")}
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M12 5v14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                      <path d="M5 12h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </span>

                  <span className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <span className="[font-family:var(--font-heading)] text-[17px] font-extrabold uppercase leading-[1.25] tracking-[0.05em] max-[640px]:text-[15px]">
                      {item.question}
                    </span>
                    {item.meta ? (
                      <span
                        className={cn(
                          "inline-flex w-fit shrink-0 items-center rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] transition-colors duration-300 sm:ml-auto [font-family:var(--font-mono)]",
                          open ? "border-accent-secondary/60 text-accent-secondary" : "border-border text-muted",
                        )}
                      >
                        {item.meta}
                      </span>
                    ) : null}
                  </span>
                </button>
              </h3>

              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                inert={!open}
                className={cn(
                  "grid transition-[grid-template-rows] duration-500 ease-out",
                  open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <p className="max-w-[62ch] pb-6 pl-[76px] pr-7 text-[15px] leading-[1.65] text-muted max-[640px]:pb-5 max-[640px]:pl-5 max-[640px]:pr-5">
                    {item.answer}
                  </p>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

export default FaqMonochrome;
