import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { RouteIcon } from "@/components/icons";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";

export const metadata: Metadata = { title: "My Work" };

const JOB_STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  en_route_to_collection: "En route to collection",
  arrived_at_collection: "Arrived at collection",
  documentation_complete_collection: "Collection paperwork complete",
  collection_complete: "Collection complete",
  in_transit: "In transit",
  arrived_at_delivery: "Arrived at delivery",
  documentation_complete_delivery: "Delivery paperwork complete",
  delivery_complete: "Delivery complete",
};

export default async function MyWorkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: assignments } = await supabase
    .from("job_assignments")
    .select("id, job_id, assigned_at")
    .eq("transport_partner_id", partner!.id)
    .order("assigned_at", { ascending: false });

  // job_assigned_to_current_user() in jobs_select grants full-detail access
  // (including the real address) once an assignment exists — no join
  // syntax used elsewhere in this codebase, so fetched separately and
  // matched up here rather than embedding the relation in the select above.
  const jobIds = assignments?.map((a) => a.job_id) ?? [];
  const { data: jobs } = jobIds.length
    ? await supabase
        .from("jobs")
        .select(
          "id, title, category, collection_address, collection_postcode, collection_window_start, delivery_address, delivery_postcode, status"
        )
        .in("id", jobIds)
    : { data: [] };
  const jobsById = new Map((jobs ?? []).map((j) => [j.id, j]));

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">My Work</h1>
      <p className="mt-1 text-sm text-ink-700">Jobs assigned to you, in progress or completed.</p>

      {!assignments?.length ? (
        <EmptyState
          icon={RouteIcon}
          title="No jobs assigned yet"
          description="Claim a job from Find Work, or wait for a job to be assigned another way, and it'll show up here."
        />
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {assignments.map((assignment) => {
            const job = jobsById.get(assignment.job_id);
            const category = job ? SERVICE_CATEGORIES.find((s) => s.slug === job.category) : undefined;
            return (
              <div key={assignment.id} className="rounded-2xl border border-brand-100 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-heading text-sm font-bold text-ink-900">
                      {category?.title ?? job?.title ?? "Job"}
                    </p>
                    {job && (
                      <>
                        <p className="mt-1 text-sm text-ink-700">
                          {job.collection_address ? `${job.collection_address}, ` : ""}
                          {job.collection_postcode} → {job.delivery_address ? `${job.delivery_address}, ` : ""}
                          {job.delivery_postcode}
                        </p>
                        {job.collection_window_start && (
                          <p className="mt-1 text-xs text-ink-700">
                            {new Date(job.collection_window_start).toLocaleString("en-GB", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  {job?.status && (
                    <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                      {JOB_STATUS_LABELS[job.status] ?? job.status}
                    </span>
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
