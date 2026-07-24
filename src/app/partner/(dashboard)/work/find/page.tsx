import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { RouteIcon, CarIcon } from "@/components/icons";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";

export const metadata: Metadata = { title: "Find Work" };

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

export default async function FindWorkPage() {
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
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Find Work</h1>
        <p className="mt-1 text-sm text-ink-700">
          Browse listed jobs that match your fleet and claim one on a first-come,
          first-served basis.
        </p>
        <EmptyState
          icon={CarIcon}
          title="Add an approved vehicle to start finding work"
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

  // find_work_jobs() is a SECURITY DEFINER RPC, not a direct table select —
  // it's the only way a partner can browse 'listed' jobs (see migration
  // 0020). It already filters to jobs compatible with this partner's
  // approved fleet and returns only the postcode area, never the full
  // address, for jobs that haven't been claimed yet.
  const { data: jobs, error } = await supabase.rpc("find_work_jobs");

  if (error) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Find Work</h1>
        <p className="mt-4 text-sm font-medium text-coral-600">
          Couldn&apos;t load jobs right now: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Find Work</h1>
      <p className="mt-1 text-sm text-ink-700">
        Listed jobs that match your approved fleet. Claim one before another partner does.
      </p>

      {!jobs?.length ? (
        <EmptyState
          icon={RouteIcon}
          title="No matching jobs right now"
          description="Nothing listed matches your approved vehicles at the moment — check back soon."
        />
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {jobs.map((job) => {
            const category = SERVICE_CATEGORIES.find((s) => s.slug === job.category);
            const payout = job.payout_amount ?? job.customer_price;
            return (
              <Link
                key={job.id}
                href={`/partner/work/find/${job.id}`}
                className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-white p-5 hover:border-brand-300 sm:flex-row sm:items-center sm:justify-between"
              >
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
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-6 sm:flex-col sm:items-end sm:gap-1">
                  <p className="font-heading text-lg font-extrabold text-ink-900">
                    {payout != null ? `£${Number(payout).toFixed(2)}` : "TBC"}
                  </p>
                  {job.distance_miles != null && (
                    <p className="text-xs text-ink-700">{Number(job.distance_miles).toFixed(1)} mi</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
