import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RouteForm } from "@/components/partner/routes/RouteForm";

export const metadata: Metadata = { title: "Add a Route" };

export default async function NewRoutePage() {
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
    .select("id, registration_number")
    .eq("transport_partner_id", partner!.id);

  return (
    <div className="max-w-xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Add a route</h1>
      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <RouteForm transportPartnerId={partner!.id} vehicles={vehicles ?? []} />
      </div>
    </div>
  );
}
