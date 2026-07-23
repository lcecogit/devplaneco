import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlusIcon, MapPinIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Routes" };

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function PartnerRoutesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: routes } = await supabase
    .from("routes")
    .select("id, date, start_postcode, end_postcode, direction, team_size")
    .eq("transport_partner_id", partner!.id)
    .order("date", { ascending: true });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink-900">Routes</h1>
          <p className="mt-1 text-sm text-ink-700">
            Tell us the routes you&apos;re already driving so we can match jobs along the way.
          </p>
        </div>
        <Link
          href="/partner/routes/new"
          className="flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral-600"
        >
          <PlusIcon className="h-4 w-4" />
          Add route
        </Link>
      </div>

      {!routes?.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-brand-300 bg-white p-10 text-center">
          <MapPinIcon className="mx-auto h-8 w-8 text-brand-300" />
          <h2 className="mt-3 font-heading text-lg font-bold text-ink-900">No routes saved</h2>
          <p className="mt-1 text-sm text-ink-700">
            Add a route to get matched jobs along journeys you&apos;re already making.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {routes.map((route) => (
            <Link
              key={route.id}
              href={`/partner/routes/${route.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-5 hover:border-brand-300"
            >
              <div>
                <p className="font-heading text-sm font-bold text-ink-900">
                  {route.start_postcode} → {route.end_postcode}
                </p>
                <p className="text-sm text-ink-700">
                  {formatDate(route.date)} · {route.direction}
                  {route.team_size ? ` · Team of ${route.team_size}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
