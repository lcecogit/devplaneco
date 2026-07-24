"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";
import { TIME_WINDOW_OPTIONS, type BookableQuote } from "@/lib/quote/quote-state";
import { isRoomSizedCategory } from "@/lib/pricing/estimate-quote";

function buildWindowTimestamps(preferredDate: string, timeWindow: BookableQuote["timeWindow"]) {
  const option = TIME_WINDOW_OPTIONS.find((w) => w.value === timeWindow) ?? TIME_WINDOW_OPTIONS[3];
  const start = new Date(`${preferredDate}T00:00:00`);
  const end = new Date(`${preferredDate}T00:00:00`);
  start.setHours(option.startHour, 0, 0, 0);
  end.setHours(option.endHour, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function ConfirmStep({
  quote,
  customerId,
  onBack,
  onBooked,
}: {
  quote: BookableQuote;
  customerId: string;
  onBack: () => void;
  onBooked: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category = SERVICE_CATEGORIES.find((service) => service.slug === quote.category);

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);

    const { start, end } = buildWindowTimestamps(quote.preferredDate, quote.timeWindow);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("jobs").insert({
      customer_id: customerId,
      title: `${category?.title ?? "Move"} — ${quote.collectionPostcode} to ${quote.deliveryPostcode}`,
      work_type: "single",
      category: quote.category,
      collection_address: quote.collectionAddress || null,
      collection_postcode: quote.collectionPostcode,
      collection_window_start: start,
      collection_window_end: end,
      delivery_address: quote.deliveryAddress || null,
      delivery_postcode: quote.deliveryPostcode,
      // Same-visit assumption for a first booking flow: local man-and-van
      // style jobs collect and deliver within one scheduled window. Longer
      // multi-day journeys aren't modelled yet.
      delivery_window_start: start,
      delivery_window_end: end,
      distance_miles: quote.estimate.distanceMiles,
      customer_price: quote.estimate.priceGBP,
      matching_status: "listed",
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onBooked();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-ink-900">Confirm your booking</h2>
        <p className="mt-1 text-sm text-ink-700">
          Check the details below, then confirm to send this job out for matching.
        </p>
      </div>

      <dl className="grid gap-x-6 gap-y-3 rounded-2xl border border-brand-100 bg-white p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-700">Service</dt>
          <dd className="font-semibold text-ink-900">{category?.title}</dd>
        </div>
        <div>
          <dt className="text-ink-700">Size</dt>
          <dd className="font-semibold text-ink-900">
            {isRoomSizedCategory(quote.category)
              ? `${quote.itemDetails?.roomCount ?? 1} room(s)`
              : `${quote.itemDetails?.itemSizeTier ?? "medium"} item`}
          </dd>
        </div>
        <div>
          <dt className="text-ink-700">Collection</dt>
          <dd className="font-semibold text-ink-900">
            {quote.collectionAddress ? `${quote.collectionAddress}, ` : ""}
            {quote.collectionPostcode}
          </dd>
        </div>
        <div>
          <dt className="text-ink-700">Delivery</dt>
          <dd className="font-semibold text-ink-900">
            {quote.deliveryAddress ? `${quote.deliveryAddress}, ` : ""}
            {quote.deliveryPostcode}
          </dd>
        </div>
        <div>
          <dt className="text-ink-700">Date</dt>
          <dd className="font-semibold text-ink-900">
            {new Date(`${quote.preferredDate}T00:00:00`).toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </dd>
        </div>
        <div>
          <dt className="text-ink-700">Time window</dt>
          <dd className="font-semibold text-ink-900">
            {TIME_WINDOW_OPTIONS.find((w) => w.value === quote.timeWindow)?.label}
          </dd>
        </div>
      </dl>

      <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Estimated price
        </p>
        <p className="mt-1 font-heading text-3xl font-extrabold text-ink-900">
          £{quote.estimate.priceGBP.toFixed(2)}
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-brand-300 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">
          Payment — coming soon
        </p>
        <p className="mt-2 text-sm text-ink-700">
          We&apos;re not taking payment yet. Confirming below books your job and sends it
          out for matching with a transport partner — you&apos;ll be asked to pay once
          that&apos;s wired up.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-coral-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded-full border border-brand-300 px-6 py-3 text-sm font-semibold text-ink-700 hover:bg-brand-50 disabled:opacity-60"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className="flex-1 rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-60"
        >
          {submitting ? "Confirming…" : "Confirm booking"}
        </button>
      </div>
    </div>
  );
}
