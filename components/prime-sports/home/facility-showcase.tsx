"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { ExpandingCards, type CardItem } from "@/components/ui/expanding-cards";

import fallbackMark from "@/public/prime-sports/header-logo.png";

/**
 * Facility gallery cards.
 *
 * Cards with no `src` fall back to the club crest on a branded ground, so the
 * gallery stays presentable until the real photography lands. This card list
 * used to be the hardcoded `facilityCards` array below — it's now read from
 * `facility_media` (see supabase/migrations/20260816010000_phase3_facility_content_schema.sql)
 * via GET /api/facility-media, so a staff member can add real photos or edit
 * copy from /admin/content without a code deploy. To fill a slot in today,
 * either drop the asset into `public/prime-sports/` and paste that path into
 * the card's "Photo/Video URL" field in /admin/content, or paste any
 * externally-hosted image/video URL directly — no code change needed either
 * way.
 *
 * `FALLBACK_CARDS` (same six cards this file always shipped with) renders
 * immediately on mount and again if the fetch ever fails, so the section
 * never flashes empty or breaks if the API is briefly unreachable — it's a
 * "last known good" default, not invented content.
 */
const FALLBACK_CARDS: CardItem[] = [
  {
    id: "pickeball-courts",
    title: "Pickleball Courts",
    description: "International Standard Silica Sand Surfaces",
    meta: "7 courts",
  },
  {
    id: "badminton-courts",
    title: "Badminton Courts",
    description: "International Standard Taraflex Surfaces",
    meta: "4 courts",
  },
  {
    id: "players-lounge",
    title: "Players' Lounge (AC)",
    description: "Comfortable seating for players waiting on the next slot.",
  },
  {
    id: "multi-purpose-area",
    title: "Multi-Purpose Area",
    description: "Open space for warm-ups and footwork drills sessions between games.",
  },
  {
    id: "food-park",
    title: "Food Park",
    description: "Refreshments and light meals for players and visitors.",
  },
  {
    id: "toilet-shower-room",
    title: "AC Toilet & Shower Room",
    description: "Clean and well-maintained facilities for player convenience.",
  },
];

type FacilityMediaRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  mediaType: "image" | "video";
  src: string | null;
  alt: string | null;
  meta: string | null;
  sortOrder: number;
};

function toCardItem(row: FacilityMediaRow): CardItem {
  return {
    id: row.slug,
    title: row.title,
    description: row.description,
    meta: row.meta ?? undefined,
    // No `media` key at all when `src` is null — same "omit while the real
    // photo/clip is still outstanding" contract components/ui/expanding-cards.tsx
    // already documents, so a card with no uploaded photo yet renders the
    // crest fallback exactly as before.
    media: row.src
      ? row.mediaType === "video"
        ? { type: "video", src: row.src, alt: row.alt ?? undefined }
        : { type: "image", src: row.src, alt: row.alt ?? row.title }
      : undefined,
  };
}

export default function FacilityShowcase() {
  const [cards, setCards] = useState<CardItem[]>(FALLBACK_CARDS);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/facility-media");
        const data = await response.json().catch(() => null);

        if (cancelled || !response.ok || !Array.isArray(data?.media)) {
          return;
        }

        const rows = data.media as FacilityMediaRow[];
        if (rows.length > 0) {
          setCards(rows.map(toCardItem));
        }
      } catch {
        // Silent — FALLBACK_CARDS stays on screen, an honest "same content as
        // before" rather than an invented or broken state.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    // Single reveal for the gallery as one unit on first scroll-into-view — the cards'
    // own hover/focus expand and media crossfade already carry the section's interaction
    // language, so this stays a plain fade+rise rather than stacking a per-card stagger.
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <ExpandingCards
        items={cards}
        defaultActiveIndex={0}
        fallbackMark={fallbackMark}
        label="Prime Sports facility gallery"
      />
    </motion.div>
  );
}
