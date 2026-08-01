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
    id: "covered-courts",
    title: "Covered Courts",
    description:
      "Climate-controlled, professional-grade surfaces with gallery seating and tournament-spec lighting.",
    media: {
      type: "image",
      src: "/prime-sports/prime-core-court.jpeg",
      alt: "Prime Sports covered championship court",
    },
    icon: <Building2 size={iconSize} />,
    meta: "[N] courts · [Surface]",
  },
  {
    id: "show-court",
    title: "Show Court",
    description:
      "The centre court where club finals are played, with broadcast-ready sightlines from every seat.",
    media: {
      type: "image",
      src: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&w=1400&q=80",
      alt: "Indoor badminton show court",
    },
    icon: <Trophy size={iconSize} />,
    meta: "[Seats] capacity",
  },
  {
    id: "outdoor-courts",
    title: "Outdoor Courts",
    description:
      "Open-air, championship-spec surfaces built for daytime play and weekend club leagues.",
    media: {
      type: "image",
      src: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1400&q=80",
      alt: "Outdoor sports courts at Prime Sports",
    },
    icon: <LandPlot size={iconSize} />,
    meta: "[N] courts · [Surface]",
  },
  {
    id: "night-play",
    title: "Night Play",
    description:
      "Evening sessions under even, glare-free floodlighting — the club's busiest block of the day.",
    media: {
      type: "image",
      src: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1400&q=80",
      alt: "Court under evening floodlights",
    },
    icon: <Moon size={iconSize} />,
    meta: "[Time range] · Peak",
  },
  {
    id: "training-zone",
    title: "Training Zone",
    description:
      "Court-side conditioning space for warm-ups, footwork drills, and coached sessions between games.",
    media: {
      type: "image",
      src: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1400&q=80",
      alt: "Court-side training and conditioning zone",
    },
    icon: <Dumbbell size={iconSize} />,
    meta: "Open [Open]–[Close]",
  },
  {
    id: "members-lounge",
    title: "Members' Lounge",
    description:
      "Seating, refreshments, and a full view of the courts for players waiting on the next slot.",
    media: {
      type: "image",
      src: "https://images.unsplash.com/photo-1552667466-07770ae110d0?auto=format&fit=crop&w=1400&q=80",
      alt: "Club seating and lounge area",
    },
    icon: <Sofa size={iconSize} />,
    meta: "[Amenities]",
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
