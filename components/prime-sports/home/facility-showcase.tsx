"use client";

import { motion } from "motion/react";

import { ExpandingCards, type CardItem } from "@/components/ui/expanding-cards";

import fallbackMark from "@/public/prime-sports/header-logo.png";

/**
 * Facility gallery cards.
 *
 * Cards with no `media` key fall back to the club crest on a branded ground, so
 * the gallery stays presentable until the real photography lands. To fill one in,
 * drop the asset into `public/prime-sports/` and uncomment its `media` block:
 *
 *   media: { type: "image", src: "/prime-sports/badminton-courts.jpg", alt: "…" }
 *   media: { type: "video", src: "/prime-sports/court-tour.mp4", poster: "/prime-sports/court-tour.jpg" }
 *
 * Video cards autoplay (muted, looped) while the card is hovered/focused and
 * pause the moment it is not — no other change is needed to switch a card over.
 */
const facilityCards: CardItem[] = [
  {
    id: "pickeball-courts",
    title: "Pickleball Courts",
    description: "International Standard Silica Sand Surfaces",
    // media: { type: "image", src: "/prime-sports/pickleball-courts.jpg", alt: "Pickleball courts at PrimeSports" },
    meta: "7 courts",
  },
  {
    id: "badminton-courts",
    title: "Badminton Courts",
    description: "International Standard Taraflex Surfaces",
    // media: { type: "image", src: "/prime-sports/badminton-courts.jpg", alt: "Indoor badminton courts" },
    meta: "4 courts",
  },
  {
    id: "players-lounge",
    title: "Players' Lounge (AC)",
    description: "Comfortable seating for players waiting on the next slot.",
    // media: { type: "image", src: "/prime-sports/players-lounge.jpg", alt: "Air-conditioned players' lounge" },
  },
  {
    id: "multi-purpose-area",
    title: "Multi-Purpose Area",
    description: "Open space for warm-ups and footwork drills sessions between games.",
    // media: { type: "image", src: "/prime-sports/multi-purpose-area.jpg", alt: "Multi-purpose warm-up area" },
  },
  {
    id: "food-park",
    title: "Food Park",
    description: "Refreshments and light meals for players and visitors.",
    // media: { type: "image", src: "/prime-sports/food-park.jpg", alt: "Food park beside the courts" },
  },
  {
    id: "toilet-shower-room",
    title: "AC Toilet & Shower Room",
    description: "Clean and well-maintained facilities for player convenience.",
    // media: { type: "image", src: "/prime-sports/toilet-shower-room.jpg", alt: "Air-conditioned toilet and shower room" },
  },
];

export default function FacilityShowcase() {
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
        items={facilityCards}
        defaultActiveIndex={0}
        fallbackMark={fallbackMark}
        label="Prime Sports facility gallery"
      />
    </motion.div>
  );
}