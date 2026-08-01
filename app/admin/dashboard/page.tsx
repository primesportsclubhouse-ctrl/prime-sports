import type { Metadata } from "next";

import AdminDashboard from "@/components/prime-sports/admin/admin-dashboard";
import AdminShell from "@/components/prime-sports/admin/admin-shell";

export const metadata: Metadata = {
  title: "Admin Dashboard | Prime Sports",
  description: "Staff dashboard for master court scheduling and payment verification review.",
};

export default function AdminDashboardPage() {
  return (
    <AdminShell
      currentPath="/admin/dashboard"
      title="Administration"
      description="Master calendar and manual payment verification queue for staff operations."
    >
      <AdminDashboard />
    </AdminShell>
  );
}
