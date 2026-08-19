export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/" },
  { label: "Airports", href: "/airports" },
  { label: "Routes", href: "/routes" },
  { label: "Punctuality", href: "/punctuality" },
  { label: "Airlines", href: "/airlines" },
  { label: "Map", href: "/map" },
  { label: "Compare", href: "/compare" },
  { label: "Methodology", href: "/about/data" },
];
