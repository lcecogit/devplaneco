import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/partner/vehicles/StatusBadge";
import { CarIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Vehicle Approvals" };

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
] as const;

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = TABS.find((t) => t.key === searchParams.tab)?.key ?? "pending";
  const supabase = await createClient();

  let query = supabase
    .from("vehicles")
    .select(
      "id, registration_number, make, model, vehicle_type, approval_status, updated_at, admin_reviewed_at, transport_partner_id"
    );

  query =
    tab === "pending"
      ? query
          .in("approval_status", ["submitted", "under_review"])
          .order("updated_at", { ascending: false })
      : query.eq("approval_status", tab).order("admin_reviewed_at", { ascending: false });

  const { data: vehicles } = await query;

  const partnerIds = Array.from(new Set((vehicles ?? []).map((v) => v.transport_partner_id)));
  const { data: partners } = partnerIds.length
    ? await supabase.from("transport_partners").select("id, business_name").in("id", partnerIds)
    : { data: [] };
  const partnerNameById = new Map((partners ?? []).map((p) => [p.id, p.business_name]));

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Vehicle Approvals</h1>

      <div className="mt-6 flex gap-2 border-b border-brand-100">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/vehicles?tab=${t.key}`}
            className={`border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-ink-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {!vehicles?.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-brand-300 bg-white p-10 text-center">
          <CarIcon className="mx-auto h-8 w-8 text-brand-300" />
          <h2 className="mt-3 font-heading text-lg font-bold text-ink-900">
            No {tab} vehicles
          </h2>
          <p className="mt-1 text-sm text-ink-700">
            {tab === "pending"
              ? "Vehicles submitted for review by partners will show up here."
              : `Vehicles you've ${tab} will show up here.`}
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {vehicles.map((vehicle) => (
            <Link
              key={vehicle.id}
              href={`/admin/vehicles/${vehicle.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-5 hover:border-brand-300"
            >
              <div>
                <p className="font-heading text-sm font-bold text-ink-900">
                  {vehicle.registration_number}
                </p>
                <p className="text-sm text-ink-700">
                  {partnerNameById.get(vehicle.transport_partner_id) ?? "Unknown partner"} ·{" "}
                  {[vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
                    vehicle.vehicle_type ||
                    "No details"}
                </p>
                <p className="mt-1 text-xs text-ink-700">
                  {tab === "pending"
                    ? `Submitted ${formatDate(vehicle.updated_at)}`
                    : vehicle.admin_reviewed_at
                      ? `Reviewed ${formatDate(vehicle.admin_reviewed_at)}`
                      : ""}
                </p>
              </div>
              <StatusBadge status={vehicle.approval_status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
