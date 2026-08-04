import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AcceptGuidelinesButton } from "@/components/partner/guidelines/AcceptGuidelinesButton";

export const metadata: Metadata = { title: "Partner Guidelines" };

// Adapted from AnyVan's own partner guidelines structure (confirmed via
// their live dashboard screenshots) — same section headings, rewritten for
// this platform rather than copied verbatim.
const SECTIONS = [
  {
    title: "Professionalism",
    body: "Treat every customer with respect and courtesy. Keep yourself and your vehicle clean and presentable. Arrive on time and bring everything the job needs.",
  },
  {
    title: "Communication",
    body: "Customer contact details are shared once you're matched to a job. Keep communication clear — let customers know arrival times and any delays.",
  },
  {
    title: "Respect for Property",
    body: "Handle every item carefully and use appropriate protective equipment. If something is damaged, tell the customer and support immediately.",
  },
  {
    title: "Reliability & Job Commitments",
    body: "If you can no longer make a job, tell us as early as possible so we can find another partner. Frequent last-minute cancellations affect your access to future work.",
  },
  {
    title: "Integrity & Payment Handling",
    body: "Be honest and clear in all dealings with customers. Explain any extra charges before adding them. Never accept cash or direct payment from a customer outside the platform.",
  },
  {
    title: "Safety and Compliance",
    body: "Keep your vehicle in good condition, insured, and correctly licensed at all times. Follow all transport laws and load/unload items safely.",
  },
  {
    title: "Confidentiality",
    body: "Customer information is confidential. Don't share collection/delivery details or contact information beyond what's needed to complete the job.",
  },
] as const;

export default async function PartnerGuidelinesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id, guidelines_accepted_at")
    .eq("profile_id", user!.id)
    .single();

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Partner Guidelines</h1>
      <p className="mt-1 text-sm text-ink-700">
        Read through each section below. Accepting is required before you can claim or bid on
        jobs.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {SECTIONS.map((section) => (
          <div key={section.title} className="rounded-2xl border border-brand-100 bg-white p-5">
            <h2 className="font-heading text-sm font-bold text-ink-900">{section.title}</h2>
            <p className="mt-1 text-sm text-ink-700">{section.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-brand-300 bg-white p-5">
        {partner?.guidelines_accepted_at ? (
          <p className="text-sm font-medium text-mint-700">
            Accepted on{" "}
            {new Date(partner.guidelines_accepted_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            .
          </p>
        ) : (
          <>
            <p className="text-sm text-ink-700">
              By continuing you agree to abide by these guidelines and the{" "}
              <a href="/legal/partner-terms" className="font-semibold text-brand-600 hover:text-brand-700">
                Partner Terms and Conditions
              </a>
              .
            </p>
            <div className="mt-4">
              <AcceptGuidelinesButton transportPartnerId={partner!.id} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
