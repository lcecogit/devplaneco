"use client";

import { useMemo, useState } from "react";
import { CustomItemModal } from "@/components/quote/CustomItemModal";
import { ItemList } from "@/components/quote/ItemList";
import {
  ITEM_CATEGORIES,
  type CatalogueItem,
  type ItemCategory,
  type QuoteItem,
} from "@/lib/quote/types";

// Step 2 — "What are you moving?"
//
// Three ways in, all writing to the same item list: the typeahead search, the
// 3x3 category tiles, and the custom item modal. The catalogue is loaded once
// by the parent and passed down, so searching and browsing are pure
// client-side filtering with no per-keystroke network cost.

/** Boxes & Bags shows dimensions as subtext — the names alone are ambiguous. */
const SHOW_DIMENSIONS_FOR: ItemCategory = "boxes_bags";

function dimensionLabel(item: CatalogueItem): string {
  return `${item.lengthCm}x${item.widthCm}x${item.heightCm}cm`;
}

function matches(item: CatalogueItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;
  if (item.name.toLowerCase().includes(needle)) return true;
  return item.searchTerms.some((term) => term.toLowerCase().includes(needle));
}

type Props = {
  catalogue: CatalogueItem[];
  catalogueError: string | null;
  items: QuoteItem[];
  onChange: (items: QuoteItem[]) => void;
  onBack: () => void;
  onNext: () => void;
  submitting: boolean;
  error: string | null;
};

export function ItemsStep({
  catalogue,
  catalogueError,
  items,
  onChange,
  onBack,
  onNext,
  submitting,
  error,
}: Props) {
  const [query, setQuery] = useState("");
  const [openCategory, setOpenCategory] = useState<ItemCategory | null>(null);
  const [customModal, setCustomModal] = useState<
    { mode: "add"; initialName: string } | { mode: "edit"; item: QuoteItem } | null
  >(null);

  const results = useMemo(
    () => (query.trim() ? catalogue.filter((item) => matches(item, query)).slice(0, 8) : []),
    [catalogue, query]
  );

  const byCategory = useMemo(() => {
    const map = new Map<ItemCategory, CatalogueItem[]>();
    for (const item of catalogue) {
      const existing = map.get(item.category);
      if (existing) existing.push(item);
      else map.set(item.category, [item]);
    }
    return map;
  }, [catalogue]);

  /** Adding the same catalogue item twice bumps its quantity instead of duplicating the row. */
  function addCatalogueItem(item: CatalogueItem) {
    const existing = items.find((line) => line.catalogueItemId === item.id);
    if (existing) {
      onChange(
        items.map((line) =>
          line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line
        )
      );
      return;
    }

    onChange([
      ...items,
      {
        key: crypto.randomUUID(),
        catalogueItemId: item.id,
        name: item.name,
        quantity: 1,
        lengthCm: item.lengthCm,
        widthCm: item.widthCm,
        heightCm: item.heightCm,
        weightKg: item.weightKg,
        volumeM3: item.volumeM3,
      },
    ]);
  }

  function handleCustomSubmit(payload: Omit<QuoteItem, "key">) {
    if (customModal?.mode === "edit") {
      const key = customModal.item.key;
      onChange(items.map((line) => (line.key === key ? { ...payload, key } : line)));
    } else {
      onChange([...items, { ...payload, key: crypto.randomUUID() }]);
      setQuery("");
    }
    setCustomModal(null);
  }

  const hasItems = items.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-ink-900">What are you moving?</h2>
        <p className="mt-1.5 text-sm text-ink-700">
          Search for your items or browse by category. Add everything you want moved —
          the more accurate the list, the more accurate the price.
        </p>
      </div>

      {catalogueError && (
        <p role="alert" className="rounded-xl bg-coral-50 p-4 text-sm font-medium text-coral-700">
          {catalogueError}
        </p>
      )}

      {/* Search ------------------------------------------------------ */}
      <div>
        <label htmlFor="item-search" className="sr-only">
          Search for an item
        </label>
        <input
          id="item-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for an item (e.g. sofa, box, washing machine)"
          className="w-full rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />

        {query.trim() && (
          <div className="mt-2 overflow-hidden rounded-xl border border-brand-200 bg-white">
            {results.length > 0 && (
              <ul className="divide-y divide-brand-100">
                {results.map((item) => (
                  <li key={item.id}>
                    <ItemRow
                      name={item.name}
                      subtext={
                        item.category === SHOW_DIMENSIONS_FOR ? dimensionLabel(item) : null
                      }
                      onAdd={() => addCatalogueItem(item)}
                    />
                  </li>
                ))}
              </ul>
            )}

            {/* Always offered, even when there are matches — the visitor's
                item may just be shaped differently from the catalogue one. */}
            <div className="border-t border-brand-100 bg-brand-50/50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">
                Custom items
              </p>
              <button
                type="button"
                onClick={() => setCustomModal({ mode: "add", initialName: query.trim() })}
                className="mt-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                {query.trim()} <span className="font-normal">(enter dimensions)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category tiles ---------------------------------------------- */}
      <div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ITEM_CATEGORIES.map((category) => (
            <button
              key={category.value}
              type="button"
              aria-expanded={openCategory === category.value}
              onClick={() =>
                setOpenCategory((current) =>
                  current === category.value ? null : category.value
                )
              }
              className={`rounded-2xl border px-4 py-5 text-center text-sm font-semibold transition-colors ${
                openCategory === category.value
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-brand-100 bg-white text-ink-900 hover:border-brand-300 hover:bg-brand-50/50"
              }`}
            >
              {category.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setCustomModal({ mode: "add", initialName: "" })}
            className="rounded-2xl border border-dashed border-brand-300 bg-white px-4 py-5 text-center text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50"
          >
            + Add your own item
          </button>
        </div>

        {openCategory && (
          <div className="mt-3 rounded-2xl border border-brand-200 bg-white p-1">
            <ul className="divide-y divide-brand-100">
              {(byCategory.get(openCategory) ?? []).map((item) => (
                <li key={item.id}>
                  <ItemRow
                    name={item.name}
                    subtext={openCategory === SHOW_DIMENSIONS_FOR ? dimensionLabel(item) : null}
                    onAdd={() => addCatalogueItem(item)}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Item list --------------------------------------------------- */}
      <ItemList
        items={items}
        onQuantityChange={(key, quantity) =>
          onChange(items.map((line) => (line.key === key ? { ...line, quantity } : line)))
        }
        onEdit={(item) => setCustomModal({ mode: "edit", item })}
        onRemove={(key) => onChange(items.filter((line) => line.key !== key))}
      />

      {error && (
        <p role="alert" className="text-sm font-medium text-coral-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-brand-100 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-brand-300 px-6 py-3 text-sm font-semibold text-ink-700 hover:bg-brand-50"
        >
          Back
        </button>

        <div className="flex items-center gap-3">
          {!hasItems && (
            <span className="text-xs text-ink-700">Add at least one item to see prices</span>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={!hasItems || submitting}
            className="rounded-full bg-coral-500 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:bg-brand-100 disabled:text-ink-700"
          >
            {submitting ? "Pricing…" : "Get Prices"}
          </button>
        </div>
      </div>

      {customModal && (
        <CustomItemModal
          initialName={customModal.mode === "add" ? customModal.initialName : ""}
          editing={customModal.mode === "edit" ? customModal.item : null}
          onClose={() => setCustomModal(null)}
          onSubmit={handleCustomSubmit}
        />
      )}
    </div>
  );
}

function ItemRow({
  name,
  subtext,
  onAdd,
}: {
  name: string;
  subtext: string | null;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm text-ink-900">{name}</p>
        {subtext && <p className="text-xs text-ink-700">{subtext}</p>}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="shrink-0 rounded-full border border-brand-300 px-3 py-1 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50"
      >
        + add
      </button>
    </div>
  );
}
