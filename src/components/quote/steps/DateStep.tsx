"use client";

import { useMemo, useState } from "react";
import { DateDrawer, type DrawerSelection } from "@/components/quote/DateDrawer";
import { PriceCalendar, type CalendarDay } from "@/components/quote/PriceCalendar";
import { GATE_PRICES_BEHIND_EMAIL } from "@/lib/quote/flags";
import { calculatePrice, FULL_DAY_WINDOW, type CrewSize } from "@/lib/pricing/calculate-price";
import type { PricingStopAccess } from "@/lib/pricing/calculate-price";
import type { TimeWindow } from "@/lib/quote/types";

// Step 3 — "Select a date".
//
// The whole visible month is priced on every render: 28-31 dates x whichever
// crew tab is active, plus a cheapest-price pass for each crew tab's "from"
// figure. That's ~100 calls to calculatePrice, which is why the engine is a
// pure arithmetic function with no I/O — see the note at the top of
// lib/pricing/calculate-price.ts.

type Props = {
  totalVolumeM3: number;
  distanceMiles: number;
  stops: PricingStopAccess[];
  today: string;
  crewSize: CrewSize;
  onCrewSizeChange: (crewSize: CrewSize) => void;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  collectionWindow: TimeWindow;
  deliveryWindow: TimeWindow;
  helperIncluded: boolean;
  onSelectionChange: (selection: DrawerSelection) => void;
  onBack: () => void;
  onProceed: () => void;
  proceeding: boolean;
  error: string | null;
};

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function DateStep(props: Props) {
  const {
    totalVolumeM3,
    distanceMiles,
    stops,
    today,
    crewSize,
    selectedDate,
    collectionWindow,
    deliveryWindow,
    helperIncluded,
  } = props;

  const [todayYear, todayMonth] = useMemo(() => {
    const [year, month] = today.split("-").map(Number);
    return [year, month - 1];
  }, [today]);

  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth);
  // Prices are shown immediately by default (GATE_PRICES_BEHIND_EMAIL is
  // false). The gate below exists only so the variant can be tested later.
  const [gateCleared, setGateCleared] = useState(!GATE_PRICES_BEHIND_EMAIL);

  /**
   * Prices every date in the visible month for a given crew size, using the
   * *free full-day window and no helper* — the calendar shows the entry price
   * for each date, and the drawer is where add-ons change it.
   */
  function priceMonth(crew: CrewSize): Map<string, number> {
    const prices = new Map<string, number>();
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = isoDate(viewYear, viewMonth, day);
      if (date < today) continue;
      prices.set(
        date,
        calculatePrice({
          totalVolumeM3,
          distanceMiles,
          crewSize: crew,
          date,
          today,
          stops,
          collectionWindow: FULL_DAY_WINDOW,
          deliveryWindow: FULL_DAY_WINDOW,
          helperIncluded: crew === 2,
        }).totalGBP
      );
    }
    return prices;
  }

  const pricesByCrew = useMemo(
    () => ({ 1: priceMonth(1), 2: priceMonth(2) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewYear, viewMonth, totalVolumeM3, distanceMiles, stops, today]
  );

  const activePrices = pricesByCrew[crewSize];

  const cheapestFor = (crew: CrewSize) => {
    const values = Array.from(pricesByCrew[crew].values());
    return values.length > 0 ? Math.min(...values) : null;
  };

  const bestPriceDate = useMemo(() => {
    let best: { date: string; price: number } | null = null;
    Array.from(activePrices.entries()).forEach(([date, price]) => {
      if (!best || price < best.price) best = { date, price };
    });
    return (best as { date: string; price: number } | null)?.date ?? null;
  }, [activePrices]);

  const days: CalendarDay[] = useMemo(() => {
    const firstOfMonth = new Date(Date.UTC(viewYear, viewMonth, 1));
    // getUTCDay() is Sunday-first; the grid is Monday-first.
    const leadingBlanks = (firstOfMonth.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();

    const cells: CalendarDay[] = Array.from({ length: leadingBlanks }, () => ({
      date: null,
      dayOfMonth: null,
      priceGBP: null,
      isPast: true,
      isToday: false,
    }));

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = isoDate(viewYear, viewMonth, day);
      cells.push({
        date,
        dayOfMonth: day,
        priceGBP: activePrices.get(date) ?? null,
        isPast: date < today,
        isToday: date === today,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ date: null, dayOfMonth: null, priceGBP: null, isPast: true, isToday: false });
    }

    return cells;
  }, [viewYear, viewMonth, activePrices, today]);

  const monthLabel = new Date(Date.UTC(viewYear, viewMonth, 1)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });

  const drawerBreakdown = selectedDate
    ? calculatePrice({
        totalVolumeM3,
        distanceMiles,
        crewSize,
        date: selectedDate,
        today,
        stops,
        collectionWindow,
        deliveryWindow,
        helperIncluded,
      })
    : null;

  function step(delta: number) {
    const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
  }

  const canGoBack = viewYear > todayYear || (viewYear === todayYear && viewMonth > todayMonth);

  if (!gateCleared) {
    return <EmailGate onContinue={() => setGateCleared(true)} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-ink-900">Select a date</h2>
        <p className="mt-1.5 text-sm text-ink-700">
          Prices change by day — midweek is usually cheapest. Pick a date to choose your
          time slot and confirm.
        </p>
      </div>

      {/* Crew tabs ---------------------------------------------------- */}
      <div role="tablist" aria-label="Crew size" className="grid grid-cols-2 gap-2">
        {([1, 2] as const).map((crew) => {
          const cheapest = cheapestFor(crew);
          const active = crewSize === crew;
          return (
            <button
              key={crew}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => props.onCrewSizeChange(crew)}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                active
                  ? "border-brand-500 bg-brand-50"
                  : "border-brand-100 bg-white hover:border-brand-300"
              }`}
            >
              <span className="block text-sm font-bold text-ink-900">
                {crew === 1 ? "1 Person" : "2 People"}
              </span>
              <span className="mt-0.5 block text-xs text-ink-700">
                {cheapest === null ? "No dates this month" : `from £${cheapest}`}
              </span>
            </button>
          );
        })}
      </div>

      <PriceCalendar
        monthLabel={monthLabel}
        days={days}
        selectedDate={selectedDate}
        bestPriceDate={bestPriceDate}
        onSelect={props.onSelectDate}
        onPreviousMonth={() => step(-1)}
        onNextMonth={() => step(1)}
        canGoBack={canGoBack}
      />

      {props.error && (
        <p role="alert" className="text-sm font-medium text-coral-600">
          {props.error}
        </p>
      )}

      <div className="flex justify-between border-t border-brand-100 pt-6">
        <button
          type="button"
          onClick={props.onBack}
          className="rounded-full border border-brand-300 px-6 py-3 text-sm font-semibold text-ink-700 hover:bg-brand-50"
        >
          Back
        </button>
      </div>

      {selectedDate && drawerBreakdown && (
        <DateDrawer
          date={selectedDate}
          crewSize={crewSize}
          totalVolumeM3={totalVolumeM3}
          selection={{ collectionWindow, deliveryWindow, helperIncluded }}
          breakdown={drawerBreakdown}
          onChange={props.onSelectionChange}
          onClose={() => props.onSelectDate(null)}
          onProceed={props.onProceed}
          proceeding={props.proceeding}
        />
      )}
    </div>
  );
}

/**
 * The email-gated variant of step 3, reachable only when
 * GATE_PRICES_BEHIND_EMAIL is true. Even then it keeps an explicit escape
 * hatch — see the flag's comment for why we don't ship this on by default.
 */
function EmailGate({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-6 text-center">
      <h2 className="font-heading text-xl font-bold text-ink-900">Your prices are ready</h2>
      <p className="mt-2 text-sm text-ink-700">
        Enter your email and we&apos;ll send you a copy of this quote.
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="mt-4 text-sm font-semibold text-brand-600 underline underline-offset-2"
      >
        Show me prices without emailing
      </button>
    </div>
  );
}
