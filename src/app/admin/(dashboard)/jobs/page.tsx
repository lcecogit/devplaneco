import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RouteIcon } from "@/components/icons";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";

export const metadata: Metadata = { title: "Jobs" };

const TABS = [
  { key: "listed", label: "Needs assignment" },
  { key: "matched", label: "Assigned" },
] as const;

function formatCurrency(amount: number | null) {
  return amount == null
    ? "—"
    : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = searchParams.tab === "matched" ? "matched" : "listed";
  const supabase = await createClient();

  // jobs_select already grants admin full-row access (migration 0035) — a
  // direct table query, same as the disputes and vehicles admin pages.
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, category, customer_price, payout_amount, allocation_method, listed_at")
    .eq("matching_status", tab)
    .order("listed_at", { ascending: tab === "listed" });

  const jobIds = (jobs ?? []).map((j) => j.id);
  const { data: assignments } =
    tab === "matched" && jobIds.length
      ? await supabase
          .from("job_assignments")
          .select("job_id, transport_partner_id")
          .in("job_id", jobIds)
      : { data: [] };

  const partnerIds = Array.from(new Set((assignments ?? []).map((a) => a.transport_partner_id)));
  const { data: partners } = partnerIds.length
    ? await supabase.from("transport_partners").select("id, business_name").in("id", partnerIds)
    : { data: [] };
  const partnerNameById = new Map((partners ?? []).map((p) => [p.id, p.business_name]));
  const partnerIdByJobId = new Map((assignments ?? []).map((a) => [a.job_id, a.transport_partner_id]));

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Jobs</h1>
      <p className="mt-1 text-sm text-ink-700">
        Assign a job to a specific partner directly, or reassign one that's already matched.
      </p>

      <div className="mt-6 flex gap-2 border-b border-brand-100">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/jobs?tab=${t.key}`}
            className={`border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-ink-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {!jobs?.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-brand-300 bg-white p-10 text-center">
          <RouteIcon className="mx-auto h-8 w-8 text-brand-300" />
          <h2 className="mt-3 font-heading text-lg font-bold text-ink-900">
            No {tab === "listed" ? "unassigned" : "assigned"} jobs
          </h2>
          <p className="mt-1 text-sm text-ink-700">
            {tab === "listed"
              ? "Every listed job currently has a partner in the normal matching flow."
              : "Assigned jobs will show up here."}
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {jobs.map((job) => {
            const category = SERVICE_CATEGORIES.find((s) => s.slug === job.category);
            const partnerId = partnerIdByJobId.get(job.id);
            return (
              <Link
                key={job.id}
                href={`/admin/jobs/${job.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-5 hover:border-brand-300"
              >
                <div>
                  <p className="font-heading text-sm font-bold text-ink-900">
                    {category?.title ?? job.category ?? job.title}
                  </p>
                  <p className="text-sm text-ink-700">
                    {formatCurrency(job.customer_price)}
                    {job.payout_amount != null ? ` · payout ${formatCurrency(job.payout_amount)}` : ""}
                    {job.allocation_method ? ` · ${job.allocation_method.replace(/_/g, " ")}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-ink-700">
                    Listed {formatDate(job.listed_at)}
                    {partnerId ? ` · ${partnerNameById.get(partnerId) ?? "Unknown partner"}` : ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
