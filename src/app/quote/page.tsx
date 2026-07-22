import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Get a Free Quote",
  description:
    "Start your free transport quote in minutes. Tell us what you're moving and where, and we'll match you with vetted partners.",
  alternates: {
    canonical: "/quote",
  },
};

export default function QuotePage() {
  return (
    <main id="main-content" className="bg-brand-50/40 py-20 sm:py-28">
      <Container className="max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
          Coming soon
        </span>
        <h1 className="mt-6 font-heading text-3xl font-extrabold text-ink-900 sm:text-4xl">
          Get a free quote
        </h1>
        <p className="mt-4 text-lg text-ink-700">
          Our instant quote form is on its way. Once it&apos;s live here,
          you&apos;ll be able to tell us what needs moving and get matched with
          transport partners in minutes.
        </p>
        <p className="mt-2 text-sm text-ink-700">
          In the meantime, call us on{" "}
          <a href="tel:02038723050" className="font-semibold text-brand-600">
            0203 872 3050
          </a>{" "}
          and we&apos;ll get you a price by phone.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-coral-500 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-coral-600"
        >
          Back to homepage
        </Link>
      </Container>
    </main>
  );
}
