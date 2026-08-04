// The pricing engine.
//
// Pure and cheap by design: step 3 calls this once per selectable date in the
// visible month (~35 calls), twice over when the crew tabs need a "from"
// price for both crew sizes, and again on every change inside the date
// drawer. No I/O, no allocation-heavy work, no dependence on `new Date()`
// beyond what's passed in.
//
// THE MODEL, in order:
//
//   base            = callout + volume component + distance component
//   scaled          = base x crew x day-of-week x lead-time
//   total           = scaled + access surcharge + window surcharge + helper
//   final           = max(total, minimum), rounded
//
// Multipliers apply to the *base* only, not to the surcharges. That's
// deliberate: a third-floor carry costs the same on a Tuesday as on a
// Saturday, so inflating it by the weekend multiplier would be wrong and
// would make the surcharge impossible to explain to a customer.
//
// Every number lives in ./constants.ts. Every price we ever show is returned
// with the full breakdown below and stored in quotes.price_breakdown, so any
// figure can be reconstructed and explained after the fact.

import type { FloorLevel, TimeWindow } from "@/lib/quote/types";
import {
  BASE_CALLOUT_GBP,
  CREW_MULTIPLIERS,
  DAY_OF_WEEK_MULTIPLIERS,
  FLOOR_SURCHARGES_GBP,
  FULL_DAY_WINDOW_END_HOUR,
  FULL_DAY_WINDOW_START_HOUR,
  HELPER_BASE_GBP,
  HELPER_PER_M3_GBP,
  LEAD_TIME_BASELINE_MULTIPLIER,
  LEAD_TIME_MULTIPLIERS,
  LIFT_SURCHARGE_RETAINED,
  LONG_DISTANCE_TAPER_FROM_MILES,
  LONG_DISTANCE_TAPER_RATE,
  MINIMUM_PRICE_GBP,
  PRICE_PER_M3_GBP,
  PRICE_PER_MILE_GBP,
  PRICE_ROUNDING_GBP,
  WINDOW_SURCHARGE_PER_HOUR_GBP,
  WINDOW_TIGHTNESS_EXPONENT,
} from "@/lib/pricing/constants";

export type CrewSize = 1 | 2;

export type PricingStopAccess = {
  floor: FloorLevel;
  hasLift: boolean;
};

export type PriceInput = {
  /** Total volume of everything being moved, in m3. */
  totalVolumeM3: number;
  /** Estimated driving distance across the whole route, in miles. */
  distanceMiles: number;
  crewSize: CrewSize;
  /** The date of the move, as yyyy-mm-dd (local, no timezone games). */
  date: string;
  /** Today, as yyyy-mm-dd — passed in so this function stays pure. */
  today: string;
  /** Access at every stop on the route, in order. */
  stops: PricingStopAccess[];
  collectionWindow: TimeWindow;
  deliveryWindow: TimeWindow;
  /**
   * Whether a second pair of hands is included for loading/unloading.
   * On a 1-person booking this is a paid add-on. On a 2-person booking the
   * helper is already the crew, so `false` here is a *reduction* — see
   * `helperGBP` in the breakdown, which goes negative in that case.
   */
  helperIncluded: boolean;
};

export type PriceBreakdown = {
  /** Flat call-out charge. */
  calloutGBP: number;
  /** Volume component of the base. */
  volumeGBP: number;
  /** Distance component of the base. */
  distanceGBP: number;
  /** callout + volume + distance, before any multiplier. */
  baseGBP: number;

  crewMultiplier: number;
  dayOfWeekMultiplier: number;
  leadTimeMultiplier: number;
  /** The base after all three multipliers. */
  scaledBaseGBP: number;

  /** Per-stop floor/lift surcharges, for showing "why". */
  accessGBP: number;
  accessDetail: { floor: FloorLevel; hasLift: boolean; surchargeGBP: number }[];

  /** Narrow-window surcharge, split by end of the route. */
  collectionWindowGBP: number;
  deliveryWindowGBP: number;
  windowGBP: number;

  /** Positive when a helper is added, negative when one is dropped. */
  helperGBP: number;

  /** Sum of everything above, before the minimum and rounding. */
  subtotalGBP: number;
  /** True when MINIMUM_PRICE_GBP was what determined the final price. */
  minimumApplied: boolean;
  /** What the customer pays. */
  totalGBP: number;

  /** Echo of the inputs that produced this, so a stored breakdown is self-describing. */
  inputs: {
    totalVolumeM3: number;
    distanceMiles: number;
    crewSize: CrewSize;
    date: string;
    leadTimeDays: number;
    dayOfWeek: number;
    collectionWindow: TimeWindow;
    deliveryWindow: TimeWindow;
    helperIncluded: boolean;
  };
};

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

/**
 * Distance charge, with a taper past LONG_DISTANCE_TAPER_FROM_MILES — the
 * first N miles at full rate, everything beyond at the reduced rate.
 */
function distanceCharge(miles: number): number {
  const safeMiles = Math.max(0, miles);
  if (safeMiles <= LONG_DISTANCE_TAPER_FROM_MILES) {
    return safeMiles * PRICE_PER_MILE_GBP;
  }
  const taperedMiles = safeMiles - LONG_DISTANCE_TAPER_FROM_MILES;
  return (
    LONG_DISTANCE_TAPER_FROM_MILES * PRICE_PER_MILE_GBP +
    taperedMiles * PRICE_PER_MILE_GBP * LONG_DISTANCE_TAPER_RATE
  );
}

/**
 * Whole days between two yyyy-mm-dd dates. Parsed as UTC midnight on both
 * sides so a BST/GMT boundary can't turn 7 days into 6.98 and round wrong.
 */
export function leadTimeDays(today: string, date: string): number {
  const from = Date.parse(`${today}T00:00:00Z`);
  const to = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

function leadTimeMultiplier(days: number): number {
  // Past dates shouldn't reach here (the calendar disables them), but if one
  // does, treat it as same-day rather than returning something nonsensical.
  const clamped = Math.max(0, days);
  for (const tier of LEAD_TIME_MULTIPLIERS) {
    if (clamped <= tier.withinDays) return tier.multiplier;
  }
  return LEAD_TIME_BASELINE_MULTIPLIER;
}

/** JS day-of-week for a yyyy-mm-dd string, read in UTC to avoid TZ drift. */
export function dayOfWeekFor(date: string): number {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? 1 : parsed.getUTCDay();
}

function accessSurcharge(stops: PricingStopAccess[]) {
  const detail = stops.map((stop) => {
    const full = FLOOR_SURCHARGES_GBP[stop.floor] ?? 0;
    const surchargeGBP = stop.hasLift ? full * LIFT_SURCHARGE_RETAINED : full;
    return { floor: stop.floor, hasLift: stop.hasLift, surchargeGBP: round2(surchargeGBP) };
  });

  return {
    detail,
    total: round2(detail.reduce((sum, stop) => sum + stop.surchargeGBP, 0)),
  };
}

/**
 * Surcharge for asking for a window narrower than the full working day.
 * Zero when the window is the full 8am–6pm (or wider). Superlinear in how
 * many hours have been shaved off — see WINDOW_TIGHTNESS_EXPONENT.
 */
export function windowSurcharge(window: TimeWindow): number {
  const fullDayHours = FULL_DAY_WINDOW_END_HOUR - FULL_DAY_WINDOW_START_HOUR;
  const requestedHours = Math.max(0, window.endHour - window.startHour);
  const hoursLost = Math.max(0, fullDayHours - requestedHours);
  if (hoursLost === 0) return 0;

  return round2(
    WINDOW_SURCHARGE_PER_HOUR_GBP * Math.pow(hoursLost, WINDOW_TIGHTNESS_EXPONENT)
  );
}

/**
 * The helper line. Positive when the visitor adds a helper to a 1-person
 * booking; negative when they drop the second person from a 2-person one.
 * Same magnitude either way, so the drawer's "+£X" and "−£X" are symmetric
 * and the two crew tabs stay consistent with each other.
 */
export function helperCharge(totalVolumeM3: number): number {
  return round2(HELPER_BASE_GBP + Math.max(0, totalVolumeM3) * HELPER_PER_M3_GBP);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function calculatePrice(input: PriceInput): PriceBreakdown {
  const volume = Math.max(0, input.totalVolumeM3);

  const calloutGBP = BASE_CALLOUT_GBP;
  const volumeGBP = round2(volume * PRICE_PER_M3_GBP);
  const distanceGBP = round2(distanceCharge(input.distanceMiles));
  const baseGBP = round2(calloutGBP + volumeGBP + distanceGBP);

  const crewMultiplier = CREW_MULTIPLIERS[input.crewSize];
  const dayOfWeek = dayOfWeekFor(input.date);
  const dayOfWeekMultiplier = DAY_OF_WEEK_MULTIPLIERS[dayOfWeek] ?? 1;
  const days = leadTimeDays(input.today, input.date);
  const leadMultiplier = leadTimeMultiplier(days);

  const scaledBaseGBP = round2(
    baseGBP * crewMultiplier * dayOfWeekMultiplier * leadMultiplier
  );

  const access = accessSurcharge(input.stops);

  const collectionWindowGBP = windowSurcharge(input.collectionWindow);
  const deliveryWindowGBP = windowSurcharge(input.deliveryWindow);
  const windowGBP = round2(collectionWindowGBP + deliveryWindowGBP);

  // On a 2-person crew the helper is already priced into CREW_MULTIPLIERS[2],
  // so choosing "just the driver" removes it rather than adding one.
  const helperMagnitude = helperCharge(volume);
  const helperGBP =
    input.crewSize === 2
      ? input.helperIncluded
        ? 0
        : round2(-helperMagnitude)
      : input.helperIncluded
        ? helperMagnitude
        : 0;

  const subtotalGBP = round2(scaledBaseGBP + access.total + windowGBP + helperGBP);
  const minimumApplied = subtotalGBP < MINIMUM_PRICE_GBP;
  const totalGBP =
    Math.round(Math.max(subtotalGBP, MINIMUM_PRICE_GBP) / PRICE_ROUNDING_GBP) *
    PRICE_ROUNDING_GBP;

  return {
    calloutGBP,
    volumeGBP,
    distanceGBP,
    baseGBP,
    crewMultiplier,
    dayOfWeekMultiplier,
    leadTimeMultiplier: leadMultiplier,
    scaledBaseGBP,
    accessGBP: access.total,
    accessDetail: access.detail,
    collectionWindowGBP,
    deliveryWindowGBP,
    windowGBP,
    helperGBP,
    subtotalGBP,
    minimumApplied,
    totalGBP,
    inputs: {
      totalVolumeM3: volume,
      distanceMiles: Math.max(0, input.distanceMiles),
      crewSize: input.crewSize,
      date: input.date,
      leadTimeDays: days,
      dayOfWeek,
      collectionWindow: input.collectionWindow,
      deliveryWindow: input.deliveryWindow,
      helperIncluded: input.helperIncluded,
    },
  };
}

/** The free default window every quote starts on. */
export const FULL_DAY_WINDOW: TimeWindow = {
  startHour: FULL_DAY_WINDOW_START_HOUR,
  endHour: FULL_DAY_WINDOW_END_HOUR,
};

export function isFullDayWindow(window: TimeWindow): boolean {
  return (
    window.startHour <= FULL_DAY_WINDOW_START_HOUR &&
    window.endHour >= FULL_DAY_WINDOW_END_HOUR
  );
}
