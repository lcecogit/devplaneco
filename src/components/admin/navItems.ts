import {
  GaugeIcon,
  CarIcon,
  TrendingUpIcon,
  ScaleIcon,
  SettingsIcon,
  HelpCircleIcon,
} from "@/components/icons";

export type NavItem = { label: string; href: string; icon: typeof GaugeIcon };

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/admin", icon: GaugeIcon },
  { label: "Vehicle Approvals", href: "/admin/vehicles", icon: CarIcon },
  { label: "Partner Performance", href: "/admin/performance", icon: TrendingUpIcon },
  { label: "Disputes & Charges", href: "/admin/disputes", icon: ScaleIcon },
  { label: "Admin Settings", href: "/admin/settings", icon: SettingsIcon },
  { label: "Support", href: "/admin/support", icon: HelpCircleIcon },
];
