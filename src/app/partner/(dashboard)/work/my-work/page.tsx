import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { RouteIcon } from "@/components/icons";

export const metadata: Metadata = { title: "My Work" };

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

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">My Work</h1>
      <p className="mt-1 text-sm text-ink-700">Jobs assigned to you, in progress or completed.</p>

      {!assignments?.length ? (
        <EmptyState
          icon={RouteIcon}
          title="No jobs assigned yet"
          description="Jobs you've won or been assigned will show up here once the job matching engine goes live."
        />
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-2xl border border-brand-100 bg-white p-5">
              <p className="text-sm text-ink-800">Job assigned {assignment.assigned_at}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
