import {
  HomeIcon, UtensilsIcon, SparkleIcon, AppleIcon, DropIcon, ScaleIcon,
  ChartIcon, TargetIcon, UserIcon, GearIcon,
} from "./icons";

export type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
};

// Shared by the desktop Sidebar and the mobile drawer so the two never drift.
export const MAIN_NAV: NavItem[] = [
  { href: "/today", label: "Dashboard", icon: HomeIcon },
  { href: "/log", label: "Food Log", icon: UtensilsIcon },
  { href: "/coach", label: "AI Coach", icon: SparkleIcon },
  { href: "/trends", label: "Nutrition", icon: AppleIcon },
  { href: "/water", label: "Water", icon: DropIcon },
  { href: "/weight", label: "Weight", icon: ScaleIcon },
  { href: "/trends", label: "Trends", icon: ChartIcon },
  { href: "/goals", label: "Goals", icon: TargetIcon },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/profile", label: "Profile", icon: UserIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];
