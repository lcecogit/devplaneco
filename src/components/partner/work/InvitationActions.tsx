"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type InvitableVehicle = { id: string; label: string };

export function InvitationActions({
  invitationId,
  vehicles,
}: {
  invitationId: string;
  vehicles: InvitableVehicle[];
}) {
  const router = useRouter();
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [submitting, setSubmitting] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<string | null>(null);

  if (resolved) {
    return <p className="text-sm font-medium text-ink-700">{resolved}</p>;
  }

  async function respond(accept: boolean) {
    setError(null);
    if (accept && !vehicleId) {
      setError("Select a vehicle first.");
      return;
    }

    setSubmitting(accept ? "accept" : "decline");
    const supabase = createClient();
    // respond_to_job_invitation() does the whole thing atomically — re-checks
    // expiry itself, creates job_assignments on accept, and falls the job
    // back into click_claim/auction on decline. See migration 0035.
    const { data, error: rpcError } = await supabase.rpc("respond_to_job_invitation", {
      p_invitation_id: invitationId,
      p_accept: accept,
      p_vehicle_id: accept ? vehicleId : undefined,
    });
    setSubmitting(null);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const result = data as { ok: boolean; accepted?: boolean; reason?: string } | null;
    if (!result?.ok) {
      setResolved(result?.reason ?? "This invitation is no longer available.");
      return;
    }

    if (accept) {
      router.push("/partner/work/my-work");
    } else {
      setResolved("Declined — this job has gone back into the general pool.");
      router.refresh();
    }
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-800">
        Vehicle to use
        <select
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          disabled={!vehicles.length}
          className="rounded-lg border border-brand-100 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
        >
          {vehicles.length ? (
            vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.label}
              </option>
            ))
          ) : (
            <option value="">No compatible approved vehicle</option>
          )}
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
          onClick={() => respond(false)}
          disabled={submitting !== null}
          className="rounded-full border border-brand-300 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-white disabled:opacity-60"
        >
          {submitting === "decline" ? "Declining…" : "Decline"}
        </button>
        <button
          type="button"
          onClick={() => respond(true)}
          disabled={submitting !== null || !vehicles.length}
          className="rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting === "accept" ? "Accepting…" : "Accept job"}
        </button>
      </div>
    </div>
  );
}
