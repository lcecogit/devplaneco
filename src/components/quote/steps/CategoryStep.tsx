"use client";

import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";
import type { QuoteCategory } from "@/lib/quote/quote-state";

export function CategoryStep({
  selected,
  onSelect,
}: {
  selected?: QuoteCategory;
  onSelect: (category: QuoteCategory) => void;
}) {
  return (
    <fieldset>
      <legend className="font-heading text-xl font-bold text-ink-900">
        What are you moving?
      </legend>
      <p className="mt-1 text-sm text-ink-700">Choose the option that best matches your job.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {SERVICE_CATEGORIES.map((service) => {
          const isSelected = selected === service.slug;
          return (
            <button
              key={service.slug}
              type="button"
              onClick={() => onSelect(service.slug as QuoteCategory)}
              aria-pressed={isSelected}
              className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${
                isSelected
                  ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500"
                  : "border-brand-100 bg-white hover:border-brand-300"
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  isSelected ? "bg-brand-600 text-white" : "bg-mint-50 text-mint-600"
                }`}
              >
                <service.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-heading text-sm font-bold text-ink-900">{service.title}</p>
                <p className="mt-0.5 text-xs text-ink-700">{service.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
