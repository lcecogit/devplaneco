import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { RouteIcon, BanknoteIcon, CalendarIcon } from "@/components/icons";
import partnerIllustration from "../../../public/images/partner-illustration.svg";

const REASONS = [
  {
    icon: RouteIcon,
    title: "More jobs, less driving around empty",
    body: "Fill gaps in your schedule with jobs that match your route, van size and availability.",
  },
  {
    icon: BanknoteIcon,
    title: "Transparent payments",
    body: "See your payout before you accept a job. Get paid on a fixed weekly schedule, no chasing invoices.",
  },
  {
    icon: CalendarIcon,
    title: "You choose your hours",
    body: "Set your own availability and coverage area. Accept only the jobs that work for your business.",
  },
];

export function BecomePartner() {
  return (
    <section className="bg-brand-900 py-20 sm:py-24">
      <Container className="grid items-center gap-12 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-100">
            For drivers &amp; transport businesses
          </span>
          <h2 className="mt-6 font-heading text-3xl font-extrabold text-white sm:text-4xl">
            Grow your transport business with Movers Now
          </h2>
          <p className="mt-4 text-lg text-brand-100">
            Whether you&apos;re a sole driver with a van or you run a fleet, Movers
            Now brings you a steady stream of removals and transport jobs
            without the cost of running your own marketing.
          </p>

          <ul className="mt-8 space-y-6">
            {REASONS.map((reason) => (
              <li key={reason.title} className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-mint-400">
                  <reason.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-white">
                    {reason.title}
                  </h3>
                  <p className="mt-1 text-sm text-brand-100">{reason.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-9">
            <Link
              href="/partners/join"
              className="inline-flex items-center justify-center rounded-full bg-coral-500 px-7 py-4 text-base font-semibold text-white shadow-lg shadow-coral-700/30 transition-colors hover:bg-coral-600"
            >
              Apply to become a partner
            </Link>
          </div>
        </div>

        <div className="order-1 mx-auto w-full max-w-md lg:order-2 lg:max-w-none">
          <Image
            src={partnerIllustration}
            alt="A driver loading a box beside their van, next to a phone showing a list of accepted delivery jobs"
            unoptimized
            className="h-auto w-full rounded-3xl"
          />
        </div>
      </Container>
    </section>
  );
}
