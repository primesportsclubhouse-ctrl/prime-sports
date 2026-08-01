import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Roster Redirect | Prime Sports",
  description: "Redirects roster access to the admin roster route.",
};

export default function RosterPage() {
  redirect("/admin/roster");
}