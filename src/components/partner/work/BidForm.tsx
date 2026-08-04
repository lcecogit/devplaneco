"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type BiddableVehicle = { id: string; label: string };

export function BidForm({
  jobId,
  vehicles,
  biddingClosesAt,
  lowestBidAmount,
  initialBid,
}: {
  jobId: string;
  vehicles: BiddableVehicle[];
  biddingClosesAt: string;
  /** Current market-wide lowest pending bid (may be this partner's own),
   * shown while bidding so they can see what they're up against — matches
   * AnyVan's transparency model rather than hiding amounts entirely. */
  lowestBidAmount: number | null;
  initialBid: { amount: number; vehicleId: string | null } | null;
}) {
  const router = useRouter();
  const closed = new Date(biddingClosesAt).getTime() <= Date.now();

  const [open, setOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState(initialBid?.vehicleId ?? vehicles[0]?.id ?? "");
  const [amount, setAmount] = useState(initialBid ? String(initialBid.amount) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownBid, setOwnBid] = useState(initialBid);

  if (closed) {
    return (
      <p className="text-sm font-medium text-ink-700">
        Bidding has closed — results are worked out automatically, check back soon.
      </p>
    );
  }

  async function submit() {
    setError(null);
    const parsedAmount = Number(amount);
    if (!vehicleId || !amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid vehicle and bid amount.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    // submit_bid() upserts on (job_id, transport_partner_id) and re-checks
    // the deadline server-side — see migration 0024's comment for why that
    // matters more than the client-side `closed` check above.
    const { error: rpcError } = await supabase.rpc("submit_bid", {
      p_job_id: jobId,
      p_vehicle_id: vehicleId,
      p_amount: parsedAmount,
    });

    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setOwnBid({ amount: parsedAmount, vehicleId });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        {ownBid && (
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            Your bid: £{ownBid.amount.toFixed(2)} · pending
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!vehicles.length}
          className="rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {ownBid ? "Update bid" : "Place a bid"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-ink-800">
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
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-800">
          Your bid (£)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="rounded-lg border border-brand-100 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500 sm:w-32"
          />
        </label>
      </div>

      <p className="mt-2 text-xs text-ink-700">
        {lowestBidAmount != null
          ? `Current lowest bid: £${lowestBidAmount.toFixed(2)} — you'll need to go lower to win.`
          : "No bids yet — you'd be the first."}
      </p>

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
          {submitting ? "Submitting…" : ownBid ? "Update bid" : "Submit bid"}
        </button>
      </div>
    </div>
  );
}
