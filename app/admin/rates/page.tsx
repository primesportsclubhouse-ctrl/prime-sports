import type { Metadata } from "next";

import AdminShell from "@/components/prime-sports/admin/admin-shell";
import RatesEditor from "@/components/prime-sports/admin/rates-editor";

export const metadata: Metadata = {
  title: "Rate Cards | Prime Sports Admin",
  description: "Staff controls for editing weekday/weekend and daytime/nighttime court rates.",
};

export default function AdminRatesPage() {
  return (
    <AdminShell
      currentPath="/admin/rates"
      title="Rate Cards"
      description="Edit the weekday/weekend and daytime/nighttime rates charged across every court — changes apply immediately to the homepage and booking flow."
    >
      <RatesEditor />
    </AdminShell>
  );
}
