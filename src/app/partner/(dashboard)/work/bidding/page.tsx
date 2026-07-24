import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { HandshakeIcon, CarIcon } from "@/components/icons";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";
import { BidForm, type BiddableVehicle } from "@/components/partner/work/BidForm";

export const metadata: Metadata = { title: "Bidding" };

const BID_STATUS_STYLES: Record<string, string> = {
  pending: "bg-brand-50 text-brand-700",
  won: "bg-mint-50 text-mint-700",
  lost: "bg-coral-50 text-coral-700",
  expired: "bg-ink-50 text-ink-700",
};

function formatWindow(start: string | null, end: string | null) {
  if (!start) return "Date TBC";
  const startDate = new Date(start);
  const datePart = startDate.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  if (!end) return datePart;
  const timePart = `${startDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}–${new Date(
    end
  ).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  return `${datePart}, ${timePart}`;
}

function formatTimeRemaining(closesAt: string) {
  const msRemaining = new Date(closesAt).getTime() - Date.now();
  if (msRemaining <= 0) return "Closing soon";
  const hours = Math.floor(msRemaining / (1000 * 60 * 60));
  if (hours >= 1) {
    const days = Math.floor(hours / 24);
    if (days >= 1) return `${days}d ${hours % 24}h left`;
    return `${hours}h left`;
  }
  const minutes = Math.max(1, Math.floor(msRemaining / (1000 * 60)));
  return `${minutes}m left`;
}

export default async function BiddingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { count: approvedVehicleCount } = await supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true })
    .eq("transport_partner_id", partner!.id)
    .eq("approval_status", "approved");

  if (!approvedVehicleCount) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Bidding</h1>
        <p className="mt-1 text-sm text-ink-700">
          Bid on larger, higher-value jobs — the lowest bid wins when the window closes.
        </p>
        <EmptyState
          icon={CarIcon}
          title="Add an approved vehicle to start bidding"
          description="Jobs are matched against your approved vehicles, so you'll need at least one before anything shows up here."
        />
        <Link
          href="/partner/vehicles/new"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral-600"
        >
          Add a vehicle
        </Link>
      </div>
    );
  }

  // find_auction_jobs()/my_bids() are SECURITY DEFINER RPCs, the same
  // pattern as find_work_jobs (migration 0020) — partners can't browse the
  // jobs table for auction listings directly, only through here. See
  // migration 0024.
  const [{ data: openAuctions, error: auctionsError }, { data: vehicles }, { data: bidHistory }] =
    await Promise.all([
      supabase.rpc("find_auction_jobs"),
      supabase
        .from("vehicles")
        .select("id, registration_number, vehicle_type, make, model, can_transport_motorbikes")
        .eq("transport_partner_id", partner!.id)
        .eq("approval_status", "approved"),
      supabase.rpc("my_bids"),
    ]);

  if (auctionsError) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Bidding</h1>
        <p className="mt-4 text-sm font-medium text-coral-600">
          Couldn&apos;t load auctions right now: {auctionsError.message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Bidding</h1>
      <p className="mt-1 text-sm text-ink-700">
        Bid on larger, higher-value jobs — the lowest bid wins when the window closes.
      </p>

      <h2 className="mt-8 font-heading text-lg font-bold text-ink-900">Open for bidding</h2>
      {!openAuctions?.length ? (
        <EmptyState
          icon={HandshakeIcon}
          title="No auctions open right now"
          description="Jobs sent to auction that match your approved fleet will appear here."
        />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {openAuctions.map((job) => {
            const category = SERVICE_CATEGORIES.find((s) => s.slug === job.category);
            const compatibleVehicles: BiddableVehicle[] = (vehicles ?? [])
              .filter((v) => job.category !== "motorbike-transport" || v.can_transport_motorbikes)
              .map((v) => ({
                id: v.id,
                label: [v.registration_number, [v.make, v.model].filter(Boolean).join(" ") || v.vehicle_type]
                  .filter(Boolean)
                  .join(" — "),
              }));

            return (
              <div key={job.id} className="rounded-2xl border border-brand-100 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    {category && (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint-50 text-mint-600">
                        <category.icon className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <p className="font-heading text-sm font-bold text-ink-900">
                        {category?.title ?? job.category ?? "Move"}
                      </p>
                      <p className="text-sm text-ink-700">
                        {job.collection_area || "?"} → {job.delivery_area || "?"}
                      </p>
                      <p className="text-xs text-ink-700">
                        {formatWindow(job.collection_window_start, job.collection_window_end)}
                      </p>
                      {job.customer_price != null && (
                        <p className="mt-1 text-xs text-ink-700">
                          Customer was quoted £{Number(job.customer_price).toFixed(2)} — not your payout.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-ink-900">
                      {formatTimeRemaining(job.bidding_closes_at)}
                    </p>
                    <p className="text-xs text-ink-700">
                      {job.bid_count} bid{job.bid_count === 1 ? "" : "s"} so far
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  {compatibleVehicles.length ? (
                    <BidForm
                      jobId={job.id}
                      vehicles={compatibleVehicles}
                      biddingClosesAt={job.bidding_closes_at}
                      initialBid={
                        job.my_bid_amount != null
                          ? { amount: Number(job.my_bid_amount), vehicleId: job.my_bid_vehicle_id }
                          : null
                      }
                    />
                  ) : (
                    <p className="text-sm text-ink-700">
                      None of your approved vehicles are compatible with this job.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mt-10 font-heading text-lg font-bold text-ink-900">Your bid history</h2>
      {!bidHistory?.length ? (
        <p className="mt-2 text-sm text-ink-700">You haven&apos;t placed any bids yet.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {bidHistory.map((bid) => {
            const category = SERVICE_CATEGORIES.find((s) => s.slug === bid.category);
            return (
              <div
                key={bid.bid_id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-brand-100 bg-white p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {category?.title ?? bid.category ?? "Move"} — {bid.collection_area || "?"} →{" "}
                    {bid.delivery_area || "?"}
                  </p>
                  <p className="text-xs text-ink-700">
                    £{Number(bid.amount).toFixed(2)} · submitted{" "}
                    {new Date(bid.submitted_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    BID_STATUS_STYLES[bid.status] ?? "bg-ink-50 text-ink-700"
                  }`}
                >
                  {bid.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
