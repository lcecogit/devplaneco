import { GaugeIcon, BoxIcon, UsersIcon } from "@/components/icons";

export type NavItem = { label: string; href: string; icon: typeof GaugeIcon };

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/customer/dashboard", icon: GaugeIcon },
  { label: "My Bookings", href: "/customer/bookings", icon: BoxIcon },
  { label: "Profile", href: "/customer/profile", icon: UsersIcon },
];
