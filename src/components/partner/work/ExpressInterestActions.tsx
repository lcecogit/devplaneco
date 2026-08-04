"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type InterestableVehicle = { id: string; label: string };

export function ExpressInterestActions({
  jobId,
  vehicles,
  initialStatus,
}: {
  jobId: string;
  vehicles: InterestableVehicle[];
  initialStatus: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);

  async function submit() {
    if (!vehicleId) {
      setError("Select a vehicle first.");
      return;
    }

    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    // express_interest() upserts on (job_id, transport_partner_id) — see
    // migration 0043 — so re-submitting just updates the vehicle/note.
    const { error: rpcError } = await supabase.rpc("express_interest", {
      p_job_id: jobId,
      p_vehicle_id: vehicleId,
      p_note: note.trim() || undefined,
    });
    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setStatus("pending");
    setOpen(false);
    router.refresh();
  }

  if (status === "selected") {
    return (
      <p className="rounded-xl border border-mint-200 bg-mint-50 p-3 text-sm font-medium text-mint-700">
        The customer picked you for this job — check My Work.
      </p>
    );
  }

  if (status === "not_selected") {
    return <p className="text-sm text-ink-700">The customer picked another partner for this job.</p>;
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        {status === "pending" && (
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            Interest sent
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!vehicles.length}
          className="rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "pending" ? "Update interest" : "Express interest"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-800">
        Vehicle to use
        <select
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          className="rounded-lg border border-brand-100 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
        >
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium text-ink-800">
        Note to the customer (optional)
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why you'd be a good fit for this job…"
          className="rounded-lg border border-brand-100 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
        />
      </label>

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-coral-600">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={submitting}
          className="rounded-full border border-brand-300 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-white disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send interest"}
        </button>
      </div>
    </div>
  );
}
