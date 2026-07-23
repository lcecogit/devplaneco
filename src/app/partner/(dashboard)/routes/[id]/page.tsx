import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RouteForm } from "@/components/partner/routes/RouteForm";

export const metadata: Metadata = { title: "Edit Route" };

export default async function EditRoutePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: route } = await supabase
    .from("routes")
    .select("id, vehicle_id, date, start_postcode, end_postcode, direction, team_size")
    .eq("id", params.id)
    .maybeSingle();

  if (!route) notFound();

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, registration_number")
    .eq("transport_partner_id", partner!.id);

  return (
    <div className="max-w-xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Edit route</h1>
      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <RouteForm
          transportPartnerId={partner!.id}
          vehicles={vehicles ?? []}
          initialValues={{
            id: route.id,
            vehicle_id: route.vehicle_id,
            date: route.date,
            start_postcode: route.start_postcode,
            end_postcode: route.end_postcode,
            direction: route.direction,
            team_size: route.team_size?.toString() ?? "",
          }}
        />
      </div>
    </div>
  );
}
