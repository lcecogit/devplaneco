import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { TrustSignals } from "@/components/home/TrustSignals";
import { BecomePartner } from "@/components/home/BecomePartner";
import { Faq, FAQ_ITEMS } from "@/components/home/Faq";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Instant Quotes for Removals, Single Items & Vehicle Transport",
  description:
    "Compare vetted, insured transport partners for home removals, single-item delivery, office relocations and vehicle transport. Get a free instant quote in minutes.",
  alternates: {
    canonical: "/",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
  logo: `${siteConfig.url}/favicon.ico`,
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: siteConfig.supportPhone,
      contactType: "customer service",
      email: siteConfig.supportEmail,
      areaServed: "GB",
    },
  ],
  sameAs: Object.values(siteConfig.social),
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
};

// Generated from the same FAQ_ITEMS array the visible FAQ section renders,
// so the structured data can never drift from what's on the page.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main id="main-content">
        <Hero />
        <HowItWorks />
        <ServicesGrid />
        <TrustSignals />
        <BecomePartner />
        <Faq />
      </main>
    </>
  );
}
