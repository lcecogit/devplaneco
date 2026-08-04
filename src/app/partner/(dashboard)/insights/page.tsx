import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";

export const metadata: Metadata = { title: "Insights" };

function StatTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">{label}</p>
      <p className="mt-1 font-heading text-2xl font-extrabold text-ink-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-700">{hint}</p>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="rounded-2xl border border-brand-100 bg-white p-5 hover:border-brand-300">
        {content}
      </Link>
    );
  }

  return <div className="rounded-2xl border border-brand-100 bg-white p-5">{content}</div>;
}

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id, business_name")
    .eq("profile_id", user!.id)
    .single();

  // my_performance_summary() computes live from job_assignments/ratings/
  // deallocation_charges/performance_management_plans — see migration 0039
  // for why this doesn't read performance_metrics (nothing populates it).
  const { data: summaryRows, error } = await supabase.rpc("my_performance_summary");
  const summary = summaryRows?.[0];

  if (error || !summary) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Insights</h1>
        <p className="mt-4 text-sm font-medium text-coral-600">
          Couldn&apos;t load your insights right now{error ? `: ${error.message}` : "."}
        </p>
      </div>
    );
  }

  // Recent jobs, matched up with ratings — same "fetch separately, match in
  // JS" convention as My Work, not a join.
  const { data: assignments } = await supabase
    .from("job_assignments")
    .select("id, job_id, assigned_at")
    .eq("transport_partner_id", partner!.id)
    .order("assigned_at", { ascending: false })
    .limit(10);

  const jobIds = assignments?.map((a) => a.job_id) ?? [];
  const [{ data: jobs }, { data: ratings }] = await Promise.all([
    jobIds.length
      ? supabase.from("jobs").select("id, title, category, status").in("id", jobIds)
      : Promise.resolve({ data: [] }),
    jobIds.length
      ? supabase.from("ratings").select("job_id, rating").in("job_id", jobIds)
      : Promise.resolve({ data: [] }),
  ]);
  const jobsById = new Map((jobs ?? []).map((j) => [j.id, j]));
  const ratingsByJobId = new Map((ratings ?? []).map((r) => [r.job_id, r.rating]));

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Insights</h1>
      <p className="mt-1 text-sm text-ink-700">Performance, earnings &amp; reliability.</p>

      <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 rounded-2xl border border-brand-100 bg-white p-5 text-sm">
        <div>
          <p className="text-ink-700">Member since</p>
          <p className="font-semibold text-ink-900">
            {new Date(summary.member_since).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
        </div>
        <div>
          <p className="text-ink-700">Booster eligibility</p>
          <p
            className={`font-semibold ${summary.booster_eligible ? "text-mint-700" : "text-coral-600"}`}
          >
            {summary.booster_eligible ? "Eligible" : "Not eligible"}
          </p>
        </div>
        <div>
          <p className="text-ink-700">Express Pay</p>
          <p
            className={`font-semibold ${summary.express_pay_eligible ? "text-mint-700" : "text-ink-700"}`}
          >
            {summary.express_pay_eligible ? "Eligible" : "Needs a 4.5+ rating"}
          </p>
        </div>
        {summary.active_performance_plan && (
          <div>
            <p className="text-ink-700">Status</p>
            <p className="font-semibold text-coral-600">On a performance management plan</p>
          </div>
        )}
      </div>

      {summary.job_access_blocked ? (
        <div className="mt-4 rounded-2xl border border-coral-200 bg-coral-50/60 p-5">
          <p className="font-heading text-sm font-bold text-coral-700">
            Job access restricted — rating below 4.5
          </p>
          <p className="mt-1 text-sm text-ink-700">
            Find Work, Bidding, and Express Interest won&apos;t show any jobs while your average
            rating stays below 4.5. Improving your rating on upcoming jobs will restore access
            automatically.
          </p>
        </div>
      ) : summary.job_access_probation ? (
        <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
          <p className="font-heading text-sm font-bold text-brand-700">
            Building trust — {summary.jobs_until_full_access} more job
            {summary.jobs_until_full_access === 1 ? "" : "s"} to unlock full access
          </p>
          <p className="mt-1 text-sm text-ink-700">
            New partners see Single Item Transport jobs only until they&apos;ve completed 30 jobs
            with a 4.8+ average rating — then every category opens up in Find Work, Bidding, and
            Express Interest.
          </p>
        </div>
      ) : null}

      <h2 className="mt-8 font-heading text-lg font-bold text-ink-900">Monthly reliability</h2>
      <p className="mt-1 text-sm text-ink-700">
        Job count and rating are computed from your real activity. On-time pickup/delivery and app
        usage aren&apos;t tracked yet — there&apos;s no driver app recording actual arrival times,
        so those show as no data rather than a guessed number.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Job Count" value={String(summary.total_jobs)} hint={`${summary.jobs_last_30_days} in the last 30 days`} />
        <StatTile
          label="Overall Rating"
          value={summary.average_rating != null ? Number(summary.average_rating).toFixed(2) : "—"}
          hint={summary.rating_count > 0 ? `${summary.rating_count} rating${summary.rating_count === 1 ? "" : "s"}` : "No ratings yet"}
        />
        <StatTile label="On-Time Pickup" value="—" hint="No data yet" />
        <StatTile label="On-Time Delivery" value="—" hint="No data yet" />
        <StatTile
          label="Deallocations"
          value={String(summary.deallocation_count)}
          hint={
            Number(summary.deallocation_total_amount) > 0
              ? `£${Number(summary.deallocation_total_amount).toFixed(2)} total`
              : undefined
          }
          href="/partner/disputes"
        />
        <StatTile label="App Usage" value="—" hint="No driver app yet" />
      </div>

      <h2 className="mt-10 font-heading text-lg font-bold text-ink-900">Jobs</h2>
      <p className="mt-1 text-sm text-ink-700">Your most recent assignments and how each was rated.</p>

      {!assignments?.length ? (
        <p className="mt-4 text-sm text-ink-700">No completed jobs yet.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {assignments.map((assignment) => {
            const job = jobsById.get(assignment.job_id);
            const category = job ? SERVICE_CATEGORIES.find((s) => s.slug === job.category) : undefined;
            const rating = ratingsByJobId.get(assignment.job_id);
            return (
              <div
                key={assignment.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-brand-100 bg-white p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {category?.title ?? job?.title ?? "Job"}
                  </p>
                  <p className="text-xs text-ink-700">
                    {new Date(assignment.assigned_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-ink-900">
                  {rating != null ? `★ ${rating}` : "Not yet rated"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
