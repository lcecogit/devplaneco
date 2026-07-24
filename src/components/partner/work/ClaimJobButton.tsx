"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type ClaimableVehicle = { id: string; label: string };

export function ClaimJobButton({
  jobId,
  vehicles,
}: {
  jobId: string;
  vehicles: ClaimableVehicle[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimedByOther, setClaimedByOther] = useState(false);

  if (claimedByOther) {
    return (
      <p role="alert" className="rounded-xl border border-coral-200 bg-coral-50 p-4 text-sm font-medium text-coral-700">
        This job was just claimed by another partner. It&apos;s no longer available.
      </p>
    );
  }

  async function confirm() {
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    // claim_job() does the check-and-update atomically in one statement on
    // the server — see migration 0020's comment for why that's what
    // actually prevents two partners both winning the same job.
    const { data, error: rpcError } = await supabase.rpc("claim_job", {
      p_job_id: jobId,
      p_vehicle_id: vehicleId,
    });

    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    if (!(data as { claimed: boolean } | null)?.claimed) {
      setClaimedByOther(true);
      return;
    }

    router.push("/partner/work/my-work");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!vehicles.length}
        className="rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Claim this job
      </button>
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
          onClick={confirm}
          disabled={submitting || !vehicleId}
          className="rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-60"
        >
          {submitting ? "Claiming…" : "Confirm claim"}
        </button>
      </div>
    </div>
  );
}
