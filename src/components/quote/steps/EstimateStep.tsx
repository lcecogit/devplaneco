"use client";

import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";
import type { QuoteState } from "@/lib/quote/quote-state";

export function EstimateStep({ quote, loading }: { quote: QuoteState; loading: boolean }) {
  const category = SERVICE_CATEGORIES.find((service) => service.slug === quote.category);

  return (
    <div>
      <h2 className="font-heading text-xl font-bold text-ink-900">Your estimated price</h2>
      <p className="mt-1 text-sm text-ink-700">
        {category?.title} · {quote.collectionPostcode} → {quote.deliveryPostcode}
      </p>

      <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50/50 p-8 text-center">
        {loading || !quote.estimate ? (
          <p className="text-sm text-ink-700">Calculating your estimate…</p>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              Estimated price
            </p>
            <p className="mt-2 font-heading text-4xl font-extrabold text-ink-900">
              £{quote.estimate.priceGBP.toFixed(2)}
            </p>
            <p className="mt-3 text-sm text-ink-700">
              This is an estimate based on distance and job size — it is not a final
              locked-in price. Your real price is confirmed once a transport partner is
              matched to your job.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
