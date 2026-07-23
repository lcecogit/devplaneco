import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/partner/vehicles/StatusBadge";
import { VehicleReviewActions } from "@/components/admin/vehicles/VehicleReviewActions";

export const metadata: Metadata = { title: "Review Vehicle" };

const DOC_TYPES = [
  { value: "log_book", label: "Log book (V5C)" },
  { value: "mot", label: "MOT certificate" },
  { value: "v5", label: "V5 registration document" },
] as const;

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminVehicleDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select(
      "id, registration_number, vehicle_type, vehicle_category, make, model, crew_capacity, base_postcode, payload_kg, cargo_volume_m3, max_load_length_m, has_tail_lift, can_transport_motorbikes, uses_trailer, fuel_type, approval_status, photo_url, transport_partner_id, rejection_reason, admin_note, admin_reviewed_by, admin_reviewed_at"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!vehicle) notFound();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("business_name, company_type, profile_photo_url")
    .eq("id", vehicle.transport_partner_id)
    .maybeSingle();

  const { data: documents } = await supabase
    .from("vehicle_documents")
    .select("doc_type, file_url")
    .eq("vehicle_id", vehicle.id);

  const signedDocs = await Promise.all(
    (documents ?? []).map(async (doc) => {
      const { data } = await supabase.storage
        .from("vehicle-documents")
        .createSignedUrl(doc.file_url, 60);
      return { docType: doc.doc_type, signedUrl: data?.signedUrl ?? null };
    })
  );

  const reviewer = vehicle.admin_reviewed_by
    ? (
        await supabase
          .from("profiles")
          .select("email")
          .eq("id", vehicle.admin_reviewed_by)
          .maybeSingle()
      ).data
    : null;

  const isPending = vehicle.approval_status === "submitted" || vehicle.approval_status === "under_review";

  const details: [string, string][] = [
    ["Make / model", [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"],
    ["Vehicle type", vehicle.vehicle_type ?? "—"],
    ["Vehicle category", vehicle.vehicle_category ?? "—"],
    ["Fuel type", vehicle.fuel_type ?? "—"],
    ["Crew capacity", vehicle.crew_capacity?.toString() ?? "—"],
    ["Base postcode", vehicle.base_postcode ?? "—"],
    ["Payload (kg)", vehicle.payload_kg?.toString() ?? "—"],
    ["Cargo volume (m³)", vehicle.cargo_volume_m3?.toString() ?? "—"],
    ["Max load length (m)", vehicle.max_load_length_m?.toString() ?? "—"],
    ["Tail lift", vehicle.has_tail_lift ? "Yes" : "No"],
    ["Transports motorbikes", vehicle.can_transport_motorbikes ? "Yes" : "No"],
    ["Uses trailer", vehicle.uses_trailer ? "Yes" : "No"],
  ];

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink-900">
            {vehicle.registration_number}
          </h1>
          <p className="mt-1 text-sm text-ink-700">
            {partner?.business_name ?? "Unknown partner"}
            {partner?.company_type ? ` · ${partner.company_type}` : ""}
          </p>
        </div>
        <StatusBadge status={vehicle.approval_status} />
      </div>

      <div className="mt-6 flex gap-4">
        <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-lg bg-brand-50">
          {vehicle.photo_url ? (
            <Image
              src={vehicle.photo_url}
              alt="Vehicle photo"
              width={112}
              height={80}
              className="h-20 w-28 object-cover"
            />
          ) : (
            <p className="text-xs text-ink-700">No photo</p>
          )}
        </div>
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-brand-50">
          {partner?.profile_photo_url ? (
            <Image
              src={partner.profile_photo_url}
              alt="Partner profile photo"
              width={80}
              height={80}
              className="h-20 w-20 object-cover"
            />
          ) : (
            <p className="px-2 text-center text-xs text-ink-700">No profile photo</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">Vehicle details</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-700">{label}</dt>
              <dd className="text-sm text-ink-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">Documents</h2>
        <div className="mt-4 flex flex-col gap-3">
          {DOC_TYPES.map((docType) => {
            const doc = signedDocs.find((d) => d.docType === docType.value);
            return (
              <div
                key={docType.value}
                className="flex items-center justify-between gap-3 rounded-lg border border-brand-100 px-4 py-3"
              >
                <p className="text-sm font-medium text-ink-800">{docType.label}</p>
                {doc?.signedUrl ? (
                  <a
                    href={doc.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    View file
                  </a>
                ) : (
                  <span className="text-xs text-ink-700">Not uploaded</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {(vehicle.rejection_reason || vehicle.admin_note) && (
        <div className="mt-6 flex flex-col gap-3">
          {vehicle.rejection_reason && (
            <div className="rounded-xl border border-coral-200 bg-coral-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-coral-600">
                Rejection reason
              </p>
              <p className="mt-1 text-sm text-ink-900">{vehicle.rejection_reason}</p>
            </div>
          )}
          {vehicle.admin_note && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Needs more info
              </p>
              <p className="mt-1 text-sm text-ink-900">{vehicle.admin_note}</p>
            </div>
          )}
        </div>
      )}

      {vehicle.admin_reviewed_at && (
        <p className="mt-4 text-xs text-ink-700">
          Last reviewed by {reviewer?.email ?? "an admin"} on {formatDateTime(vehicle.admin_reviewed_at)}
        </p>
      )}

      {isPending && (
        <div className="mt-6">
          <VehicleReviewActions vehicleId={vehicle.id} />
        </div>
      )}
    </div>
  );
}
