import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { QuoteWizard } from "@/components/quote/QuoteWizard";

export const metadata: Metadata = {
  title: "Get a Free Quote",
  description:
    "Get an instant estimate to move anything, anywhere. Tell us what you're moving and where — no account needed until you're ready to book.",
  alternates: {
    canonical: "/quote",
  },
};

export default function QuotePage() {
  return (
    <main id="main-content" className="bg-brand-50/40 py-16 sm:py-24">
      <Container className="max-w-2xl">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-extrabold text-ink-900 sm:text-4xl">
            Get an instant quote
          </h1>
          <p className="mt-4 text-lg text-ink-700">
            Tell us what needs moving and where — no account needed until you&apos;re
            ready to book.
          </p>
        </div>

        <div className="mt-10">
          <QuoteWizard />
        </div>

        <p className="mt-6 text-center text-sm text-ink-700">
          Prefer to talk it through? Call us on{" "}
          <a href="tel:02038723050" className="font-semibold text-brand-600">
            0203 872 3050
          </a>
        </p>
      </Container>
    </main>
  );
}
