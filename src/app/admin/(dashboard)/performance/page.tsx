import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TrendingUpIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Partner Performance" };

// Flagging thresholds — adjust here if the criteria for surfacing an
// under-performing partner changes.
const FLAG_THRESHOLDS = {
  minFeedbackRating: 3.5,
  maxDeallocationRatePct: 15,
};

const METRIC_COLUMNS = [
  { key: "customer_feedback_rating", label: "Feedback" },
  { key: "app_usage_pct", label: "App usage %" },
  { key: "deallocation_rate_pct", label: "Deallocation %" },
  { key: "on_time_pickup_pct", label: "On-time pickup %" },
  { key: "on_time_delivery_pct", label: "On-time delivery %" },
] as const;

type MetricKey = (typeof METRIC_COLUMNS)[number]["key"];

function formatMetric(value: number | null) {
  return value === null || value === undefined ? "—" : value.toString();
}

export default async function AdminPerformancePage({
  searchParams,
}: {
  searchParams: { sort?: string; dir?: string; flagged?: string };
}) {
  const supabase = await createClient();

  const { data: partners } = await supabase
    .from("transport_partners")
    .select("id, business_name")
    .order("business_name");

  const { data: metrics } = await supabase
    .from("performance_metrics")
    .select(
      "transport_partner_id, customer_feedback_rating, app_usage_pct, deallocation_rate_pct, on_time_pickup_pct, on_time_delivery_pct, computed_at"
    )
    .order("computed_at", { ascending: false });

  const latestByPartner = new Map<string, NonNullable<typeof metrics>[number]>();
  for (const m of metrics ?? []) {
    if (!latestByPartner.has(m.transport_partner_id)) latestByPartner.set(m.transport_partner_id, m);
  }

  let rows = (partners ?? []).map((partner) => {
    const metric = latestByPartner.get(partner.id) ?? null;
    const flagged = metric
      ? (metric.customer_feedback_rating !== null &&
          metric.customer_feedback_rating < FLAG_THRESHOLDS.minFeedbackRating) ||
        (metric.deallocation_rate_pct !== null &&
          metric.deallocation_rate_pct > FLAG_THRESHOLDS.maxDeallocationRatePct)
      : false;
    return { partner, metric, flagged };
  });

  const flaggedOnly = searchParams.flagged === "1";
  if (flaggedOnly) rows = rows.filter((r) => r.flagged);

  const sortKey = METRIC_COLUMNS.find((c) => c.key === searchParams.sort)?.key as
    | MetricKey
    | undefined;
  const dir = searchParams.dir === "asc" ? "asc" : "desc";

  if (sortKey) {
    const withValue = rows.filter((r) => r.metric?.[sortKey] != null);
    const withoutValue = rows.filter((r) => r.metric?.[sortKey] == null);
    withValue.sort((a, b) => {
      const av = a.metric![sortKey] as number;
      const bv = b.metric![sortKey] as number;
      return dir === "asc" ? av - bv : bv - av;
    });
    rows = [...withValue, ...withoutValue];
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Partner Performance</h1>
        <Link
          href={flaggedOnly ? "/admin/performance" : "/admin/performance?flagged=1"}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            flaggedOnly ? "bg-coral-500 text-white" : "border border-brand-300 text-brand-700"
          }`}
        >
          {flaggedOnly ? "Showing flagged only" : "Show flagged only"}
        </Link>
      </div>

      {!rows.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-brand-300 bg-white p-10 text-center">
          <TrendingUpIcon className="mx-auto h-8 w-8 text-brand-300" />
          <h2 className="mt-3 font-heading text-lg font-bold text-ink-900">
            {flaggedOnly ? "No flagged partners" : "No partners yet"}
          </h2>
          <p className="mt-1 text-sm text-ink-700">
            {flaggedOnly
              ? "Nothing below the feedback or deallocation thresholds right now."
              : "Partner performance will show up here once partners sign up."}
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-brand-100 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-xs font-semibold uppercase tracking-wide text-ink-700">
                <th className="px-5 py-3">Partner</th>
                {METRIC_COLUMNS.map((col) => {
                  const nextDir = sortKey === col.key && dir === "desc" ? "asc" : "desc";
                  return (
                    <th key={col.key} className="px-5 py-3">
                      <Link
                        href={`/admin/performance?sort=${col.key}&dir=${nextDir}${flaggedOnly ? "&flagged=1" : ""}`}
                        className="hover:text-brand-700"
                      >
                        {col.label}
                        {sortKey === col.key ? (dir === "asc" ? " ↑" : " ↓") : ""}
                      </Link>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ partner, metric, flagged }) => (
                <tr key={partner.id} className="border-b border-brand-100 last:border-0">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/performance/${partner.id}`}
                      className="font-semibold text-ink-900 hover:text-brand-700"
                    >
                      {partner.business_name}
                    </Link>
                    {flagged && (
                      <span className="ml-2 rounded-full bg-coral-100 px-2 py-0.5 text-xs font-semibold text-coral-600">
                        Flagged
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink-900">
                    {formatMetric(metric?.customer_feedback_rating ?? null)}
                  </td>
                  <td className="px-5 py-3 text-ink-900">
                    {formatMetric(metric?.app_usage_pct ?? null)}
                  </td>
                  <td className="px-5 py-3 text-ink-900">
                    {formatMetric(metric?.deallocation_rate_pct ?? null)}
                  </td>
                  <td className="px-5 py-3 text-ink-900">
                    {formatMetric(metric?.on_time_pickup_pct ?? null)}
                  </td>
                  <td className="px-5 py-3 text-ink-900">
                    {formatMetric(metric?.on_time_delivery_pct ?? null)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
