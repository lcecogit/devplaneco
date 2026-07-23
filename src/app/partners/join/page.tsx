import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PartnerLeadForm } from "@/components/forms/PartnerLeadForm";

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
      <Container className="max-w-2xl">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-extrabold text-white sm:text-4xl">
            Become a Movers Now transport partner
          </h1>
          <p className="mt-4 text-lg text-brand-100">
            Tell us about your business — no account needed yet. Our partner
            team will follow up to get you fully set up.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <PartnerLeadForm />
        </div>

        <p className="mt-6 text-center text-sm text-brand-100">
          Prefer email? Write to{" "}
          <a href="mailto:help@moversnow.example" className="font-semibold text-white">
            help@moversnow.example
          </a>
        </p>
      </Container>
    </main>
  );
}
