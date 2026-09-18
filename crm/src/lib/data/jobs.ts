import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SampleJob } from "@/lib/sample-data";

/** Jobs on the board, shaped like the sample rows. RLS decides scope: ops and
 *  above see the brand's jobs, crew see only the jobs they are assigned to. */
export async function getJobs(): Promise<SampleJob[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select(
      `id, reference, status, scheduled_start, scheduled_end, access_notes,
       services:lead_id ( id ),
       customers ( first_name, last_name, organisations ( name ) ),
       job_assignments ( role, cancelled_at, staff ( full_name ), vehicles ( registration ) )`,
    )
    .neq("status", "cancelled")
    .order("scheduled_start", { ascending: true, nullsFirst: false })
    .limit(200);

  if (error) throw new Error(`Could not load jobs: ${error.message}`);

  return (data ?? []).map((row: any): SampleJob => {
    const live = (row.job_assignments ?? []).filter((a: any) => a.cancelled_at === null);
    const customer = row.customers ?? null;
    const name =
      customer?.organisations?.name ??
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ");

    const start = row.scheduled_start;
    const end = row.scheduled_end;
    const hours =
      start && end
        ? Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 3_600_000))
        : 0;

    return {
      id: row.id,
      reference: row.reference,
      customer: name || "Unnamed customer",
      service: "—",
      start: start ?? "",
      durationHours: hours,
      crew: live.filter((a: any) => a.staff).map((a: any) => a.staff.full_name),
      vehicle: live.find((a: any) => a.vehicles)?.vehicles?.registration ?? "—",
      // 'booked' has no board column of its own yet; it sits with scheduled.
      status: row.status === "in_progress" || row.status === "completed" ? row.status : "scheduled",
      accessNotes: row.access_notes ?? "",
    };
  });
}
