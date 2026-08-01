import { NavBar } from "@/components/ui/tubelight-navbar";

export function NavBarDemo() {
  const navItems = [
    { name: "Courts & Pricing", url: "/#pricing", icon: "pricing" },
    { name: "Facility", url: "/#facility", icon: "facility" },
    { name: "FAQ", url: "/#faq", icon: "faq" },
  ];

  return <NavBar items={navItems} />;
}
