import { Container } from "@/components/ui/Container";
import { StarIcon, ShieldIcon, UsersIcon, RouteIcon } from "@/components/icons";

// TODO: replace with real data once Supabase is connected — these numbers
// are clearly-marked placeholders for layout purposes only.
const STATS = [
  { icon: StarIcon, value: "4.7 / 5", label: "average customer rating", todo: true },
  { icon: UsersIcon, value: "1,200+", label: "verified transport partners", todo: true },
  { icon: RouteIcon, value: "38,000+", label: "jobs completed", todo: true },
  { icon: ShieldIcon, value: "100%", label: "of partners licensed & insured", todo: false },
];

export function TrustSignals() {
  return (
    <section className="bg-ink-900 py-16 sm:py-20">
      <Container>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-mint-400">
                <stat.icon className="h-6 w-6" />
              </div>
              <p className="mt-4 font-heading text-2xl font-extrabold text-white sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-brand-100">
                {stat.label}
                {stat.todo && (
                  <span className="mt-1 block text-xs text-coral-300">
                    TODO: replace with real data once Supabase is connected
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-brand-100">
          Every transport partner on Movers Now goes through document checks,
          vehicle inspection and reference review before they can accept a job.
          Your booking is protected by our resolution team from collection to
          delivery.
        </p>
      </Container>
    </section>
  );
}
