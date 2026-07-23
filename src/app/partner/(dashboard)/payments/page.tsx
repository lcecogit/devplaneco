import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BanknoteIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Payments" };

const TABS = [
  { key: "scheduled", label: "Scheduled" },
  { key: "pending", label: "Pending" },
  { key: "transferred", label: "Transferred" },
] as const;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

export default async function PartnerPaymentsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = TABS.find((t) => t.key === searchParams.tab)?.key ?? "scheduled";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, status, scheduled_date, transferred_date, express_pay")
    .eq("transport_partner_id", partner!.id)
    .eq("status", tab)
    .order("scheduled_date", { ascending: true });

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Payments</h1>

      <div className="mt-6 flex gap-2 border-b border-brand-100">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/partner/payments?tab=${t.key}`}
            className={`border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-ink-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {!payments?.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-brand-300 bg-white p-10 text-center">
          <BanknoteIcon className="mx-auto h-8 w-8 text-brand-300" />
          <h2 className="mt-3 font-heading text-lg font-bold text-ink-900">
            No {tab} payments
          </h2>
          <p className="mt-1 text-sm text-ink-700">
            Payments appear here automatically once jobs are completed — there&apos;s
            nothing to set up.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-5"
            >
              <div>
                <p className="font-heading text-base font-bold text-ink-900">
                  {formatCurrency(payment.amount)}
                </p>
                <p className="text-sm text-ink-700">
                  {payment.transferred_date
                    ? `Transferred ${payment.transferred_date}`
                    : payment.scheduled_date
                      ? `Scheduled for ${payment.scheduled_date}`
                      : "No date set"}
                </p>
              </div>
              {payment.express_pay && (
                <span className="rounded-full bg-mint-50 px-3 py-1 text-xs font-semibold text-mint-600">
                  Express pay
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
