import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { VehicleForm } from "@/components/partner/vehicles/VehicleForm";

export const metadata: Metadata = { title: "Add a Vehicle" };

export default async function NewVehiclePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Add a vehicle</h1>
      <p className="mt-1 text-sm text-ink-700">
        Photos and documents can be added once the vehicle is saved.
      </p>
      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <VehicleForm transportPartnerId={partner!.id} />
      </div>
    </div>
  );
}
