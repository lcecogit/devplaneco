import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ShieldIcon, StarIcon } from "@/components/icons";
import heroIllustration from "../../../public/images/hero-illustration.svg";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-900">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(128,105,238,0.35),transparent_45%)]"
        aria-hidden="true"
      />
      <Container className="relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-100">
            Removals, single items &amp; vehicle transport
          </span>

          <h1 className="mt-6 font-heading text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-[3.25rem]">
            Get an instant quote to move anything, anywhere
          </h1>

          <p className="mt-5 max-w-xl text-lg text-brand-100">
            Tell us what needs moving and where. We&apos;ll match you with vetted,
            insured transport partners who compete for your job, so you get a fair
            price without the endless phone calls.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/quote"
              className="inline-flex items-center justify-center rounded-full bg-coral-500 px-7 py-4 text-base font-semibold text-white shadow-lg shadow-coral-700/30 transition-colors hover:bg-coral-600"
            >
              Get a free quote
            </Link>
            <Link
              href="/partners/join"
              className="inline-flex items-center justify-center rounded-full border border-white/25 px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Become a Transport Partner
            </Link>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-brand-100">
            <div className="flex items-center gap-2">
              <StarIcon className="h-5 w-5 text-mint-400" />
              <dt className="sr-only">Customer rating</dt>
              <dd className="text-sm">
                <span className="font-semibold text-white">4.7/5</span> average
                customer rating{" "}
                <span className="text-brand-300">(TODO: replace with live Trustpilot data)</span>
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <ShieldIcon className="h-5 w-5 text-mint-400" />
              <dt className="sr-only">Partner vetting</dt>
              <dd className="text-sm">Every partner is vetted, licensed &amp; insured</dd>
            </div>
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <Image
            src={heroIllustration}
            alt="A delivery van driving past a stack of moving boxes toward a location pin, with a confirmation checkmark badge"
            priority
            unoptimized
            className="h-auto w-full rounded-3xl"
          />
        </div>
      </Container>
    </section>
  );
}
