import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: "Contact Us" };

export default function PartnerContactPage() {
  return (
    <div className="max-w-xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Contact us</h1>
      <p className="mt-2 text-sm text-ink-700">
        Our partner support team is here to help with anything account or job related.
      </p>

      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white p-6">
        <div>
          <p className="text-sm font-medium text-ink-800">Phone</p>
          <a href={`tel:${siteConfig.supportPhone.replace(/\s/g, "")}`} className="text-sm text-brand-600 hover:text-brand-700">
            {siteConfig.supportPhone}
          </a>
        </div>
        <div>
          <p className="text-sm font-medium text-ink-800">Email</p>
          <a href={`mailto:${siteConfig.supportEmail}`} className="text-sm text-brand-600 hover:text-brand-700">
            {siteConfig.supportEmail}
          </a>
        </div>
      </div>
    </div>
  );
}
