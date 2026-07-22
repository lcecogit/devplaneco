import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";
import { siteConfig } from "@/lib/site-config";

const FOOTER_NAV = [
  {
    heading: "Company",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Become a Partner", href: "/partners/join" },
      { label: "Help & FAQs", href: "#faq" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms & Conditions", href: "/legal/terms" },
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Partner Terms & Conditions", href: "/legal/partner-terms" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink-900 text-brand-100">
      <Container className="py-14">
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="font-heading text-xl font-extrabold text-white">
              Movers<span className="text-coral-500">Now</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-brand-100">
              The marketplace connecting people who need something moved with
              vetted, insured transport partners across the country.
            </p>
            <p className="mt-4 text-sm">
              <a href={`tel:${siteConfig.supportPhone.replace(/\s/g, "")}`} className="font-semibold text-white hover:text-mint-400">
                {siteConfig.supportPhone}
              </a>
            </p>
            <p className="mt-1 text-sm">
              <a href={`mailto:${siteConfig.supportEmail}`} className="hover:text-mint-400">
                {siteConfig.supportEmail}
              </a>
            </p>
          </div>

          {FOOTER_NAV.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-white">
                {group.heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm hover:text-mint-400">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <nav aria-label="Services">
            <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-white">
              Services
            </h3>
            <ul className="mt-4 space-y-3">
              {SERVICE_CATEGORIES.slice(0, 5).map((service) => (
                <li key={service.slug}>
                  <Link href={`/services/${service.slug}`} className="text-sm hover:text-mint-400">
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-brand-100">
            &copy; {year} Movers Now Ltd. All rights reserved.
          </p>
          <div className="flex gap-5">
            <a href={siteConfig.social.facebook} className="text-sm hover:text-mint-400">
              Facebook
            </a>
            <a href={siteConfig.social.instagram} className="text-sm hover:text-mint-400">
              Instagram
            </a>
            <a href={siteConfig.social.x} className="text-sm hover:text-mint-400">
              X
            </a>
            <a href={siteConfig.social.linkedin} className="text-sm hover:text-mint-400">
              LinkedIn
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
