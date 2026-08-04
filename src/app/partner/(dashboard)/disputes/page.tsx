import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ScaleIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Disputes & Charges" };

const TABS = [
  { key: "needs_response", label: "Needs response" },
  { key: "submitted", label: "Submitted" },
  { key: "resolved", label: "Resolved" },
] as const;

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

export default async function PartnerDisputesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = TABS.find((t) => t.key === searchParams.tab)?.key ?? "needs_response";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  // deallocation_charges_select already scopes this to the calling
  // partner's own rows (migration 0007) — a direct table query, no RPC
  // needed, same as the admin side's DisputeActions.
  const dbStatus = tab === "needs_response" ? "none" : tab;
  const { data: charges } = await supabase
    .from("deallocation_charges")
    .select("id, amount, reason, created_at, updated_at, job_id, reservation_id, waived")
    .eq("transport_partner_id", partner!.id)
    .eq("dispute_status", dbStatus)
    .order(tab === "resolved" ? "updated_at" : "created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Disputes & Charges</h1>
      <p className="mt-1 text-sm text-ink-700">
        Charges raised against you for deallocated jobs or reservations, and their outcomes.
      </p>

      <div className="mt-6 flex gap-2 border-b border-brand-100">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/partner/disputes?tab=${t.key}`}
            className={`border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-ink-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {!charges?.length ? (
        <EmptyState
          icon={ScaleIcon}
          title={`No ${tab === "needs_response" ? "open" : tab} charges`}
          description={
            tab === "needs_response"
              ? "Charges you haven't responded to yet will show up here."
              : tab === "submitted"
                ? "Charges you've disputed and are waiting on a decision will show up here."
                : "Charges that have been reviewed and decided will show up here."
          }
        />
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {charges.map((charge) => (
            <Link
              key={charge.id}
              href={`/partner/disputes/${charge.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-5 hover:border-brand-300"
            >
              <div>
                <p className="font-heading text-sm font-bold text-ink-900">
                  {formatCurrency(charge.amount)}
                </p>
                <p className="text-sm text-ink-700">{charge.reason ?? "No reason recorded"}</p>
                <p className="mt-1 text-xs text-ink-700">
                  {charge.job_id ? "Linked to a job" : charge.reservation_id ? "Linked to a reservation" : "No linked job/reservation"}
                  {" · "}
                  {tab === "resolved"
                    ? `Resolved ${formatDate(charge.updated_at)}`
                    : `Charged ${formatDate(charge.created_at)}`}
                </p>
              </div>
              {tab === "resolved" && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    charge.waived ? "bg-mint-100 text-mint-600" : "bg-ink-700/10 text-ink-700"
                  }`}
                >
                  {charge.waived ? "Waived" : "Upheld"}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
