"use client";

import { useId } from "react";
import { FULL_DAY_WINDOW } from "@/lib/pricing/calculate-price";
import {
  FULL_DAY_WINDOW_END_HOUR,
  FULL_DAY_WINDOW_START_HOUR,
  MIN_WINDOW_HOURS,
} from "@/lib/pricing/constants";
import { formatHour, formatWindow, type TimeWindow } from "@/lib/quote/types";

// Dual-handle hour-granularity range slider for a collection or delivery
// window.
//
// Built from two overlaid native range inputs rather than a drag library:
// they're keyboard-accessible and screen-reader-announced for free, which a
// div-and-pointer-events implementation would have to reimplement. The track
// behind them is a plain div showing the selected span.

export function TimeWindowSlider({
  label,
  window,
  surchargeGBP,
  onChange,
}: {
  label: string;
  window: TimeWindow;
  surchargeGBP: number;
  onChange: (window: TimeWindow) => void;
}) {
  const id = useId();
  const min = FULL_DAY_WINDOW_START_HOUR;
  const max = FULL_DAY_WINDOW_END_HOUR;
  const span = max - min;

  const startPct = ((window.startHour - min) / span) * 100;
  const endPct = ((window.endHour - min) / span) * 100;

  const isFullDay = window.startHour <= min && window.endHour >= max;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ink-900">{label}</span>
        <button
          type="button"
          onClick={() => onChange(FULL_DAY_WINDOW)}
          disabled={isFullDay}
          className="text-xs font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700 disabled:opacity-40 disabled:no-underline"
        >
          Reset
        </button>
      </div>

      <p className="mt-1 text-sm text-ink-900">
        <span className="font-bold">{formatWindow(window)}</span>{" "}
        {surchargeGBP > 0 ? (
          <span className="font-semibold text-coral-600">+£{surchargeGBP.toFixed(2)}</span>
        ) : (
          <span className="font-semibold text-mint-600">Free</span>
        )}
      </p>

      <div className="relative mt-4 h-6">
        {/* Track */}
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-100" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-500"
          style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
        />

        {/* `pointer-events-none` on the wrapper + `auto` on the thumbs lets
            both inputs sit on top of each other without the upper one
            swallowing every click meant for the lower one. */}
        <input
          id={`${id}-start`}
          type="range"
          aria-label={`${label} earliest time`}
          min={min}
          max={max - MIN_WINDOW_HOURS}
          step={1}
          value={window.startHour}
          onChange={(event) => {
            const startHour = Number(event.target.value);
            onChange({
              startHour,
              endHour: Math.max(window.endHour, startHour + MIN_WINDOW_HOURS),
            });
          }}
          className="range-thumb absolute inset-0 h-6 w-full appearance-none bg-transparent"
        />
        <input
          id={`${id}-end`}
          type="range"
          aria-label={`${label} latest time`}
          min={min + MIN_WINDOW_HOURS}
          max={max}
          step={1}
          value={window.endHour}
          onChange={(event) => {
            const endHour = Number(event.target.value);
            onChange({
              startHour: Math.min(window.startHour, endHour - MIN_WINDOW_HOURS),
              endHour,
            });
          }}
          className="range-thumb absolute inset-0 h-6 w-full appearance-none bg-transparent"
        />
      </div>

      <div className="mt-1 flex justify-between text-[11px] text-ink-700">
        <span>{formatHour(min)}</span>
        <span>{formatHour(max)}</span>
      </div>
    </div>
  );
}
