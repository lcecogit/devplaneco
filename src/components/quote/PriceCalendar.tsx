"use client";

import { useMemo } from "react";
import { SHOW_AVAILABILITY_BADGES } from "@/lib/quote/flags";

// Month grid, Monday-first, with a price on every selectable date.
//
// Prices come in pre-computed from the parent (which owns the pricing inputs)
// rather than being calculated here — that keeps this component a pure view
// and means switching crew tabs is a single re-price pass, not a per-cell one.

export type CalendarDay = {
  /** yyyy-mm-dd, or null for a leading/trailing blank cell. */
  date: string | null;
  dayOfMonth: number | null;
  priceGBP: number | null;
  isPast: boolean;
  isToday: boolean;
};

/**
 * Availability/scarcity badges.
 *
 * ===========================================================================
 * This renders NOTHING today, and that is correct. See SHOW_AVAILABILITY_BADGES
 * in lib/quote/flags.ts for why: there is no real partner-availability data
 * to drive it, and inventing scarcity is a UK consumer-protection risk, not
 * just bad manners. The rendering path exists so that a real availability
 * feed can be plugged straight in.
 *
 * If you're tempted to "fix" the empty calendar with a random number: don't.
 * ===========================================================================
 */
function AvailabilityBadge({ slotsRemaining }: { slotsRemaining: number | null }) {
  if (!SHOW_AVAILABILITY_BADGES || slotsRemaining === null) return null;

  return (
    <span className="mt-0.5 block text-[10px] font-semibold leading-tight text-coral-600">
      {slotsRemaining === 1 ? "One slot left" : `${slotsRemaining} slots left`}
    </span>
  );
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function PriceCalendar({
  monthLabel,
  days,
  selectedDate,
  bestPriceDate,
  onSelect,
  onPreviousMonth,
  onNextMonth,
  canGoBack,
}: {
  monthLabel: string;
  days: CalendarDay[];
  selectedDate: string | null;
  bestPriceDate: string | null;
  onSelect: (date: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  canGoBack: boolean;
}) {
  const weeks = useMemo(() => {
    const chunks: CalendarDay[][] = [];
    for (let i = 0; i < days.length; i += 7) chunks.push(days.slice(i, i + 7));
    return chunks;
  }, [days]);

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onPreviousMonth}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-200 text-ink-700 transition-colors hover:bg-brand-50 disabled:opacity-30"
        >
          ‹
        </button>
        <h3 aria-live="polite" className="font-heading text-base font-bold text-ink-900">
          {monthLabel}
        </h3>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Next month"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-200 text-ink-700 transition-colors hover:bg-brand-50"
        >
          ›
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-700">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="mt-1 flex flex-col gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((day, dayIndex) => {
              if (!day.date) return <div key={`blank-${dayIndex}`} />;

              const selected = day.date === selectedDate;
              const isBest = day.date === bestPriceDate && !day.isPast;

              return (
                <button
                  key={day.date}
                  type="button"
                  disabled={day.isPast || day.priceGBP === null}
                  aria-pressed={selected}
                  aria-label={`${day.date}${day.priceGBP !== null ? `, £${day.priceGBP}` : ""}${isBest ? ", best price this month" : ""}`}
                  onClick={() => onSelect(day.date!)}
                  className={`relative flex min-h-[64px] flex-col items-center justify-center rounded-xl border px-1 py-1.5 transition-colors ${
                    day.isPast
                      ? "cursor-not-allowed border-transparent text-ink-700/30"
                      : selected
                        ? "border-brand-500 bg-brand-500 text-white"
                        : isBest
                          ? "border-mint-500 bg-mint-50 text-ink-900 hover:bg-mint-100"
                          : "border-brand-100 bg-white text-ink-900 hover:border-brand-300 hover:bg-brand-50/60"
                  }`}
                >
                  <span
                    className={`text-xs font-semibold ${day.isToday && !selected ? "underline underline-offset-2" : ""}`}
                  >
                    {day.dayOfMonth}
                  </span>

                  {day.priceGBP !== null && !day.isPast && (
                    <span className="text-[11px] font-bold leading-tight">£{day.priceGBP}</span>
                  )}

                  {isBest && !selected && (
                    <span className="mt-0.5 rounded-full bg-mint-500 px-1.5 py-px text-[9px] font-bold uppercase leading-tight tracking-wide text-white">
                      Best price
                    </span>
                  )}

                  <AvailabilityBadge slotsRemaining={null} />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Deliberately makes no VAT or price-guarantee claim — neither is
          settled yet. The 30 days matches quotes.expires_at. */}
      <p className="mt-3 text-xs text-ink-700">
        Today is underlined. Prices are based on the details you&apos;ve given us and this
        quote is valid for 30 days.
      </p>
    </div>
  );
}
