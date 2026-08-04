"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  DEBOUNCE_MS,
  MIN_QUERY_LENGTH,
  lookupPostcode,
  suggestPostcodes,
  type ResolvedAddress,
} from "@/lib/geo/postcodes";

// Postcode typeahead backed by postcodes.io.
//
// Request discipline lives partly here and partly in lib/geo/postcodes.ts:
// this component debounces keystrokes by DEBOUNCE_MS and won't fire below
// MIN_QUERY_LENGTH; the module caches and dedupes everything it does send.

type Props = {
  label: string;
  value: string;
  resolved: ResolvedAddress | null;
  onChange: (value: string) => void;
  onResolved: (address: ResolvedAddress | null) => void;
  placeholder?: string;
};

export function AddressLookup({ label, value, resolved, onChange, onResolved, placeholder }: Props) {
  const inputId = useId();
  const listboxId = `${inputId}-suggestions`;
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Guards against a slow response for an old query overwriting a newer one.
  const requestSeq = useRef(0);

  const trimmed = value.trim();

  useEffect(() => {
    if (resolved && trimmed.toUpperCase() === resolved.postcode.toUpperCase()) {
      setSuggestions([]);
      return;
    }
    if (trimmed.replace(/\s+/g, "").length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setNotFound(false);
      return;
    }

    const seq = ++requestSeq.current;
    const timer = window.setTimeout(async () => {
      const results = await suggestPostcodes(trimmed);
      if (seq !== requestSeq.current) return;
      setSuggestions(results.slice(0, 6));
      setOpen(results.length > 0);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [trimmed, resolved]);

  // Close the suggestion list on an outside click, the way a native
  // combobox would.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function resolve(candidate: string) {
    const seq = ++requestSeq.current;
    setChecking(true);
    setOpen(false);
    const address = await lookupPostcode(candidate);
    if (seq !== requestSeq.current) return;
    setChecking(false);
    setNotFound(address === null);
    // Only onResolved — it owns the postcode field too. Calling onChange as
    // well would be a second patch in the same tick against the same state.
    onResolved(address);
  }

  const showCheck = Boolean(resolved) && !checking;

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className="block text-sm font-semibold text-ink-900">
        {label}
      </label>

      <div className="relative mt-1.5">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          value={value}
          placeholder={placeholder ?? "Enter a postcode"}
          onChange={(event) => {
            onChange(event.target.value);
            setNotFound(false);
            if (resolved) onResolved(null);
          }}
          onBlur={() => {
            // Resolve on blur so a visitor who types a full postcode and tabs
            // away still gets it validated without picking from the list.
            if (!resolved && trimmed.length >= MIN_QUERY_LENGTH) void resolve(trimmed);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void resolve(suggestions[0] ?? trimmed);
            }
            if (event.key === "Escape") setOpen(false);
          }}
          className="w-full rounded-xl border border-brand-200 bg-white px-4 py-3 pr-11 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />

        {showCheck && (
          <span
            aria-hidden="true"
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-mint-500 text-white"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}

        {checking && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-700">
            Checking…
          </span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-brand-200 bg-white shadow-lg"
        >
          {suggestions.map((suggestion) => (
            <li key={suggestion} role="option" aria-selected="false">
              <button
                type="button"
                // onMouseDown, not onClick — the input's onBlur fires first
                // on a click and would resolve the half-typed text instead.
                onMouseDown={(event) => {
                  event.preventDefault();
                  void resolve(suggestion);
                }}
                className="block w-full px-4 py-2.5 text-left text-sm text-ink-900 hover:bg-brand-50"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}

      {resolved && (
        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-mint-600">
          {resolved.label}
        </p>
      )}

      {notFound && !resolved && (
        <p role="alert" className="mt-1.5 text-sm text-coral-600">
          We couldn&apos;t find that postcode. Check it and try again — or enter just the
          first part (e.g. &ldquo;M1&rdquo;).
        </p>
      )}
    </div>
  );
}

/** Rehydrates a stored stop back into the shape this component expects. */
export function resolvedFromStop(stop: {
  postcode: string | null;
  outcode: string | null;
  lat: number | null;
  lng: number | null;
  addressText: string;
}): ResolvedAddress | null {
  if (!stop.postcode || stop.lat === null || stop.lng === null) return null;
  return {
    postcode: stop.postcode,
    outcode: stop.outcode ?? stop.postcode,
    lat: stop.lat,
    lng: stop.lng,
    label: stop.addressText || stop.postcode,
    adminDistrict: null,
    region: null,
  };
}
