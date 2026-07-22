import { Container } from "@/components/ui/Container";
import { QuoteIcon, HandshakeIcon, CalendarIcon, MapPinIcon } from "@/components/icons";

const STEPS = [
  {
    icon: QuoteIcon,
    title: "Get an instant quote",
    body: "Tell us what you're moving, and your collection and delivery postcodes. It takes about two minutes, no account required.",
  },
  {
    icon: HandshakeIcon,
    title: "Choose your provider",
    body: "Compare prices, ratings and availability from vetted transport partners in your area, then pick the one that fits.",
  },
  {
    icon: CalendarIcon,
    title: "Book your date",
    body: "Confirm a collection date and time that works for you. Reschedule free up to 48 hours before, if plans change.",
  },
  {
    icon: MapPinIcon,
    title: "Track your delivery",
    body: "Message your driver directly and follow your job from collection to drop-off, right from your account.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-20 sm:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-extrabold text-ink-900 sm:text-4xl">
            How Movers Now works
          </h2>
          <p className="mt-4 text-lg text-ink-700">
            From quote to delivery in four simple steps, backed by a real person
            you can message the whole way through.
          </p>
        </div>

        <ol className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative rounded-2xl border border-brand-100 bg-brand-50/60 p-6">
              <span className="font-heading text-sm font-bold text-brand-300">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white">
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-heading text-lg font-bold text-ink-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{step.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
