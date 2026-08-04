"use client";

import { useId, useState, type Dispatch, type SetStateAction } from "react";
import { AddressLookup, resolvedFromStop } from "@/components/quote/AddressLookup";
import {
  FLOOR_OPTIONS,
  floorCanHaveLift,
  type FloorLevel,
  type QuoteStop,
} from "@/lib/quote/types";
import type { ResolvedAddress } from "@/lib/geo/postcodes";

// Step 1 — "Where are you moving from and to?"
//
// Stops are held as an ordered list even though the common case is exactly
// two: index 0 is always the pickup, the last index is always the delivery,
// and anything in between is an extra stop. That ordering is the same one
// quote_stops.sequence uses, so the list maps to the database 1:1.

export function newStop(): QuoteStop {
  return {
    // crypto.randomUUID is available in every browser this app supports and
    // this only ever runs client-side.
    key: crypto.randomUUID(),
    addressText: "",
    // Asked for at checkout, not here — see the caption below.
    addressLine: null,
    postcode: null,
    outcode: null,
    lat: null,
    lng: null,
    floor: "ground",
    hasLift: false,
  };
}

function stopRole(index: number, total: number): { title: string; caption: string } {
  if (index === 0) return { title: "Pickup", caption: "Where we're collecting from" };
  if (index === total - 1) return { title: "Delivery", caption: "Where we're delivering to" };
  return { title: `Extra stop ${index}`, caption: "An additional call on the way" };
}

type Props = {
  stops: QuoteStop[];
  /**
   * A setState, not a plain callback — the address field fires two patches in
   * the same tick (clear the resolved geo, then store the new text), and a
   * non-functional update would let the second one overwrite the first from a
   * stale closure.
   */
  onChange: Dispatch<SetStateAction<QuoteStop[]>>;
  onNext: () => void;
  submitting: boolean;
  error: string | null;
};

export function AddressStep({ stops, onChange, onNext, submitting, error }: Props) {
  const [touched, setTouched] = useState(false);
  // DOM ids are derived from useId + the stop's position, NOT from stop.key:
  // stop.key comes from crypto.randomUUID(), which produces different values
  // on the server and the client and so hydration-mismatches any id built
  // from it. React keys are fine (they never reach the DOM) — ids aren't.
  const fieldsetId = useId();

  function patchStop(index: number, patch: Partial<QuoteStop>) {
    onChange((current) =>
      current.map((stop, i) => (i === index ? { ...stop, ...patch } : stop))
    );
  }

  function applyResolved(index: number, address: ResolvedAddress | null) {
    // On a failed lookup, only the geo fields are cleared — the text the
    // visitor typed stays in the box so they can correct it.
    if (!address) {
      patchStop(index, { outcode: null, lat: null, lng: null, addressText: "" });
      return;
    }
    patchStop(index, {
      postcode: address.postcode,
      outcode: address.outcode,
      lat: address.lat,
      lng: address.lng,
      addressText: address.label,
    });
  }

  function addExtraStop() {
    // Inserted before the delivery stop, so delivery stays last.
    onChange((current) => {
      const next = [...current];
      next.splice(next.length - 1, 0, newStop());
      return next;
    });
  }

  const allResolved = stops.every((stop) => stop.lat !== null && stop.lng !== null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-ink-900">
          Where are you moving from and to?
        </h2>
        <p className="mt-1.5 text-sm text-ink-700">
          Enter a postcode for each address. We use it to work out the distance and the
          access at each end — we&apos;ll ask for the full address when you book.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {stops.map((stop, index) => {
          const role = stopRole(index, stops.length);
          const isExtra = index > 0 && index < stops.length - 1;
          const floorId = `${fieldsetId}-floor-${index}`;

          return (
            <fieldset
              key={stop.key}
              className="rounded-2xl border border-brand-100 bg-white p-5"
            >
              <legend className="flex w-full items-center justify-between gap-3 px-1">
                <span>
                  <span className="font-heading text-base font-bold text-ink-900">
                    {role.title}
                  </span>
                  <span className="ml-2 text-xs text-ink-700">{role.caption}</span>
                </span>
              </legend>

              {isExtra && (
                <div className="mb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onChange((current) => current.filter((_, i) => i !== index))}
                    className="text-xs font-semibold text-coral-600 underline underline-offset-2 hover:text-coral-700"
                  >
                    Remove this stop
                  </button>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <AddressLookup
                  label="Postcode"
                  value={stop.postcode ?? stop.addressText}
                  resolved={resolvedFromStop(stop)}
                  onChange={(value) => patchStop(index, { postcode: value })}
                  onResolved={(address) => applyResolved(index, address)}
                />

                <div>
                  <label
                    htmlFor={floorId}
                    className="block text-sm font-semibold text-ink-900"
                  >
                    Floor
                  </label>
                  <select
                    id={floorId}
                    value={stop.floor}
                    onChange={(event) => {
                      const floor = event.target.value as FloorLevel;
                      // Clearing hasLift alongside the floor change is what
                      // makes the checkbox visibly appear/disappear without
                      // leaving a stale ticked value behind it.
                      patchStop(index, {
                        floor,
                        hasLift: floorCanHaveLift(floor) ? stop.hasLift : false,
                      });
                    }}
                    className="mt-1.5 w-full rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  >
                    {FLOOR_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {floorCanHaveLift(stop.floor) && (
                    <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-ink-900">
                      <input
                        type="checkbox"
                        checked={stop.hasLift}
                        onChange={(event) => patchStop(index, { hasLift: event.target.checked })}
                        className="h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-400"
                      />
                      Lift available
                    </label>
                  )}
                </div>
              </div>
            </fieldset>
          );
        })}
      </div>

      <div>
        <button
          type="button"
          onClick={addExtraStop}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            +
          </span>
          Add an extra stop
        </button>
      </div>

      {touched && !allResolved && (
        <p role="alert" className="text-sm font-medium text-coral-600">
          Please enter a valid postcode for every address.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-coral-600">
          {error}
        </p>
      )}

      {/* No Back button on step 1 — there's nothing behind it. */}
      <div className="flex justify-end border-t border-brand-100 pt-6">
        <button
          type="button"
          onClick={() => {
            setTouched(true);
            if (allResolved) onNext();
          }}
          disabled={submitting}
          className="rounded-full bg-coral-500 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Next Step"}
        </button>
      </div>
    </div>
  );
}
