import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ReservationForm } from "@/components/partner/reservations/ReservationForm";

export const metadata: Metadata = { title: "New Reservation" };

export default async function NewReservationPage() {
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
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">New reservation</h1>
      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <ReservationForm transportPartnerId={partner!.id} vehicles={vehicles ?? []} />
      </div>
    </div>
  );
}
