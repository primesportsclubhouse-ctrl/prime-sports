// Supabase-touching "resolve a sport's courts" helper shared by the
// availability-blocks route handlers (GET/POST) — both need the same
// courts.id <-> (sport, courtIndex) mapping that /api/availability's GET
// already derives inline via parseCourtName(). Split out here (rather than
// duplicated in both route files, or added to lib/booking.ts, which is
// deliberately Supabase-client-free — see that file's header comment).

import { parseCourtName } from "@/lib/booking";
import type { SportKey } from "@/lib/prime-sports";
import type { createServiceRoleClient } from "@/lib/supabase/service-role";

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

export type ResolvedSportCourt = {
  id: string;
  name: string;
  courtIndex: number;
};

/** Every `courts` row belonging to `sport`, tagged with the courtIndex the
 *  editor grid and /api/availability both key off of. Throws on a Supabase
 *  error so route handlers can surface it directly rather than threading a
 *  second { error } shape through this helper. */
export async function resolveCourtsForSport(
  supabase: ServiceRoleClient,
  sport: SportKey,
): Promise<ResolvedSportCourt[]> {
  const { data, error } = await supabase.from("courts").select("id, name").order("name");

  if (error) {
    throw new Error(error.message);
  }

  const resolved: ResolvedSportCourt[] = [];

  for (const court of data ?? []) {
    const parsed = parseCourtName(court.name);
    if (parsed && parsed.sport === sport) {
      resolved.push({ id: court.id, name: court.name, courtIndex: parsed.courtIndex });
    }
  }

  return resolved;
}
