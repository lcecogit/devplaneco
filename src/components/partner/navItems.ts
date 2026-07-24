import {
  GaugeIcon,
  RouteIcon,
  CalendarIcon,
  MessageIcon,
  MapPinIcon,
  UsersIcon,
  CarIcon,
  BanknoteIcon,
  HelpCircleIcon,
} from "@/components/icons";

export type NavLeaf = { label: string; href: string };
export type NavItem = {
  label: string;
  icon: typeof GaugeIcon;
  href?: string;
  children?: NavLeaf[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/partner/dashboard", icon: GaugeIcon },
  {
    label: "Work",
    icon: RouteIcon,
    children: [
      { label: "Find Work", href: "/partner/work/find" },
      { label: "My Work", href: "/partner/work/my-work" },
      { label: "Bidding", href: "/partner/work/bidding" },
      { label: "Watching", href: "/partner/work/watching" },
      { label: "Invitations", href: "/partner/work/invitations" },
      { label: "Alerts", href: "/partner/work/alerts" },
      { label: "Book Now", href: "/partner/work/book-now" },
    ],
  },
  { label: "Reservations", href: "/partner/reservations", icon: CalendarIcon },
  { label: "Messages", href: "/partner/messages", icon: MessageIcon },
  { label: "Routes", href: "/partner/routes", icon: MapPinIcon },
  { label: "Profile", href: "/partner/profile", icon: UsersIcon },
  { label: "Vehicles", href: "/partner/vehicles", icon: CarIcon },
  { label: "Payments", href: "/partner/payments", icon: BanknoteIcon },
  {
    label: "Support",
    icon: HelpCircleIcon,
    children: [
      { label: "Help", href: "/partner/support/help" },
      { label: "Contact Us", href: "/partner/support/contact" },
      { label: "Partner Terms and Conditions", href: "/legal/partner-terms" },
    ],
  },
];
