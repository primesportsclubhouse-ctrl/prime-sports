// Shared types/validation for the facility content management slice
// (`facility_media`, `faq_items`, `facility_settings`) — pure mapping only,
// no Supabase client here, mirroring the lib/booking.ts / lib/roster.ts
// separation so route handlers stay the only place request-scoped Supabase
// clients get created.

export type FacilityMediaType = "image" | "video";

/** Mirrors one row of `facility_media`. `src`/`alt`/`meta` are nullable —
 *  a card with no uploaded photo yet (src null) still renders, falling back
 *  to the club crest exactly the way components/ui/expanding-cards.tsx
 *  already handles a card with no `media` at all. */
export type FacilityMediaItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  mediaType: FacilityMediaType;
  src: string | null;
  alt: string | null;
  meta: string | null;
  sortOrder: number;
};

/** Mirrors one row of `faq_items`. `category` is nullable — mirrors the old
 *  `faqItems[].meta` field, which was also optional. */
export type FaqItemRecord = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
};

/** Mirrors the singleton `facility_settings` row. Every field below
 *  corresponds to a real spot in the UI today (location-panel.tsx's address/
 *  hours value+note pairs, site-footer.tsx's `[Contact]` placeholders) except
 *  parking/landmark, which don't exist in any component yet — see
 *  location-panel.tsx's own comments for why they aren't surfaced there in
 *  this slice. */
export type FacilitySettingsRecord = {
  addressLine: string;
  addressArea: string;
  hoursValue: string;
  hoursNote: string;
  parkingSlots: number | null;
  parkingNote: string | null;
  landmarkNote: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
};

export type FacilityContentBundle = {
  media: FacilityMediaItem[];
  faq: FaqItemRecord[];
  settings: FacilitySettingsRecord;
};

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Nullable-string fields (category, alt, notes, contact info) — an absent
 *  or blank value normalizes to `null` rather than `""`, matching how these
 *  columns are read back from Postgres. */
export function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isValidFacilityMediaType(value: unknown): value is FacilityMediaType {
  return value === "image" || value === "video";
}

export function isFiniteNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
