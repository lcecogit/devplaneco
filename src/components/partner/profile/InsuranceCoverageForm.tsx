"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function InsuranceCoverageForm({
  transportPartnerId,
  goodsInTransitCoverAmount,
  cmrCoverAmount,
}: {
  transportPartnerId: string;
  goodsInTransitCoverAmount: number | null;
  cmrCoverAmount: number | null;
}) {
  const router = useRouter();
  const [goodsInTransit, setGoodsInTransit] = useState(
    goodsInTransitCoverAmount != null ? String(goodsInTransitCoverAmount) : ""
  );
  const [cmr, setCmr] = useState(cmrCoverAmount != null ? String(cmrCoverAmount) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("transport_partners")
      .update({
        goods_in_transit_cover_amount: goodsInTransit ? Number(goodsInTransit) : null,
        cmr_cover_amount: cmr ? Number(cmr) : null,
      })
      .eq("id", transportPartnerId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="goodsInTransitCover" className="text-sm font-medium text-ink-800">
            Goods in transit cover (£)
          </label>
          <input
            id="goodsInTransitCover"
            type="number"
            min="0"
            step="1000"
            value={goodsInTransit}
            onChange={(e) => setGoodsInTransit(e.target.value)}
            placeholder="e.g. 50000"
            className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cmrCover" className="text-sm font-medium text-ink-800">
            CMR cover (£)
          </label>
          <input
            id="cmrCover"
            type="number"
            min="0"
            step="1000"
            value={cmr}
            onChange={(e) => setCmr(e.target.value)}
            placeholder="e.g. 100000"
            className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-coral-600">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="text-xs font-medium text-mint-600">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-full border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save cover amounts"}
      </button>
    </form>
  );
}
