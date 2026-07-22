import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";
import { siteConfig } from "@/lib/site-config";

type Props = {
  params: { slug: string };
};

function getService(slug: string) {
  return SERVICE_CATEGORIES.find((service) => service.slug === slug);
}

export function generateStaticParams() {
  return SERVICE_CATEGORIES.map((service) => ({ slug: service.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const service = getService(params.slug);
  if (!service) return {};

  return {
    title: `${service.title} Quotes`,
    description: `${service.description} ${service.ctaLabel} from vetted, insured Movers Now transport partners.`,
    alternates: {
      canonical: `/services/${service.slug}`,
    },
  };
}

export default function ServicePage({ params }: Props) {
  const service = getService(params.slug);
  if (!service) notFound();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Services", item: `${siteConfig.url}/#services` },
      {
        "@type": "ListItem",
        position: 3,
        name: service.title,
        item: `${siteConfig.url}/services/${service.slug}`,
      },
    ],
  };

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${service.title} — ${siteConfig.name}`,
    serviceType: service.title,
    description: service.description,
    provider: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    areaServed: "GB",
  };

  return (
    <main id="main-content" className="py-16 sm:py-20">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />

      <Container className="max-w-2xl">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-700">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-brand-600">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/#services" className="hover:text-brand-600">
                Services
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-ink-900">
              {service.title}
            </li>
          </ol>
        </nav>

        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
          Page in progress
        </span>
        <h1 className="mt-4 font-heading text-3xl font-extrabold text-ink-900 sm:text-4xl">
          {service.title}
        </h1>
        <p className="mt-4 text-lg text-ink-700">{service.description}</p>
        <p className="mt-2 text-sm text-ink-700">
          Full pricing, coverage area and partner details for this service are
          coming soon. For now, start a general quote request and mention{" "}
          {service.title.toLowerCase()} in the details.
        </p>

        <Link
          href="/quote"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-coral-500 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-coral-600"
        >
          Get a free quote
        </Link>
      </Container>
    </main>
  );
}
