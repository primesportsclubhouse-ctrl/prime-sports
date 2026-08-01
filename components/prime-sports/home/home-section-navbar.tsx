"use client";

import { NavBar } from "@/components/ui/tubelight-navbar";

const sectionNavItems = [
  { name: "Courts & Pricing", url: "/#pricing", icon: "pricing" },
  { name: "Facility", url: "/#facility", icon: "facility" },
  { name: "FAQ", url: "/#faq", icon: "faq" },
  { name: "Location", url: "/#location", icon: "location" },
];

export default function HomeSectionNavbar() {
  return <NavBar items={sectionNavItems} className="max-[920px]:bottom-5" />;
}
