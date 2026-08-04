"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PAYMENT_METHODS = ["Bank transfer", "Card", "Cash", "Cheque"] as const;

type PaymentDetails = {
  bank_account_name: string | null;
  bank_sort_code: string | null;
  bank_account_number: string | null;
  vat_number: string | null;
  payment_methods_accepted: string[];
};

export function PaymentDetailsForm({
  transportPartnerId,
  details,
}: {
  transportPartnerId: string;
  details: PaymentDetails | null;
}) {
  const router = useRouter();
  const [bankAccountName, setBankAccountName] = useState(details?.bank_account_name ?? "");
  const [bankSortCode, setBankSortCode] = useState(details?.bank_sort_code ?? "");
  const [bankAccountNumber, setBankAccountNumber] = useState(
    details?.bank_account_number ?? ""
  );
  const [vatNumber, setVatNumber] = useState(details?.vat_number ?? "");
  const [paymentMethods, setPaymentMethods] = useState<string[]>(
    details?.payment_methods_accepted ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleMethod(method: string) {
    setPaymentMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const supabase = createClient();
    // No existing row until a partner saves this section once, so this is
    // an upsert keyed on the unique transport_partner_id — same shape as
    // every other partner-owned settings row in this codebase, just without
    // a pre-created row from signup.
    const { error: upsertError } = await supabase.from("transport_partner_payment_details").upsert(
      {
        transport_partner_id: transportPartnerId,
        bank_account_name: bankAccountName || null,
        bank_sort_code: bankSortCode || null,
        bank_account_number: bankAccountNumber || null,
        vat_number: vatNumber || null,
        payment_methods_accepted: paymentMethods,
      },
      { onConflict: "transport_partner_id" }
    );

    setSaving(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bankAccountName" className="text-sm font-medium text-ink-800">
            Bank account name
          </label>
          <input
            id="bankAccountName"
            value={bankAccountName}
            onChange={(e) => setBankAccountName(e.target.value)}
            className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vatNumber" className="text-sm font-medium text-ink-800">
            VAT number
          </label>
          <input
            id="vatNumber"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            placeholder="e.g. GB123456789"
            className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bankSortCode" className="text-sm font-medium text-ink-800">
            Sort code
          </label>
          <input
            id="bankSortCode"
            value={bankSortCode}
            onChange={(e) => setBankSortCode(e.target.value)}
            placeholder="00-00-00"
            className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bankAccountNumber" className="text-sm font-medium text-ink-800">
            Account number
          </label>
          <input
            id="bankAccountNumber"
            value={bankAccountNumber}
            onChange={(e) => setBankAccountNumber(e.target.value)}
            placeholder="00000000"
            className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-800">Payment methods accepted</span>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((method) => (
            <label
              key={method}
              className="flex items-center gap-2 rounded-full border border-brand-100 px-3.5 py-1.5 text-sm text-ink-800"
            >
              <input
                type="checkbox"
                checked={paymentMethods.includes(method)}
                onChange={() => toggleMethod(method)}
                className="h-4 w-4 accent-brand-600"
              />
              {method}
            </label>
          ))}
        </div>
      </div>

      <p className="text-xs text-ink-700">
        Bank details are only visible to you and Movers Now — used for payouts once
        invoicing is switched on (see the Payments page).
      </p>

      {error && (
        <p role="alert" className="text-sm font-medium text-coral-600">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="text-sm font-medium text-mint-600">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save payment details"}
      </button>
    </form>
  );
}
