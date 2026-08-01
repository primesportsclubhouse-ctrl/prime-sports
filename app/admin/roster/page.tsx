import type { Metadata } from "next";

import AdminShell from "@/components/prime-sports/admin/admin-shell";
import RosterClient from "@/components/prime-sports/roster/roster-client";

export const metadata: Metadata = {
  title: "Admin Roster | Prime Sports",
  description: "Staff-only court-side attendance tracking and player roster management.",
};

export default function AdminRosterPage() {
  return (
    <AdminShell
      currentPath="/admin/roster"
      title="Court-Side Check-In"
      description="Operations interface for organizers and staff to manage active session attendance."
    >
      <RosterClient />
    </AdminShell>
  );
}
