import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/partner/vehicles/StatusBadge";
import { PlusIcon, CarIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Vehicles" };

export default async function PartnerVehiclesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, registration_number, make, model, vehicle_type, approval_status, photo_url")
    .eq("transport_partner_id", partner!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Vehicles</h1>
        <Link
          href="/partner/vehicles/new"
          className="flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral-600"
        >
          <PlusIcon className="h-4 w-4" />
          Add vehicle
        </Link>
      </div>

      {!vehicles?.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-brand-300 bg-white p-10 text-center">
          <CarIcon className="mx-auto h-8 w-8 text-brand-300" />
          <h2 className="mt-3 font-heading text-lg font-bold text-ink-900">No vehicles yet</h2>
          <p className="mt-1 text-sm text-ink-700">
            Add your first vehicle to start getting jobs.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <Link
              key={vehicle.id}
              href={`/partner/vehicles/${vehicle.id}`}
              className="rounded-2xl border border-brand-100 bg-white p-5 hover:border-brand-300"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-heading text-base font-bold text-ink-900">
                    {vehicle.registration_number}
                  </p>
                  <p className="text-sm text-ink-700">
                    {[vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
                      vehicle.vehicle_type ||
                      "No details yet"}
                  </p>
                </div>
                <StatusBadge status={vehicle.approval_status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
