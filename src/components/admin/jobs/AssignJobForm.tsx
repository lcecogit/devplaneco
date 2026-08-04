"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type EligiblePartner = {
  id: string;
  businessName: string;
  vehicles: { id: string; label: string }[];
};

export function AssignJobForm({
  jobId,
  partners,
  currentPartnerId,
}: {
  jobId: string;
  partners: EligiblePartner[];
  currentPartnerId: string | null;
}) {
  const router = useRouter();
  const [partnerId, setPartnerId] = useState(currentPartnerId ?? partners[0]?.id ?? "");
  const [vehicleId, setVehicleId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedPartner = useMemo(
    () => partners.find((p) => p.id === partnerId) ?? null,
    [partners, partnerId]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosenVehicleId = vehicleId || selectedPartner?.vehicles[0]?.id;
    if (!partnerId || !chosenVehicleId) return;

    setError(null);
    setSuccess(null);
    setSaving(true);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("admin_assign_job", {
      p_job_id: jobId,
      p_transport_partner_id: partnerId,
      p_vehicle_id: chosenVehicleId,
    });

    setSaving(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const reassigned = (data as { reassigned?: boolean } | null)?.reassigned;
    setSuccess(reassigned ? "Reassigned — the previous partner has been notified." : "Assigned.");
    router.refresh();
  }

  if (!partners.length) {
    return (
      <p className="text-sm text-ink-700">
        No partner has an approved, compatible vehicle for this job&apos;s category yet.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="partner" className="text-sm font-medium text-ink-800">
          Partner
        </label>
        <select
          id="partner"
          value={partnerId}
          onChange={(e) => {
            setPartnerId(e.target.value);
            setVehicleId("");
          }}
          className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
        >
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.businessName}
              {p.id === currentPartnerId ? " (currently assigned)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="vehicle" className="text-sm font-medium text-ink-800">
          Vehicle
        </label>
        <select
          id="vehicle"
          value={vehicleId || selectedPartner?.vehicles[0]?.id || ""}
          onChange={(e) => setVehicleId(e.target.value)}
          className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
        >
          {selectedPartner?.vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-coral-600">
          {error}
        </p>
      )}
      {success && !error && (
        <p role="status" className="text-sm font-medium text-mint-600">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || !selectedPartner?.vehicles.length}
        className="self-start rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving…" : currentPartnerId ? "Reassign" : "Assign"}
      </button>
    </form>
  );
}
