import type { Metadata } from "next";
import { LegalStubPage } from "@/components/legal/LegalStubPage";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms and conditions for using Movers Now as a customer.",
  alternates: { canonical: "/legal/terms" },
};

export default function TermsPage() {
  return (
    <LegalStubPage
      title="Terms & Conditions"
      intro="These terms will cover how bookings, payments and cancellations work between customers and Movers Now."
    />
  );
}
