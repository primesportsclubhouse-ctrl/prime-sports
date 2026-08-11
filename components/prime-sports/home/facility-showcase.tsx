import { Building2, Dumbbell, LandPlot, Moon, Sofa, Trophy } from "lucide-react";

import { ExpandingCards, type CardItem } from "@/components/ui/expanding-cards";

const iconSize = 22;

/**
 * Facility gallery cards.
 *
 * Each card takes a `media` payload that is either an image or a video:
 *
 *   media: { type: "image", src: "/prime-sports/covered-court.jpg", alt: "…" }
 *   media: { type: "video", src: "/prime-sports/court-tour.mp4", poster: "/prime-sports/court-tour.jpg" }
 *
 * Video cards autoplay (muted, looped) while the card is hovered/focused and
 * pause the moment it is not. Drop an `.mp4`/`.webm` into `public/prime-sports/`
 * and switch the `type` to `"video"` — no other change is needed.
 */
const facilityCards: CardItem[] = [
  {
    id: "pickeball-courts",
    title: "Pickleball Courts",
    description:
      "International Standard Silica Sand Surfaces",
    media: {
      type: "image",
      src: "/prime-sports/prime-core-court.jpeg",
      alt: "Prime Sports covered championship court",
    },
    meta: "7 courts",
  },
  {
    id: "badminton-courts",
    title: "Badminton Courts",
    description:
      "International Standard Taraflex Surfaces",
    media: {
      type: "image",
      src: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&w=1400&q=80",
      alt: "Indoor badminton show court",
    },
    meta: "4 courts",
  },
  {
    id: "players-lounge",
    title: "Players' Lounge (AC)",
    description:
      "Comfortable seating for players waiting on the next slot.",
    media: {
      type: "image",
      src: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1400&q=80",
      alt: "Outdoor sports courts at Prime Sports",
    },
    // meta: "[N] courts · [Surface]",
  },
  {
    id: "multi-purpose-area",
    title: "Multi-Purpose Area",
    description:
      "Open space for warm-ups and footwork drills sessions between games.",
    media: {
      type: "image",
      src: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1400&q=80",
      alt: "Court under evening floodlights",
    },
    // icon: <Moon size={iconSize} />,
    // meta: "[Time range] · Peak",
  },
  {
    id: "food-park",
    title: "Food Park",
    description:
      "Refreshments and light meals for players and visitors.",
    media: {
      type: "image",
      src: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1400&q=80",
      alt: "Court-side training and conditioning zone",
    },
    // icon: <Dumbbell size={iconSize} />,
    // meta: "Open [Open]–[Close]",
  },
  {
    id: "toilet-shower-room",
    title: "AC Toilet & Shower Room",
    description:
      "Clean and well-maintained facilities for player convenience.",
    media: {
      type: "image",
      src: "https://images.unsplash.com/photo-1552667466-07770ae110d0?auto=format&fit=crop&w=1400&q=80",
      alt: "Club seating and lounge area",
    },
    // icon: <Sofa size={iconSize} />,
    // meta: "[Amenities]",
  },
];

export default function FacilityShowcase() {
  return (
    <ExpandingCards
      items={facilityCards}
      defaultActiveIndex={0}
      label="Prime Sports facility gallery"
    />
  );
}
