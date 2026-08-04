"use client";

// The "− 1 +" control used in the item list and the custom item modal.

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-brand-200 bg-white">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold text-ink-700 transition-colors hover:bg-brand-50 disabled:opacity-30"
      >
        −
      </button>
      <span aria-live="polite" className="w-8 text-center text-sm font-semibold text-ink-900">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold text-ink-700 transition-colors hover:bg-brand-50 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
