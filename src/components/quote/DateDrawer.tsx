"use client";

import { useEffect, useState } from "react";
import { TimeWindowSlider } from "@/components/quote/TimeWindowSlider";
import {
  FULL_DAY_WINDOW,
  helperCharge,
  isFullDayWindow,
  windowSurcharge,
  type CrewSize,
  type PriceBreakdown,
} from "@/lib/pricing/calculate-price";
import { formatWindow, type TimeWindow } from "@/lib/quote/types";

// The side drawer that opens when a calendar date is clicked. Everything in
// here re-prices live — the total at the bottom is recomputed by the parent
// on every change, not on close.

export type DrawerSelection = {
  collectionWindow: TimeWindow;
  deliveryWindow: TimeWindow;
  helperIncluded: boolean;
};

export function DateDrawer({
  date,
  crewSize,
  totalVolumeM3,
  selection,
  breakdown,
  onChange,
  onClose,
  onProceed,
  proceeding,
}: {
  date: string;
  crewSize: CrewSize;
  totalVolumeM3: number;
  selection: DrawerSelection;
  breakdown: PriceBreakdown;
  onChange: (selection: DrawerSelection) => void;
  onClose: () => void;
  onProceed: () => void;
  proceeding: boolean;
}) {
  const [windowsExpanded, setWindowsExpanded] = useState(
    !isFullDayWindow(selection.collectionWindow) || !isFullDayWindow(selection.deliveryWindow)
  );
  const [activeTab, setActiveTab] = useState<"collection" | "delivery">("collection");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const helperDelta = helperCharge(totalVolumeM3);
  const bothFullDay =
    isFullDayWindow(selection.collectionWindow) && isFullDayWindow(selection.deliveryWindow);

  const heading = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-900/50" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Options for ${heading}`}
        onMouseDown={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-brand-100 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              Your move date
            </p>
            <h2 className="mt-1 font-heading text-xl font-bold text-ink-900">{heading}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full border border-brand-200 px-3 py-1 text-lg leading-none text-ink-700 hover:bg-brand-50"
          >
            ×
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-5">
          {/* Time windows ------------------------------------------- */}
          <section>
            <h3 className="font-heading text-base font-bold text-ink-900">Time slot</h3>

            {!windowsExpanded ? (
              <div className="mt-2 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
                <p className="text-sm font-semibold text-ink-900">
                  {formatWindow(selection.collectionWindow)}
                </p>
                <p className="mt-0.5 text-xs text-ink-700">
                  Full working day — no extra charge.
                </p>
                <button
                  type="button"
                  onClick={() => setWindowsExpanded(true)}
                  className="mt-2 text-sm font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700"
                >
                  Change your time slot
                </button>
              </div>
            ) : (
              <div className="mt-2 rounded-2xl border border-brand-100 p-4">
                <div
                  role="tablist"
                  aria-label="Which window to change"
                  className="flex gap-1 rounded-full bg-brand-50 p-1"
                >
                  {(["collection", "delivery"] as const).map((tab) => (
                    <button
                      key={tab}
                      role="tab"
                      type="button"
                      aria-selected={activeTab === tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold capitalize transition-colors ${
                        activeTab === tab
                          ? "bg-white text-ink-900 shadow-sm"
                          : "text-ink-700 hover:text-ink-900"
                      }`}
                    >
                      {tab} window
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  {activeTab === "collection" ? (
                    <TimeWindowSlider
                      label="Collection window"
                      window={selection.collectionWindow}
                      surchargeGBP={windowSurcharge(selection.collectionWindow)}
                      onChange={(collectionWindow) => onChange({ ...selection, collectionWindow })}
                    />
                  ) : (
                    <TimeWindowSlider
                      label="Delivery window"
                      window={selection.deliveryWindow}
                      surchargeGBP={windowSurcharge(selection.deliveryWindow)}
                      onChange={(deliveryWindow) => onChange({ ...selection, deliveryWindow })}
                    />
                  )}
                </div>

                {!bothFullDay && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...selection,
                        collectionWindow: FULL_DAY_WINDOW,
                        deliveryWindow: FULL_DAY_WINDOW,
                      })
                    }
                    className="mt-4 text-xs font-semibold text-ink-700 underline underline-offset-2 hover:text-ink-900"
                  >
                    Go back to the free full-day window
                  </button>
                )}
              </div>
            )}

            <p className="mt-3 rounded-xl bg-brand-50/60 p-3 text-xs leading-relaxed text-ink-700">
              We&apos;ll confirm a narrower collection window with you the day before your
              move, and you can track your driver live on the day.
            </p>
          </section>

          {/* Helper --------------------------------------------------- */}
          <section>
            <h3 className="font-heading text-base font-bold text-ink-900">
              Help loading &amp; unloading
            </h3>
            <p className="mt-1 text-xs text-ink-700">
              {crewSize === 2
                ? "Your 2-person crew includes a second pair of hands. Drop it if you'd rather load yourself."
                : "The driver always drives. Add a helper if you'd rather not carry things yourself."}
            </p>

            {/* The price delta is shown on whichever option ISN'T selected —
                that's the number the visitor needs to decide. It's the same
                magnitude on both crew tabs: on a 1-person booking adding a
                helper is +£X, on a 2-person booking dropping them is −£X. */}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <HelperOption
                title="Just the driver"
                selected={!selection.helperIncluded}
                delta={selection.helperIncluded ? -helperDelta : null}
                onSelect={() => onChange({ ...selection, helperIncluded: false })}
              />
              <HelperOption
                title="Add a helper"
                selected={selection.helperIncluded}
                delta={selection.helperIncluded ? null : helperDelta}
                onSelect={() => onChange({ ...selection, helperIncluded: true })}
              />
            </div>
          </section>
        </div>

        {/* Live total ------------------------------------------------- */}
        <footer className="sticky bottom-0 border-t border-brand-100 bg-white p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-ink-700">Total price</span>
            <span aria-live="polite" className="font-heading text-3xl font-extrabold text-ink-900">
              £{breakdown.totalGBP}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-700">
            {crewSize} {crewSize === 1 ? "person" : "people"} ·{" "}
            {formatWindow(selection.collectionWindow)} collection
            {breakdown.accessGBP > 0 && ` · includes £${breakdown.accessGBP.toFixed(2)} access charge`}
          </p>

          <button
            type="button"
            onClick={onProceed}
            disabled={proceeding}
            className="mt-4 w-full rounded-full bg-coral-500 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-60"
          >
            {proceeding ? "Saving…" : "Proceed & Book"}
          </button>
        </footer>
      </aside>
    </div>
  );
}

function HelperOption({
  title,
  selected,
  delta,
  onSelect,
}: {
  title: string;
  selected: boolean;
  /** Price change if the visitor picks this one. Null when already selected. */
  delta: number | null;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-brand-500 bg-brand-50"
          : "border-brand-100 bg-white hover:border-brand-300"
      }`}
    >
      <span className="block text-sm font-semibold text-ink-900">{title}</span>
      {delta !== null && delta !== 0 && (
        <span
          className={`mt-0.5 block text-xs font-bold ${delta < 0 ? "text-mint-600" : "text-coral-600"}`}
        >
          {delta < 0 ? "−" : "+"}£{Math.abs(delta).toFixed(2)}
        </span>
      )}
      {selected && <span className="mt-0.5 block text-xs font-semibold text-brand-600">Selected</span>}
    </button>
  );
}
