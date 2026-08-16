import type { Metadata } from "next";

import AdminShell from "@/components/prime-sports/admin/admin-shell";
import FacilityContentEditor from "@/components/prime-sports/admin/facility-content-editor";

export const metadata: Metadata = {
  title: "Facility Content | Prime Sports Admin",
  description: "Staff controls for the public homepage's gallery photos, FAQ copy, and address/hours/contact info.",
};

export default function AdminContentPage() {
  return (
    <AdminShell
      currentPath="/admin/content"
      title="Facility Content"
      description="Edit the gallery photos, FAQ copy, and address/hours/contact info shown on the public homepage — changes apply immediately, no code deploy needed."
    >
      <FacilityContentEditor />
    </AdminShell>
  );
}
