import Link from "next/link";
import { Container } from "@/components/ui/Container";
import {
  HouseIcon,
  SofaIcon,
  BriefcaseIcon,
  CarIcon,
  MotorbikeIcon,
  PianoIcon,
  GlobeIcon,
} from "@/components/icons";

export const SERVICE_CATEGORIES = [
  {
    slug: "home-removals",
    title: "Home Removals",
    description: "Full house and flat moves, with a team sized to your job.",
    ctaLabel: "Get a home removals quote",
    icon: HouseIcon,
  },
  {
    slug: "single-item-transport",
    title: "Single Item Transport",
    description: "One sofa, one wardrobe, one eBay find — moved on its own.",
    ctaLabel: "Get a single item quote",
    icon: SofaIcon,
  },
  {
    slug: "office-relocation",
    title: "Office Relocation",
    description: "Desks, IT equipment and archives moved out of hours.",
    ctaLabel: "Get an office relocation quote",
    icon: BriefcaseIcon,
  },
  {
    slug: "car-transport",
    title: "Car Transport",
    description: "Enclosed or open transport for cars, bought or sold.",
    ctaLabel: "Get a car transport quote",
    icon: CarIcon,
  },
  {
    slug: "motorbike-transport",
    title: "Motorbike Transport",
    description: "Specialist handling and secure tie-down for bikes.",
    ctaLabel: "Get a motorbike transport quote",
    icon: MotorbikeIcon,
  },
  {
    slug: "piano-moving",
    title: "Piano Moving",
    description: "Upright and grand pianos, moved by specialist crews.",
    ctaLabel: "Get a piano moving quote",
    icon: PianoIcon,
  },
  {
    slug: "international-moves",
    title: "International Moves",
    description: "Cross-border removals with customs paperwork handled.",
    ctaLabel: "Get an international move quote",
    icon: GlobeIcon,
  },
] as const;

export function ServicesGrid() {
  return (
    <section id="services" className="bg-brand-50/40 py-20 sm:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-extrabold text-ink-900 sm:text-4xl">
            Whatever you&apos;re moving, there&apos;s a partner for it
          </h2>
          <p className="mt-4 text-lg text-ink-700">
            Browse by category to see typical pricing and the partners who
            specialise in each type of job.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_CATEGORIES.map((service) => (
            <Link
              key={service.slug}
              href={`/services/${service.slug}`}
              className="group flex items-start gap-4 rounded-2xl border border-brand-100 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mint-50 text-mint-600 group-hover:bg-mint-100">
                <service.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-ink-900">
                  {service.title}
                </h3>
                <p className="mt-1 text-sm text-ink-700">{service.description}</p>
                <span className="mt-3 inline-block text-sm font-semibold text-brand-600 group-hover:text-brand-700">
                  {service.ctaLabel} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
