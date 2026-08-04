import type { Metadata } from "next";
import { PARTNER_FAQS } from "@/lib/constants/partner-faq";
import { FaqSearch } from "@/components/partner/support/FaqSearch";

export const metadata: Metadata = { title: "Help" };

export default function PartnerHelpPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Help</h1>
      <p className="mt-1 text-sm text-ink-700">
        Search across getting started, finding work, reservations, messages, reviews, and
        your account.
      </p>

      <div className="mt-6">
        <FaqSearch faqs={PARTNER_FAQS} />
      </div>
    </div>
  );
}
