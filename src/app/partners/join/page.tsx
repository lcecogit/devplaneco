import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Become a Transport Partner",
  description:
    "Apply to become a Movers Now transport partner. Grow your removals or transport business with a steady stream of matched jobs.",
  alternates: {
    canonical: "/partners/join",
  },
};

export default function PartnerJoinPage() {
  return (
    <main id="main-content" className="bg-ink-900 py-20 sm:py-28">
      <Container className="max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-100">
          Partner applications coming soon
        </span>
        <h1 className="mt-6 font-heading text-3xl font-extrabold text-white sm:text-4xl">
          Become a Movers Now transport partner
        </h1>
        <p className="mt-4 text-lg text-brand-100">
          Our online partner application is on its way. Once it&apos;s live
          here, you&apos;ll be able to submit your business and vehicle
          details and start receiving matched jobs.
        </p>
        <p className="mt-2 text-sm text-brand-100">
          Want to get started sooner? Email{" "}
          <a href="mailto:help@moversnow.example" className="font-semibold text-white">
            help@moversnow.example
          </a>{" "}
          with your business name and coverage area.
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
