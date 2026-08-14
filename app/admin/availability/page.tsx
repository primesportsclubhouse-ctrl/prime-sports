import type { Metadata } from "next";

import AdminShell from "@/components/prime-sports/admin/admin-shell";
import AvailabilityEditor from "@/components/prime-sports/admin/availability-editor";

export const metadata: Metadata = {
  title: "Availability | Prime Sports Admin",
  description: "Staff controls for blocking or reopening court hours by sport and day of week.",
};

export default function AdminAvailabilityPage() {
  return (
    <AdminShell
      currentPath="/admin/availability"
      title="Edit Availability"
      description="Block or reopen specific courts and hours per sport, per day of week — for maintenance, tournaments, or off-hours."
    >
      <AvailabilityEditor />
    </AdminShell>
  );
}
