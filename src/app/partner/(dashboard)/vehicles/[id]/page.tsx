import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VehicleForm } from "@/components/partner/vehicles/VehicleForm";
import { VehiclePhotoUpload } from "@/components/partner/vehicles/VehiclePhotoUpload";
import { VehicleDocumentsSection, type ExistingDoc } from "@/components/partner/vehicles/VehicleDocumentsSection";
import { SubmitForReviewButton } from "@/components/partner/vehicles/SubmitForReviewButton";
import { StatusBadge } from "@/components/partner/vehicles/StatusBadge";

export const metadata: Metadata = { title: "Edit Vehicle" };

export default async function EditVehiclePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select(
      "id, registration_number, vehicle_type, vehicle_category, make, model, crew_capacity, base_postcode, payload_kg, cargo_volume_m3, max_load_length_m, has_tail_lift, can_transport_motorbikes, uses_trailer, fuel_type, approval_status, photo_url"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!vehicle) notFound();

  const { data: documents } = await supabase
    .from("vehicle_documents")
    .select("doc_type, file_url")
    .eq("vehicle_id", vehicle.id);

  const existingDocs: ExistingDoc[] = await Promise.all(
    (documents ?? []).map(async (doc) => {
      const { data } = await supabase.storage
        .from("vehicle-documents")
        .createSignedUrl(doc.file_url, 60);
      return { docType: doc.doc_type, signedUrl: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">
          {vehicle.registration_number}
        </h1>
        <StatusBadge status={vehicle.approval_status} />
      </div>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">Photo</h2>
        <div className="mt-3">
          <VehiclePhotoUpload
            transportPartnerId={partner!.id}
            vehicleId={vehicle.id}
            currentUrl={vehicle.photo_url}
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">Details</h2>
        <div className="mt-4">
          <VehicleForm
            transportPartnerId={partner!.id}
            initialValues={{
              id: vehicle.id,
              registration_number: vehicle.registration_number,
              vehicle_type: vehicle.vehicle_type ?? "",
              vehicle_category: vehicle.vehicle_category ?? "",
              make: vehicle.make ?? "",
              model: vehicle.model ?? "",
              crew_capacity: vehicle.crew_capacity?.toString() ?? "",
              base_postcode: vehicle.base_postcode ?? "",
              payload_kg: vehicle.payload_kg?.toString() ?? "",
              cargo_volume_m3: vehicle.cargo_volume_m3?.toString() ?? "",
              max_load_length_m: vehicle.max_load_length_m?.toString() ?? "",
              has_tail_lift: vehicle.has_tail_lift,
              can_transport_motorbikes: vehicle.can_transport_motorbikes,
              uses_trailer: vehicle.uses_trailer,
              fuel_type: vehicle.fuel_type ?? "",
            }}
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">Documents</h2>
        <div className="mt-4">
          <VehicleDocumentsSection
            transportPartnerId={partner!.id}
            vehicleId={vehicle.id}
            existingDocs={existingDocs}
          />
        </div>
      </div>

      {vehicle.approval_status === "draft" && (
        <div className="mt-6">
          <SubmitForReviewButton vehicleId={vehicle.id} />
        </div>
      )}
    </div>
  );
}
