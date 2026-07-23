import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MetricHistoryChart } from "@/components/admin/performance/MetricHistoryChart";
import { PmpActions } from "@/components/admin/performance/PmpActions";

export const metadata: Metadata = { title: "Partner Performance" };

const PMP_STATUS_STYLES: Record<string, string> = {
  active: "bg-coral-100 text-coral-600",
  resolved: "bg-mint-100 text-mint-600",
  terminated: "bg-ink-700/10 text-ink-700",
};

function formatMonth(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminPartnerPerformanceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id, business_name")
    .eq("id", params.id)
    .maybeSingle();

  if (!partner) notFound();

  const { data: history } = await supabase
    .from("performance_metrics")
    .select(
      "period_month, customer_feedback_rating, app_usage_pct, deallocation_rate_pct, on_time_pickup_pct, on_time_delivery_pct"
    )
    .eq("transport_partner_id", partner.id)
    .order("period_month", { ascending: true });

  const { data: plans } = await supabase
    .from("performance_management_plans")
    .select("id, status, reason, started_at, updated_at")
    .eq("transport_partner_id", partner.id)
    .order("started_at", { ascending: false });

  const [currentPlan, ...pastPlans] = plans ?? [];

  const ratingHistory = (history ?? [])
    .filter((h) => h.customer_feedback_rating !== null)
    .map((h) => ({ period: formatMonth(h.period_month), value: h.customer_feedback_rating as number }));

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">{partner.business_name}</h1>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">Metric history</h2>
        <div className="mt-4">
          <MetricHistoryChart data={ratingHistory} max={5} label="Customer feedback rating (out of 5)" />
        </div>

        {!!history?.length && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-xs font-semibold uppercase tracking-wide text-ink-700">
                  <th className="py-2 pr-4">Month</th>
                  <th className="py-2 pr-4">Feedback</th>
                  <th className="py-2 pr-4">App usage %</th>
                  <th className="py-2 pr-4">Deallocation %</th>
                  <th className="py-2 pr-4">On-time pickup %</th>
                  <th className="py-2 pr-4">On-time delivery %</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.period_month} className="border-b border-brand-100 last:border-0">
                    <td className="py-2 pr-4 text-ink-900">{formatMonth(row.period_month)}</td>
                    <td className="py-2 pr-4 text-ink-900">{row.customer_feedback_rating ?? "—"}</td>
                    <td className="py-2 pr-4 text-ink-900">{row.app_usage_pct ?? "—"}</td>
                    <td className="py-2 pr-4 text-ink-900">{row.deallocation_rate_pct ?? "—"}</td>
                    <td className="py-2 pr-4 text-ink-900">{row.on_time_pickup_pct ?? "—"}</td>
                    <td className="py-2 pr-4 text-ink-900">{row.on_time_delivery_pct ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-bold text-ink-900">Performance management plan</h2>
          {currentPlan && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                PMP_STATUS_STYLES[currentPlan.status] ?? "bg-ink-700/10 text-ink-700"
              }`}
            >
              {currentPlan.status}
            </span>
          )}
        </div>

        {currentPlan ? (
          <div className="mt-3">
            <p className="text-sm text-ink-700">{currentPlan.reason ?? "No reason recorded."}</p>
            <p className="mt-1 text-xs text-ink-700">Started {formatDate(currentPlan.started_at)}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-700">No performance management plan on record.</p>
        )}

        <div className="mt-4">
          <PmpActions transportPartnerId={partner.id} currentPlan={currentPlan ?? null} />
        </div>

        {pastPlans.length > 0 && (
          <div className="mt-6 border-t border-brand-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">Plan history</p>
            <div className="mt-3 flex flex-col gap-2">
              {pastPlans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{formatDate(plan.started_at)}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      PMP_STATUS_STYLES[plan.status] ?? "bg-ink-700/10 text-ink-700"
                    }`}
                  >
                    {plan.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
