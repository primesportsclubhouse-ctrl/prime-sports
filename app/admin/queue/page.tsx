import type { Metadata } from "next";

import AdminShell from "@/components/prime-sports/admin/admin-shell";
import VerificationQueue from "@/components/prime-sports/admin/verification-queue";

export const metadata: Metadata = {
  title: "Verification Queue | Prime Sports Admin",
  description: "Manual payment verification queue for staff to approve or reject submitted bookings.",
};

export default function AdminQueuePage() {
  return (
    <AdminShell
      currentPath="/admin/queue"
      title="Verification Queue"
      description="Review pending payment submissions, cross-check receipts, and approve or reject each booking."
    >
      <VerificationQueue />
    </AdminShell>
  );
}
