import { GaugeIcon, BoxIcon, UsersIcon, MessageIcon } from "@/components/icons";

export type NavItem = { label: string; href: string; icon: typeof GaugeIcon };

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/customer/dashboard", icon: GaugeIcon },
  { label: "My Bookings", href: "/customer/bookings", icon: BoxIcon },
  { label: "Messages", href: "/customer/messages", icon: MessageIcon },
  { label: "Profile", href: "/customer/profile", icon: UsersIcon },
];
