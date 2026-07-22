import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";

export default function NotFound() {
  return (
    <main id="main-content" className="bg-brand-50/40 py-20 sm:py-28">
      <Container className="max-w-2xl text-center">
        <p className="font-heading text-sm font-bold uppercase tracking-wide text-coral-500">
          404
        </p>
        <h1 className="mt-3 font-heading text-3xl font-extrabold text-ink-900 sm:text-4xl">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-4 text-lg text-ink-700">
          The page you&apos;re looking for may have moved or no longer exists.
          Here are a few places to go instead.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white hover:bg-coral-600"
          >
            Go to homepage
          </Link>
          <Link
            href="/quote"
            className="rounded-full border border-brand-300 px-6 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            Get a quote
          </Link>
        </div>

        <div className="mt-10 text-left">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-ink-900">
            Popular services
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {SERVICE_CATEGORIES.map((service) => (
              <li key={service.slug}>
                <Link
                  href={`/services/${service.slug}`}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  {service.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </main>
  );
}
