import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHomePage() {
  const supabase = await createClient();

  const [{ count: partnerCount }, { count: pendingVehicleCount }] = await Promise.all([
    supabase.from("transport_partners").select("*", { count: "exact", head: true }),
    supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true })
      .in("approval_status", ["submitted", "under_review"]),
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Admin overview</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-brand-100 bg-white p-6">
          <p className="text-3xl font-extrabold text-ink-900">{partnerCount ?? 0}</p>
          <p className="mt-1 text-sm text-ink-700">Registered transport partners</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-6">
          <p className="text-3xl font-extrabold text-ink-900">{pendingVehicleCount ?? 0}</p>
          <p className="mt-1 text-sm text-ink-700">Vehicles awaiting review</p>
        </div>
      </div>

      <p className="mt-8 text-sm text-ink-700">
        Vehicle approval, dispute resolution, and partner performance tools are
        planned for a later phase — this dashboard currently covers admin
        account management only.
      </p>
    </div>
  );
}
