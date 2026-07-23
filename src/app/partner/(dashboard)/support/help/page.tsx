import type { Metadata } from "next";

export const metadata: Metadata = { title: "Help" };

const FAQS = [
  {
    question: "When can I start receiving jobs?",
    answer:
      "Once your business profile is complete and at least one vehicle has been approved by our team, your profile is published and you can start receiving work.",
  },
  {
    question: "How long does vehicle approval take?",
    answer:
      "Our team reviews submitted vehicles as quickly as possible. You'll see the status change from Submitted to Under review to Approved on your Vehicles page.",
  },
  {
    question: "Can I edit my vehicle after submitting it?",
    answer:
      "Yes — you can update details and re-upload documents at any time. Changing approval status yourself isn't possible once it's out of draft; that's handled by our review team.",
  },
];

export default function PartnerHelpPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Help</h1>
      <div className="mt-6 flex flex-col divide-y divide-brand-100 rounded-2xl border border-brand-100 bg-white">
        {FAQS.map((faq) => (
          <details key={faq.question} className="p-5">
            <summary className="cursor-pointer text-sm font-bold text-ink-900">
              {faq.question}
            </summary>
            <p className="mt-2 text-sm text-ink-700">{faq.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
