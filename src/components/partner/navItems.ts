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
  TrendingUpIcon,
  StarIcon,
  BellIcon,
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
  { label: "Insights", href: "/partner/insights", icon: TrendingUpIcon },
  {
    label: "Work",
    icon: RouteIcon,
    children: [
      { label: "Find Work", href: "/partner/work/find" },
      { label: "My Work", href: "/partner/work/my-work" },
      { label: "Bidding", href: "/partner/work/bidding" },
      // AnyVan's own nav has "Auction search" as a distinct quick-access
      // entry point separate from Find Work, but it opens the exact same
      // auction browsing surface — no separate page here either, just a
      // second link to Bidding rather than a duplicate feature.
      { label: "Auction Search", href: "/partner/work/bidding" },
      { label: "Express Interest", href: "/partner/work/express-interest" },
      { label: "Watching", href: "/partner/work/watching" },
      { label: "Invitations", href: "/partner/work/invitations" },
      { label: "Alerts", href: "/partner/work/alerts" },
      { label: "Book Now", href: "/partner/work/book-now" },
    ],
  },
  { label: "Reservations", href: "/partner/reservations", icon: CalendarIcon },
  { label: "Messages", href: "/partner/messages", icon: MessageIcon },
  { label: "Notifications", href: "/partner/notifications", icon: BellIcon },
  { label: "Routes", href: "/partner/routes", icon: MapPinIcon },
  { label: "Profile", href: "/partner/profile", icon: UsersIcon },
  { label: "Customer Reviews", href: "/partner/reviews", icon: StarIcon },
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
