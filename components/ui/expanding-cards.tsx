"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";

import { cn } from "@/lib/utils";

/**
 * Media payload for a card. Images render through `next/image`; videos render
 * through a native `<video>` that autoplays while its card is active (hovered,
 * focused, or tapped) and pauses as soon as it is not.
 */
export type CardMedia =
  | { type: "image"; src: string; alt?: string }
  | { type: "video"; src: string; poster?: string; alt?: string };

export type CardItem = {
  id: string | number;
  title: string;
  description: string;
  media: CardMedia;
  /** Optional lucide icon (or any node) revealed with the expanded content. */
  icon?: ReactNode;
  /** Optional short mono sub-label, e.g. "4 courts · 24m ceiling". */
  meta?: string;
  /** When set, the whole card becomes a link. */
  href?: string;
};

type ExpandingCardsProps = {
  items: CardItem[];
  /** Index expanded on first paint; `null` starts evenly split. */
  defaultActiveIndex?: number | null;
  className?: string;
  /** Accessible name for the list. */
  label?: string;
  ref?: Ref<HTMLUListElement>;
};

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(query.matches);

    sync();
    query.addEventListener("change", sync);

    return () => query.removeEventListener("change", sync);
  }, []);

  return prefersReducedMotion;
}

const mediaClassName =
  "absolute inset-0 h-full w-full scale-110 object-cover grayscale transition-[transform,filter] duration-500 ease-out group-data-[active=true]:scale-100 group-data-[active=true]:grayscale-0";

function CardMediaLayer({
  media,
  title,
  active,
  priority,
}: {
  media: CardMedia;
  title: string;
  active: boolean;
  priority: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (active && !prefersReducedMotion) {
      // Autoplay can be rejected (data saver, low power mode) — the poster stays up.
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [active, prefersReducedMotion]);

  if (media.type === "video") {
    return (
      <video
        ref={videoRef}
        className={mediaClassName}
        src={media.src}
        poster={media.poster}
        aria-label={media.alt ?? title}
        muted
        loop
        playsInline
        preload="metadata"
        tabIndex={-1}
      />
    );
  }

  return (
    <Image
      className={mediaClassName}
      src={media.src}
      alt={media.alt ?? title}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 720px"
      priority={priority}
    />
  );
}

export function ExpandingCards({
  items,
  defaultActiveIndex = 0,
  className,
  label,
  ref,
}: ExpandingCardsProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(defaultActiveIndex);

  // A single template string drives columns on desktop and rows on mobile, so the
  // layout never depends on a JS breakpoint read (no hydration flash, no resize listener).
  const template = useMemo(
    () => items.map((_, index) => (index === activeIndex ? "5fr" : "1fr")).join(" "),
    [items, activeIndex],
  );

  if (!items.length) {
    return null;
  }

  return (
    <ul
      ref={ref}
      aria-label={label}
      className={cn(
        "grid w-full gap-2.5",
        "h-[580px] sm:h-[620px] md:h-[440px] lg:h-[500px]",
        "[grid-template-columns:1fr] [grid-template-rows:var(--card-span)]",
        "md:[grid-template-columns:var(--card-span)] md:[grid-template-rows:1fr]",
        "transition-[grid-template-columns,grid-template-rows] duration-500 ease-out motion-reduce:transition-none",
        className,
      )}
      style={{ "--card-span": template } as CSSProperties}
    >
      {items.map((item, index) => {
        const active = activeIndex === index;

        return (
          <li
            key={item.id}
            data-active={active}
            tabIndex={item.href ? undefined : 0}
            onMouseEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onClick={() => setActiveIndex(index)}
            className={cn(
              "group relative min-h-0 min-w-0 cursor-pointer overflow-hidden rounded-[var(--radius)]",
              "border border-border bg-surface shadow-[var(--shadow-sm)]",
              "transition-[border-color,box-shadow] duration-300",
              "focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-accent-secondary",
              "data-[active=true]:border-accent-secondary/60 data-[active=true]:shadow-[var(--shadow-md)]",
              "md:min-w-[76px]",
            )}
          >
            <CardMediaLayer
              media={item.media}
              title={item.title}
              active={active}
              priority={index === defaultActiveIndex}
            />

            <div
              className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,16,27,0.92),rgba(6,16,27,0.5)_45%,rgba(6,16,27,0.12))]"
              aria-hidden="true"
            />

            {/* Collapsed label: horizontal on mobile, vertical on desktop. */}
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute bottom-4 left-4 right-4 truncate",
                "[font-family:var(--font-heading)] text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/85",
                "transition-opacity duration-300 ease-out group-data-[active=true]:opacity-0",
                "md:bottom-5 md:right-auto md:max-h-[calc(100%-2.5rem)] md:rotate-180 md:[writing-mode:vertical-rl]",
              )}
            >
              {item.title}
            </span>

            <article className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-2.5 p-5 md:p-6">
              {item.icon ? (
                <span className="text-accent-secondary opacity-0 transition-opacity duration-300 delay-75 ease-out group-data-[active=true]:opacity-100">
                  {item.icon}
                </span>
              ) : null}

              <h3 className="[font-family:var(--font-heading)] text-xl font-extrabold uppercase leading-[1.15] tracking-[0.06em] text-foreground opacity-0 transition-opacity duration-300 delay-150 ease-out group-data-[active=true]:opacity-100 md:text-2xl">
                {item.title}
              </h3>

              <p className="max-w-[42ch] text-sm leading-[1.6] text-foreground/75 opacity-0 transition-opacity duration-300 delay-200 ease-out group-data-[active=true]:opacity-100">
                {item.description}
              </p>

              {item.meta ? (
                <span className="[font-family:var(--font-mono)] text-xs font-medium uppercase tracking-[0.12em] tabular-nums text-accent-secondary/90 opacity-0 transition-opacity duration-300 delay-[250ms] ease-out group-data-[active=true]:opacity-100">
                  {item.meta}
                </span>
              ) : null}
            </article>

            {item.href ? (
              <Link href={item.href} className="absolute inset-0 z-10">
                <span className="sr-only">{item.title}</span>
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default ExpandingCards;
