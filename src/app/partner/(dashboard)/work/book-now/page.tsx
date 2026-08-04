import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { SofaIcon, CarIcon } from "@/components/icons";
import { ClaimJobButton, type ClaimableVehicle } from "@/components/partner/work/ClaimJobButton";

export const metadata: Metadata = { title: "Book Now" };

function formatWindow(start: string | null, end: string | null) {
  if (!start) return "Flexible";
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

export default async function BookNowPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id, guidelines_accepted_at")
    .eq("profile_id", user!.id)
    .single();

  // Same one-time gate as Find Work (migration 0041) — Book Now is also a
  // click_claim surface.
  if (!partner?.guidelines_accepted_at) {
    redirect("/partner/guidelines");
  }

  const { count: approvedVehicleCount } = await supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true })
    .eq("transport_partner_id", partner!.id)
    .eq("approval_status", "approved");

  if (!approvedVehicleCount) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Book Now</h1>
        <p className="mt-1 text-sm text-ink-700">
          Quick, single-item jobs you can book on the spot — no bidding, no waiting.
        </p>
        <EmptyState
          icon={CarIcon}
          title="Add an approved vehicle to start booking"
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

  // Book Now is deliberately not a separate allocation path — it's a
  // narrower, faster-to-act-on view of the same click_claim pool Find Work
  // already browses (find_work_jobs(), migration 0020), filtered down to
  // single-item-transport: the one category assign-method.ts always routes
  // to click_claim regardless of price, since these are small enough jobs
  // that a partner shouldn't have to wade through bigger removals to spot
  // one. Claiming happens right here in the list (ClaimJobButton, same RPC
  // Find Work's detail page uses) instead of a click-through detail page,
  // since the whole point is "book it now" — one screen, no extra hop.
  const [{ data: jobs, error }, { data: vehicles }] = await Promise.all([
    supabase.rpc("find_work_jobs"),
    supabase
      .from("vehicles")
      .select("id, registration_number, vehicle_type, make, model")
      .eq("transport_partner_id", partner!.id)
      .eq("approval_status", "approved"),
  ]);

  if (error) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Book Now</h1>
        <p className="mt-4 text-sm font-medium text-coral-600">
          Couldn&apos;t load jobs right now: {error.message}
        </p>
      </div>
    );
  }

  const quickJobs = (jobs ?? []).filter((job) => job.category === "single-item-transport");
  const compatibleVehicles: ClaimableVehicle[] = (vehicles ?? []).map((v) => ({
    id: v.id,
    label: [v.registration_number, [v.make, v.model].filter(Boolean).join(" ") || v.vehicle_type]
      .filter(Boolean)
      .join(" — "),
  }));

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Book Now</h1>
      <p className="mt-1 text-sm text-ink-700">
        Quick, single-item jobs you can book on the spot — no bidding, no waiting.
      </p>

      {!quickJobs.length ? (
        <EmptyState
          icon={SofaIcon}
          title="No quick jobs right now"
          description="Single-item jobs that match your approved fleet will appear here — check back soon."
        />
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {quickJobs.map((job) => {
            const payout = job.payout_amount ?? job.customer_price;
            return (
              <div
                key={job.id}
                className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint-50 text-mint-600">
                    <SofaIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-heading text-sm font-bold text-ink-900">Single Item Transport</p>
                    <p className="text-sm text-ink-700">
                      {job.collection_area || "?"} → {job.delivery_area || "?"}
                    </p>
                    <p className="text-xs text-ink-700">
                      {formatWindow(job.collection_window_start, job.collection_window_end)}
                      {job.distance_miles != null && ` · ${Number(job.distance_miles).toFixed(1)} mi`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <p className="font-heading text-lg font-extrabold text-ink-900">
                    {payout != null ? `£${Number(payout).toFixed(2)}` : "TBC"}
                  </p>
                  <ClaimJobButton jobId={job.id} vehicles={compatibleVehicles} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
