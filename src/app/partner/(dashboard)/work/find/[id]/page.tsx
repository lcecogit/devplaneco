import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";
import { ClaimJobButton, type ClaimableVehicle } from "@/components/partner/work/ClaimJobButton";

export const metadata: Metadata = { title: "Job Details" };

function formatDateTime(value: string | null) {
  if (!value) return "TBC";
  return new Date(value).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function FindWorkDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  // Same RPC as the list page, narrowed to one job — see migration 0020.
  // An empty result here is a legitimate outcome (someone else claimed it,
  // or it stopped being compatible), not necessarily a broken link, so this
  // renders a friendly message rather than a hard 404.
  const { data: jobs } = await supabase.rpc("find_work_jobs", { p_job_id: params.id });
  const job = jobs?.[0];

  if (!job) {
    return (
      <div className="max-w-xl">
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Job no longer available</h1>
        <p className="mt-2 text-sm text-ink-700">
          This job has already been claimed, is no longer listed, or no longer matches your
          approved fleet.
        </p>
        <Link
          href="/partner/work/find"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral-600"
        >
          Back to Find Work
        </Link>
      </div>
    );
  }

  const category = SERVICE_CATEGORIES.find((s) => s.slug === job.category);
  const payout = job.payout_amount ?? job.customer_price;

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, registration_number, vehicle_type, make, model, can_transport_motorbikes")
    .eq("transport_partner_id", partner!.id)
    .eq("approval_status", "approved");

  const compatibleVehicles: ClaimableVehicle[] = (vehicles ?? [])
    .filter((v) => job.category !== "motorbike-transport" || v.can_transport_motorbikes)
    .map((v) => ({
      id: v.id,
      label: [v.registration_number, [v.make, v.model].filter(Boolean).join(" ") || v.vehicle_type]
        .filter(Boolean)
        .join(" — "),
    }));

  return (
    <div className="max-w-2xl">
      <Link href="/partner/work/find" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
        ← Back to Find Work
      </Link>

      <div className="mt-3 flex items-start justify-between gap-4">
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">
          {category?.title ?? job.category ?? "Move"}
        </h1>
        <p className="font-heading text-2xl font-extrabold text-ink-900">
          {payout != null ? `£${Number(payout).toFixed(2)}` : "TBC"}
        </p>
      </div>
      {job.payout_amount == null && job.customer_price != null && (
        <p className="text-xs text-ink-700">Estimated — final payout isn&apos;t calculated yet.</p>
      )}

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-700">Collection area</dt>
            <dd className="font-semibold text-ink-900">{job.collection_area || "Unknown"}</dd>
            <dd className="text-ink-700">{formatDateTime(job.collection_window_start)}</dd>
          </div>
          <div>
            <dt className="text-ink-700">Delivery area</dt>
            <dd className="font-semibold text-ink-900">{job.delivery_area || "Unknown"}</dd>
            <dd className="text-ink-700">{formatDateTime(job.delivery_window_start)}</dd>
          </div>
          {job.distance_miles != null && (
            <div>
              <dt className="text-ink-700">Distance</dt>
              <dd className="font-semibold text-ink-900">{Number(job.distance_miles).toFixed(1)} miles</dd>
            </div>
          )}
          <div>
            <dt className="text-ink-700">Listed</dt>
            <dd className="font-semibold text-ink-900">{formatDateTime(job.listed_at)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-ink-700">
          The exact collection and delivery addresses are shared once you&apos;ve claimed this job.
        </p>
      </div>

      <div className="mt-6">
        {compatibleVehicles.length ? (
          <ClaimJobButton jobId={job.id} vehicles={compatibleVehicles} />
        ) : (
          <p className="text-sm text-ink-700">
            None of your approved vehicles are compatible with this job anymore.
          </p>
        )}
      </div>
    </div>
  );
}
