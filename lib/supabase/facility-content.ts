// Supabase-touching helpers for `facility_media` / `faq_items` /
// `facility_settings` — the real source of truth for the facility gallery,
// homepage FAQ, and address/hours/contact content as of the facility content
// management slice (see
// supabase/migrations/20260816010000_phase3_facility_content_schema.sql).
// Shared by the public GET routes (/api/facility-media, /api/faq-items,
// /api/facility-settings, /api/facility-content), the staff-only mutation
// routes, and the Server Components that read this content directly
// (app/(public)/page.tsx, site-footer.tsx) — none of them should hold a
// second copy of this read/write logic.

import type {
  FacilityMediaItem,
  FacilitySettingsRecord,
  FaqItemRecord,
} from "@/lib/facility-content";
import type { createServiceRoleClient } from "@/lib/supabase/service-role";

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

const EMPTY_SETTINGS: FacilitySettingsRecord = {
  addressLine: "",
  addressArea: "",
  hoursValue: "",
  hoursNote: "",
  parkingSlots: null,
  parkingNote: null,
  landmarkNote: null,
  contactPhone: null,
  contactEmail: null,
};

export async function fetchFacilityMedia(supabase: ServiceRoleClient): Promise<FacilityMediaItem[]> {
  const { data, error } = await supabase
    .from("facility_media")
    .select("id, slug, title, description, media_type, src, alt, meta, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    description: row.description as string,
    mediaType: row.media_type as FacilityMediaItem["mediaType"],
    src: row.src as string | null,
    alt: row.alt as string | null,
    meta: row.meta as string | null,
    sortOrder: row.sort_order as number,
  }));
}

export async function fetchFaqItems(supabase: ServiceRoleClient): Promise<FaqItemRecord[]> {
  const { data, error } = await supabase
    .from("faq_items")
    .select("id, question, answer, category, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    question: row.question as string,
    answer: row.answer as string,
    category: row.category as string | null,
    sortOrder: row.sort_order as number,
  }));
}

/** Reads the singleton settings row. Falls back to an all-empty record (not
 *  an error) if the row is somehow missing — the seed migration inserts it
 *  once, and the schema's own check constraint prevents more than one row
 *  from ever existing, but this stays defensive rather than assuming the
 *  seed always ran. */
export async function fetchFacilitySettings(supabase: ServiceRoleClient): Promise<FacilitySettingsRecord> {
  const { data, error } = await supabase
    .from("facility_settings")
    .select(
      "address_line, address_area, hours_value, hours_note, parking_slots, parking_note, landmark_note, contact_phone, contact_email",
    )
    .eq("id", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return EMPTY_SETTINGS;
  }

  return {
    addressLine: (data.address_line as string) ?? "",
    addressArea: (data.address_area as string) ?? "",
    hoursValue: (data.hours_value as string) ?? "",
    hoursNote: (data.hours_note as string) ?? "",
    parkingSlots: (data.parking_slots as number | null) ?? null,
    parkingNote: (data.parking_note as string | null) ?? null,
    landmarkNote: (data.landmark_note as string | null) ?? null,
    contactPhone: (data.contact_phone as string | null) ?? null,
    contactEmail: (data.contact_email as string | null) ?? null,
  };
}

/** Upserts onto the fixed `id = true` singleton row (creating it if the seed
 *  somehow never ran) so PATCH /api/facility-settings always has exactly one
 *  row to write onto. */
export async function saveFacilitySettings(
  supabase: ServiceRoleClient,
  patch: FacilitySettingsRecord,
): Promise<FacilitySettingsRecord> {
  const { error } = await supabase.from("facility_settings").upsert(
    {
      id: true,
      address_line: patch.addressLine,
      address_area: patch.addressArea,
      hours_value: patch.hoursValue,
      hours_note: patch.hoursNote,
      parking_slots: patch.parkingSlots,
      parking_note: patch.parkingNote,
      landmark_note: patch.landmarkNote,
      contact_phone: patch.contactPhone,
      contact_email: patch.contactEmail,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  return fetchFacilitySettings(supabase);
}
