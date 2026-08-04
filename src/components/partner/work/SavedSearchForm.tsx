"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";

export function SavedSearchForm({ transportPartnerId }: { transportPartnerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [postcodeArea, setPostcodeArea] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleCategory(slug: string) {
    setCategories((prev) => (prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]));
  }

  async function save() {
    if (!name.trim()) {
      setError("Give this alert a name.");
      return;
    }

    setError(null);
    setSaving(true);
    const supabase = createClient();
    // saved_searches_insert already scopes this to the caller's own
    // transport_partner_id — no RPC needed for a plain create. `filters` is
    // a flexible jsonb blob (see migration 0038) rather than fixed columns,
    // every key optional and absence meaning "no filter on that dimension."
    const { error: insertError } = await supabase.from("saved_searches").insert({
      transport_partner_id: transportPartnerId,
      name: name.trim(),
      filters: {
        ...(categories.length ? { categories } : {}),
        ...(postcodeArea.trim() ? { postcodeArea: postcodeArea.trim() } : {}),
        ...(minPrice ? { minPrice: Number(minPrice) } : {}),
        ...(maxPrice ? { maxPrice: Number(maxPrice) } : {}),
      },
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setOpen(false);
    setName("");
    setCategories([]);
    setPostcodeArea("");
    setMinPrice("");
    setMaxPrice("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-600"
      >
        + New alert
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-5">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-800">
          Alert name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. London home removals"
            className="rounded-lg border border-brand-100 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-800">
            Categories <span className="font-normal text-ink-700">(leave blank for all)</span>
          </span>
          <div className="flex flex-wrap gap-3">
            {SERVICE_CATEGORIES.map((category) => (
              <label key={category.slug} className="flex items-center gap-1.5 text-sm text-ink-800">
                <input
                  type="checkbox"
                  checked={categories.includes(category.slug)}
                  onChange={() => toggleCategory(category.slug)}
                  className="accent-brand-600"
                />
                {category.title}
              </label>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-800">
          Postcode area <span className="font-normal text-ink-700">(e.g. SW — leave blank for anywhere)</span>
          <input
            value={postcodeArea}
            onChange={(e) => setPostcodeArea(e.target.value)}
            className="rounded-lg border border-brand-100 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500 sm:w-32"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-800">
            Minimum price (£)
            <input
              type="number"
              min={0}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="rounded-lg border border-brand-100 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-800">
            Maximum price (£)
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="rounded-lg border border-brand-100 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="text-xs font-medium text-coral-600">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={saving}
            className="rounded-full border border-brand-300 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-white disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save alert"}
          </button>
        </div>
      </div>
    </div>
  );
}
