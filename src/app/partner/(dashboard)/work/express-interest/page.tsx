import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { HandshakeIcon, CarIcon } from "@/components/icons";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";
import { ExpressInterestActions, type InterestableVehicle } from "@/components/partner/work/ExpressInterestActions";

export const metadata: Metadata = { title: "Express Interest" };

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

export default async function ExpressInterestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id, guidelines_accepted_at")
    .eq("profile_id", user!.id)
    .single();

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
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Express Interest</h1>
        <p className="mt-1 text-sm text-ink-700">
          Multi-stop journey jobs — put yourself forward, the customer picks who they go with.
        </p>
        <EmptyState
          icon={CarIcon}
          title="Add an approved vehicle to express interest"
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

  // find_express_interest_jobs() is a SECURITY DEFINER RPC (migration
  // 0043) — same curated, address-free, fleet-compatible shape as Find
  // Work/Bidding, scoped to allocation_method = 'express_interest'.
  const [{ data: jobs, error }, { data: vehicles }] = await Promise.all([
    supabase.rpc("find_express_interest_jobs"),
    supabase
      .from("vehicles")
      .select("id, registration_number, vehicle_type, make, model, can_transport_motorbikes")
      .eq("transport_partner_id", partner!.id)
      .eq("approval_status", "approved"),
  ]);

  if (error) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Express Interest</h1>
        <p className="mt-4 text-sm font-medium text-coral-600">
          Couldn&apos;t load jobs right now: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Express Interest</h1>
      <p className="mt-1 text-sm text-ink-700">
        Multi-stop journey jobs — put yourself forward, the customer picks who they go with.
      </p>

      {!jobs?.length ? (
        <EmptyState
          icon={HandshakeIcon}
          title="No journey jobs right now"
          description="Multi-stop jobs that match your approved fleet will appear here — check back soon."
        />
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {jobs.map((job) => {
            const category = SERVICE_CATEGORIES.find((s) => s.slug === job.category);
            const compatibleVehicles: InterestableVehicle[] = (vehicles ?? [])
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
                      {job.payout_amount != null && (
                        <p className="mt-1 text-sm font-bold text-ink-900">
                          £{Number(job.payout_amount).toFixed(2)} payout
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="shrink-0 text-sm text-ink-700">
                    {job.interest_count} partner{job.interest_count === 1 ? "" : "s"} interested
                  </p>
                </div>

                <div className="mt-4">
                  {compatibleVehicles.length ? (
                    <ExpressInterestActions
                      jobId={job.id}
                      vehicles={compatibleVehicles}
                      initialStatus={job.my_interest_status}
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
    </div>
  );
}
