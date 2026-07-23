import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { QuoteRequestForm } from "@/components/forms/QuoteRequestForm";

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
      <Container className="max-w-2xl">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-extrabold text-ink-900 sm:text-4xl">
            Get a free quote
          </h1>
          <p className="mt-4 text-lg text-ink-700">
            Tell us what needs moving and where — no account needed. A member of
            the team will follow up with pricing and next steps.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-brand-100 bg-white p-6 sm:p-8">
          <QuoteRequestForm />
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
