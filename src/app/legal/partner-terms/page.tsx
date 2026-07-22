import type { Metadata } from "next";
import { LegalStubPage } from "@/components/legal/LegalStubPage";

export const metadata: Metadata = {
  title: "Partner Terms & Conditions",
  description: "The terms and conditions for transport partners operating on Movers Now.",
  alternates: { canonical: "/legal/partner-terms" },
};

export default function PartnerTermsPage() {
  return (
    <LegalStubPage
      title="Partner Terms & Conditions"
      intro="These terms will cover vetting requirements, job acceptance, payment schedules and conduct standards for transport partners."
    />
  );
}
