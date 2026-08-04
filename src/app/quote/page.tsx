import { Suspense } from "react";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { QuoteFlow } from "@/components/quote/QuoteFlow";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Get a Free Moving Quote",
  description:
    "Tell us your addresses and what you're moving, and see a real price for every date in the month. No account needed, no waiting for a callback.",
  alternates: {
    canonical: "/quote",
  },
};

/**
 * The homepage service cards (Phase 1) link here with ?service=<slug>. It's a
 * hint only — the actual jobs.category is derived from the item mix at
 * booking time (see lib/quote/derive-category.ts), because the inventory the
 * visitor enters is strictly better information than a category they picked
 * off a card.
 */
export default function QuotePage({
  searchParams,
}: {
  searchParams: { service?: string };
}) {
  return (
    <main id="main-content" className="bg-brand-50/40 py-12 sm:py-16">
      <Container className="max-w-5xl">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-extrabold text-ink-900 sm:text-4xl">
            Get an instant quote
          </h1>
          <p className="mt-3 text-lg text-ink-700">
            Three quick steps to a real price. No account needed until you&apos;re ready to
            book.
          </p>
        </div>

        <div className="mt-8">
          {/* useSearchParams needs a Suspense boundary to keep this page
              statically renderable rather than forcing it dynamic. */}
          <Suspense
            fallback={<p className="py-12 text-center text-sm text-ink-700">Loading…</p>}
          >
            <QuoteFlow categoryHint={searchParams.service ?? null} />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-sm text-ink-700">
          Prefer to talk it through? Call us on{" "}
          <a
            href={`tel:${siteConfig.supportPhone.replace(/\s/g, "")}`}
            className="font-semibold text-brand-600"
          >
            {siteConfig.supportPhone}
          </a>
        </p>
      </Container>
    </main>
  );
}
