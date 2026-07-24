"use client";

import { isRoomSizedCategory, type ItemSizeTier } from "@/lib/pricing/estimate-quote";
import type { QuoteCategory, QuoteItemDetails } from "@/lib/quote/quote-state";

const ROOM_OPTIONS = [1, 2, 3, 4, 5, 6];

const ITEM_SIZE_OPTIONS: { value: ItemSizeTier; label: string; hint: string }[] = [
  { value: "small", label: "Small", hint: "e.g. a chair, boxes, a bike" },
  { value: "medium", label: "Medium", hint: "e.g. a sofa, a wardrobe, a fridge" },
  { value: "large", label: "Large", hint: "e.g. a car, a piano, multiple large items" },
];

// Deliberately not a full inventory tool — just enough category-appropriate
// detail to size the job for the estimate.
export function DetailsStep({
  category,
  value,
  onChange,
}: {
  category: QuoteCategory;
  value: QuoteItemDetails;
  onChange: (patch: QuoteItemDetails) => void;
}) {
  if (isRoomSizedCategory(category)) {
    return (
      <fieldset>
        <legend className="font-heading text-xl font-bold text-ink-900">
          How many rooms?
        </legend>
        <p className="mt-1 text-sm text-ink-700">
          A rough count is fine — this only affects the estimate, not the final price.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {ROOM_OPTIONS.map((rooms) => {
            const isSelected = (value.roomCount ?? 1) === rooms;
            return (
              <button
                key={rooms}
                type="button"
                onClick={() => onChange({ ...value, roomCount: rooms })}
                aria-pressed={isSelected}
                className={`rounded-xl border py-4 text-sm font-semibold transition-colors ${
                  isSelected
                    ? "border-brand-500 bg-brand-50/60 text-brand-700 ring-1 ring-brand-500"
                    : "border-brand-100 bg-white text-ink-800 hover:border-brand-300"
                }`}
              >
                {rooms}
                {rooms === 6 ? "+" : ""}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset>
      <legend className="font-heading text-xl font-bold text-ink-900">
        How big is it?
      </legend>
      <p className="mt-1 text-sm text-ink-700">Pick the closest size — this only affects the estimate.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {ITEM_SIZE_OPTIONS.map((option) => {
          const isSelected = (value.itemSizeTier ?? "medium") === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ ...value, itemSizeTier: option.value })}
              aria-pressed={isSelected}
              className={`rounded-xl border p-4 text-left transition-colors ${
                isSelected
                  ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500"
                  : "border-brand-100 bg-white hover:border-brand-300"
              }`}
            >
              <p className="font-heading text-sm font-bold text-ink-900">{option.label}</p>
              <p className="mt-0.5 text-xs text-ink-700">{option.hint}</p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
