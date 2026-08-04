"use client";

import { useEffect, useRef, useState } from "react";
import { QuantityStepper } from "@/components/quote/QuantityStepper";
import type { QuoteItem } from "@/lib/quote/types";

// "Add your own item" — for anything not in the catalogue.
//
// Dimensions and weight take a unit dropdown because people genuinely think
// in different units for different things (a sofa in cm, a shed in metres, a
// TV in inches). We convert to cm/kg on submit so everything downstream — the
// volume total, the pricing engine, quote_items — only ever sees one unit.

const LENGTH_UNITS = {
  cm: { label: "CM", toCm: 1 },
  m: { label: "M", toCm: 100 },
  in: { label: "IN", toCm: 2.54 },
} as const;

const WEIGHT_UNITS = {
  kg: { label: "KG", toKg: 1 },
  lb: { label: "LB", toKg: 0.453592 },
} as const;

type LengthUnit = keyof typeof LENGTH_UNITS;
type WeightUnit = keyof typeof WEIGHT_UNITS;

type Props = {
  /** Prefills the name from whatever the visitor typed into the search box. */
  initialName?: string;
  /** Set when editing an existing line rather than adding a new one. */
  editing?: QuoteItem | null;
  onClose: () => void;
  onSubmit: (item: Omit<QuoteItem, "key">) => void;
};

export function CustomItemModal({ initialName = "", editing = null, onClose, onSubmit }: Props) {
  const [name, setName] = useState(editing?.name ?? initialName);
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
  const [length, setLength] = useState(editing?.lengthCm ? String(editing.lengthCm) : "");
  const [width, setWidth] = useState(editing?.widthCm ? String(editing.widthCm) : "");
  const [height, setHeight] = useState(editing?.heightCm ? String(editing.heightCm) : "");
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>("cm");
  const [weight, setWeight] = useState(editing?.weightKg ? String(editing.weightKg) : "");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Give the item a name so the driver knows what to expect.");
      return;
    }

    const toCm = LENGTH_UNITS[lengthUnit].toCm;
    const lengthCm = parseFloat(length) * toCm;
    const widthCm = parseFloat(width) * toCm;
    const heightCm = parseFloat(height) * toCm;

    if (![lengthCm, widthCm, heightCm].every((n) => Number.isFinite(n) && n > 0)) {
      setError("Enter an estimated length, width and height — a rough guess is fine.");
      return;
    }

    const weightValue = parseFloat(weight);
    const weightKg = Number.isFinite(weightValue)
      ? weightValue * WEIGHT_UNITS[weightUnit].toKg
      : null;

    onSubmit({
      catalogueItemId: null,
      name: trimmedName,
      quantity,
      lengthCm: round(lengthCm),
      widthCm: round(widthCm),
      heightCm: round(heightCm),
      weightKg: weightKg === null ? null : round(weightKg),
      // Same bounding-box volume the catalogue uses, so a custom item and a
      // catalogue item of the same size price identically.
      volumeM3: Math.round((lengthCm * widthCm * heightCm) / 1_000_000 * 1000) / 1000,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4"
      onMouseDown={(event) => {
        if (!dialogRef.current?.contains(event.target as Node)) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-item-title"
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h3 id="custom-item-title" className="font-heading text-xl font-bold text-ink-900">
          {editing ? "Edit item" : "Add your own item"}
        </h3>
        <p className="mt-1 text-sm text-ink-700">
          Rough estimates are fine — we just need enough to size the van.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label htmlFor="custom-name" className="block text-sm font-semibold text-ink-900">
              Item name
            </label>
            <input
              id="custom-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Exercise bike"
              className="mt-1.5 w-full rounded-xl border border-brand-200 px-4 py-3 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-900">Quantity</span>
            <QuantityStepper value={quantity} onChange={setQuantity} label="quantity" />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-900">Estimated size</span>
              <label className="sr-only" htmlFor="custom-length-unit">
                Length unit
              </label>
              <select
                id="custom-length-unit"
                value={lengthUnit}
                onChange={(event) => setLengthUnit(event.target.value as LengthUnit)}
                className="rounded-lg border border-brand-200 px-2 py-1 text-xs font-semibold text-ink-900"
              >
                {Object.entries(LENGTH_UNITS).map(([value, unit]) => (
                  <option key={value} value={value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              <DimensionInput id="custom-length" label="Length" value={length} onChange={setLength} />
              <DimensionInput id="custom-width" label="Width" value={width} onChange={setWidth} />
              <DimensionInput id="custom-height" label="Height" value={height} onChange={setHeight} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="custom-weight" className="text-sm font-semibold text-ink-900">
                Estimated weight <span className="font-normal text-ink-700">(optional)</span>
              </label>
              <label className="sr-only" htmlFor="custom-weight-unit">
                Weight unit
              </label>
              <select
                id="custom-weight-unit"
                value={weightUnit}
                onChange={(event) => setWeightUnit(event.target.value as WeightUnit)}
                className="rounded-lg border border-brand-200 px-2 py-1 text-xs font-semibold text-ink-900"
              >
                {Object.entries(WEIGHT_UNITS).map(([value, unit]) => (
                  <option key={value} value={value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              id="custom-weight"
              type="number"
              inputMode="decimal"
              min="0"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-brand-200 px-4 py-3 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-coral-600">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-brand-300 px-6 py-3 text-sm font-semibold text-ink-700 hover:bg-brand-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function DimensionInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-ink-700">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-brand-200 px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
      />
    </div>
  );
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
