import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ScaleIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Disputes & Charges" };

const TABS = [
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

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = TABS.find((t) => t.key === searchParams.tab)?.key ?? "submitted";
  const supabase = await createClient();

  const { data: charges } = await supabase
    .from("deallocation_charges")
    .select("id, amount, reason, created_at, updated_at, job_id, reservation_id, transport_partner_id, waived")
    .eq("dispute_status", tab)
    .order(tab === "submitted" ? "created_at" : "updated_at", { ascending: tab === "submitted" });

  const partnerIds = Array.from(new Set((charges ?? []).map((c) => c.transport_partner_id)));
  const { data: partners } = partnerIds.length
    ? await supabase.from("transport_partners").select("id, business_name").in("id", partnerIds)
    : { data: [] };
  const partnerNameById = new Map((partners ?? []).map((p) => [p.id, p.business_name]));

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Disputes & Charges</h1>

      <div className="mt-6 flex gap-2 border-b border-brand-100">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/disputes?tab=${t.key}`}
            className={`border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-ink-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {!charges?.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-brand-300 bg-white p-10 text-center">
          <ScaleIcon className="mx-auto h-8 w-8 text-brand-300" />
          <h2 className="mt-3 font-heading text-lg font-bold text-ink-900">
            No {tab} disputes
          </h2>
          <p className="mt-1 text-sm text-ink-700">
            {tab === "submitted"
              ? "Disputed deallocation charges will show up here as soon as partners raise them."
              : "Resolved disputes will show up here for audit history."}
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {charges.map((charge) => (
            <Link
              key={charge.id}
              href={`/admin/disputes/${charge.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-5 hover:border-brand-300"
            >
              <div>
                <p className="font-heading text-sm font-bold text-ink-900">
                  {formatCurrency(charge.amount)} · {partnerNameById.get(charge.transport_partner_id) ?? "Unknown partner"}
                </p>
                <p className="text-sm text-ink-700">{charge.reason ?? "No reason recorded"}</p>
                <p className="mt-1 text-xs text-ink-700">
                  {charge.job_id ? "Linked to a job" : charge.reservation_id ? "Linked to a reservation" : "No linked job/reservation"}
                  {" · "}
                  {tab === "submitted"
                    ? `Submitted ${formatDate(charge.created_at)}`
                    : `Resolved ${formatDate(charge.updated_at)}`}
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
