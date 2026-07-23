import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DisputeActions } from "@/components/admin/disputes/DisputeActions";

export const metadata: Metadata = { title: "Review Dispute" };

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminDisputeDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: charge } = await supabase
    .from("deallocation_charges")
    .select(
      "id, amount, reason, dispute_status, created_at, updated_at, job_id, reservation_id, transport_partner_id, waived, resolution"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!charge) notFound();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("business_name")
    .eq("id", charge.transport_partner_id)
    .maybeSingle();

  const job = charge.job_id
    ? (
        await supabase
          .from("jobs")
          .select("title, collection_postcode, delivery_postcode, listed_at")
          .eq("id", charge.job_id)
          .maybeSingle()
      ).data
    : null;

  const reservation = charge.reservation_id
    ? (
        await supabase
          .from("reservations")
          .select("date, start_postcode, end_postcode")
          .eq("id", charge.reservation_id)
          .maybeSingle()
      ).data
    : null;

  const isSubmitted = charge.dispute_status === "submitted";

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink-900">
            {formatCurrency(charge.amount)}
          </h1>
          <p className="mt-1 text-sm text-ink-700">{partner?.business_name ?? "Unknown partner"}</p>
        </div>
        {!isSubmitted && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              charge.waived ? "bg-mint-100 text-mint-600" : "bg-ink-700/10 text-ink-700"
            }`}
          >
            {charge.waived ? "Waived" : "Upheld"}
          </span>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">Reason</h2>
        <p className="mt-2 text-sm text-ink-900">{charge.reason ?? "No reason recorded"}</p>
        <p className="mt-4 text-xs text-ink-700">Submitted {formatDate(charge.created_at)}</p>
      </div>

      {(job || reservation) && (
        <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
          <h2 className="font-heading text-base font-bold text-ink-900">
            {job ? "Linked job" : "Linked reservation"}
          </h2>
          {job && (
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-700">Title</dt>
                <dd className="text-ink-900">{job.title}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-700">Route</dt>
                <dd className="text-ink-900">
                  {job.collection_postcode} → {job.delivery_postcode}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-700">Listed</dt>
                <dd className="text-ink-900">{formatDate(job.listed_at)}</dd>
              </div>
            </dl>
          )}
          {reservation && (
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-700">Date</dt>
                <dd className="text-ink-900">{formatDate(reservation.date)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-700">Route</dt>
                <dd className="text-ink-900">
                  {[reservation.start_postcode, reservation.end_postcode].filter(Boolean).join(" → ") ||
                    "No route set"}
                </dd>
              </div>
            </dl>
          )}
        </div>
      )}

      {!isSubmitted && charge.resolution && (
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">Resolution</p>
          <p className="mt-1 text-sm text-ink-900">{charge.resolution}</p>
          <p className="mt-1 text-xs text-ink-700">Resolved {formatDate(charge.updated_at)}</p>
        </div>
      )}

      {isSubmitted && (
        <div className="mt-6">
          <DisputeActions chargeId={charge.id} />
        </div>
      )}
    </div>
  );
}
