import type { Metadata } from "next";
import { LegalStubPage } from "@/components/legal/LegalStubPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Movers Now collects, uses and protects your personal data.",
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalStubPage
      title="Privacy Policy"
      intro="This policy will explain what personal data Movers Now collects, how it's used, and how you can control it."
    />
  );
}
