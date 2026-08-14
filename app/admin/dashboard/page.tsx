import type { Metadata } from "next";

import AdminShell from "@/components/prime-sports/admin/admin-shell";
import MasterCalendar from "@/components/prime-sports/admin/master-calendar";

export const metadata: Metadata = {
  title: "Master Calendar | Prime Sports Admin",
  description: "Staff dashboard for master court scheduling across Pickleball and Badminton.",
};

export default function AdminDashboardPage() {
  return (
    <AdminShell
      currentPath="/admin/dashboard"
      title="Master Calendar"
      description="Daily schedule across every court, split by sport. Click a booking to review its submitted details."
    >
      <MasterCalendar />
    </AdminShell>
  );
}
