"use client";

import { QuantityStepper } from "@/components/quote/QuantityStepper";
import { totalItemCount, totalVolumeM3, type QuoteItem } from "@/lib/quote/types";

// "My Item List" — appears once at least one item has been added.

export function ItemList({
  items,
  onQuantityChange,
  onEdit,
  onRemove,
}: {
  items: QuoteItem[];
  onQuantityChange: (key: string, quantity: number) => void;
  onEdit: (item: QuoteItem) => void;
  onRemove: (key: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-heading text-base font-bold text-ink-900">
          My Item List ({totalItemCount(items)})
        </h3>
        <span className="text-xs font-semibold text-ink-700">
          {totalVolumeM3(items).toFixed(2)} m³
        </span>
      </div>

      <ul className="mt-3 divide-y divide-brand-100">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">{item.name}</p>
              <p className="text-xs text-ink-700">
                {(item.volumeM3 * item.quantity).toFixed(2)} m³
                {item.catalogueItemId === null && " · custom item"}
              </p>
            </div>

            <QuantityStepper
              value={item.quantity}
              onChange={(quantity) => onQuantityChange(item.key, quantity)}
              label={`quantity of ${item.name}`}
            />

            <button
              type="button"
              onClick={() => onEdit(item)}
              className="text-xs font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700"
            >
              Edit
            </button>
            <button
              type="button"
              aria-label={`Remove ${item.name}`}
              onClick={() => onRemove(item.key)}
              className="text-lg leading-none text-ink-700 hover:text-coral-600"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
