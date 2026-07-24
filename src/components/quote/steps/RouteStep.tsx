"use client";

import { FormField } from "@/components/ui/FormField";
import { TIME_WINDOW_OPTIONS, type QuoteState, type TimeWindow } from "@/lib/quote/quote-state";

// Controlled-input values only, so every field defaults to "" rather than
// undefined — the patches sent back via onChange still conform to QuoteState.
export type RouteStepValue = {
  collectionAddress: string;
  collectionPostcode: string;
  deliveryAddress: string;
  deliveryPostcode: string;
  preferredDate: string;
  timeWindow: TimeWindow | "";
};

export function RouteStep({
  value,
  onChange,
}: {
  value: RouteStepValue;
  onChange: (patch: Partial<QuoteState>) => void;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-ink-900">Collection & delivery</h2>
        <p className="mt-1 text-sm text-ink-700">Where should we collect from and deliver to?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Collection address"
          required
          value={value.collectionAddress}
          onChange={(e) => onChange({ collectionAddress: e.target.value })}
        />
        <FormField
          label="Collection postcode"
          required
          value={value.collectionPostcode}
          onChange={(e) => onChange({ collectionPostcode: e.target.value.toUpperCase() })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Delivery address"
          required
          value={value.deliveryAddress}
          onChange={(e) => onChange({ deliveryAddress: e.target.value })}
        />
        <FormField
          label="Delivery postcode"
          required
          value={value.deliveryPostcode}
          onChange={(e) => onChange({ deliveryPostcode: e.target.value.toUpperCase() })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Preferred date"
          type="date"
          required
          min={todayIso}
          value={value.preferredDate}
          onChange={(e) => onChange({ preferredDate: e.target.value })}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="timeWindow" className="text-sm font-medium text-ink-800">
            Preferred time window
          </label>
          <select
            id="timeWindow"
            required
            value={value.timeWindow}
            onChange={(e) => onChange({ timeWindow: e.target.value as TimeWindow })}
            className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
          >
            <option value="" disabled>
              Select…
            </option>
            {TIME_WINDOW_OPTIONS.map((window) => (
              <option key={window.value} value={window.value}>
                {window.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
