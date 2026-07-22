import { Container } from "@/components/ui/Container";
import { ChevronDownIcon } from "@/components/icons";

// Single source of truth for the FAQ copy — the homepage's FAQPage JSON-LD
// is generated from this same array so the structured data always matches
// what's actually visible on the page.
export const FAQ_ITEMS = [
  {
    question: "How does Movers Now work?",
    answer:
      "Tell us what you need moved and your collection and delivery postcodes. We share your job with vetted transport partners in your area, you compare their prices and ratings, then book the one that suits you best.",
  },
  {
    question: "How much does a removal or transport job cost?",
    answer:
      "Cost depends on the size of the job, distance, and how much help you need loading and unloading. You'll see a price estimate as soon as you submit a quote request, with no obligation to book.",
  },
  {
    question: "Are transport partners insured?",
    answer:
      "Yes. Every partner completes document checks, a vehicle inspection and reference review, and must hold valid goods-in-transit insurance before they can accept jobs on the platform.",
  },
  {
    question: "Can I track my delivery?",
    answer:
      "Yes. Once you've booked, you can message your driver directly and follow the status of your job from collection through to delivery from your account.",
  },
  {
    question: "What if I need to change or cancel my booking?",
    answer:
      "You can reschedule for free up to 48 hours before your collection time. Cancellations inside that window may be subject to the partner's cancellation policy, shown to you at booking.",
  },
  {
    question: "How do I become a transport partner?",
    answer:
      "Apply through our Become a Partner page with your business details and vehicle information. Once your documents and vehicle are verified, you can start accepting jobs that match your coverage area.",
  },
] as const;

export function Faq() {
  return (
    <section id="faq" className="bg-white py-20 sm:py-24">
      <Container className="max-w-3xl">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-extrabold text-ink-900 sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-ink-700">
            Can&apos;t find what you&apos;re looking for? Call us on{" "}
            <a href="tel:02038723050" className="font-semibold text-brand-600">
              0203 872 3050
            </a>
            .
          </p>
        </div>

        <div className="mt-10 divide-y divide-brand-100 rounded-2xl border border-brand-100">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="group p-6 open:bg-brand-50/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-base font-bold text-ink-900">
                {item.question}
                <ChevronDownIcon className="h-5 w-5 shrink-0 text-brand-500 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
