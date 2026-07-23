import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircleIcon, MessageIcon, ShieldIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Support" };

const SUPPORT_LINKS = [
  {
    href: "/partner/support/help",
    icon: HelpCircleIcon,
    title: "Help",
    description: "Answers to common questions about running your business on Movers Now.",
  },
  {
    href: "/partner/support/contact",
    icon: MessageIcon,
    title: "Contact us",
    description: "Get in touch with our partner support team.",
  },
  {
    href: "/legal/partner-terms",
    icon: ShieldIcon,
    title: "Partner Terms and Conditions",
    description: "The terms that govern your partnership with Movers Now.",
  },
];

export default function SupportPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Support</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {SUPPORT_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-2xl border border-brand-100 bg-white p-6 hover:border-brand-300"
          >
            <link.icon className="h-6 w-6 text-brand-500" />
            <h2 className="mt-3 font-heading text-base font-bold text-ink-900">{link.title}</h2>
            <p className="mt-1 text-sm text-ink-700">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
