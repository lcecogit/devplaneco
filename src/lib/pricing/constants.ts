// Every coefficient the pricing engine uses, in one place.
//
// Nothing in calculate-price.ts contains a bare number — a pricing change is
// always an edit to this file. That's the point: prices can be tuned by
// someone who doesn't want to read the formula, and a diff on this file is a
// complete record of what changed about pricing.
//
// These are FIRST-PASS values, chosen to land in a plausible band for the UK
// man-and-van / small-removals market (roughly £60 for a couple of items
// across town, a few hundred for a flat's worth of furniture cross-country).
// They are NOT derived from our own cost data, because we don't have any
// yet — the first real jobs are what should retune them. Anywhere the
// reasoning matters, it's written down next to the number.

import type { FloorLevel } from "@/lib/quote/types";

// ---------------------------------------------------------------------------
// Base: volume + distance
// ---------------------------------------------------------------------------

/**
 * Flat call-out charge on every job, before any volume or distance. Covers
 * the fixed cost of turning up at all: the driver's time getting to the
 * first stop, vehicle overhead, admin.
 */
export const BASE_CALLOUT_GBP = 38;

/**
 * Charged per cubic metre of goods. This is the main "how big is this job"
 * lever — volume drives both which van is needed and how long loading takes.
 */
export const PRICE_PER_M3_GBP = 14;

/**
 * Charged per mile of (estimated) driving distance across the whole route.
 * Roughly covers fuel, wear, and the driver's time on the road at our
 * assumed average speed.
 */
export const PRICE_PER_MILE_GBP = 1.15;

/**
 * Long journeys get slightly cheaper per mile — the fixed overhead is
 * already covered and motorway miles are quicker and cheaper than town
 * miles. Miles beyond this threshold are charged at the taper rate below.
 */
export const LONG_DISTANCE_TAPER_FROM_MILES = 100;
export const LONG_DISTANCE_TAPER_RATE = 0.75;

/**
 * Floor under the whole calculation. A single small box moved 400 yards
 * still costs us a van and a driver; we won't quote below this.
 */
export const MINIMUM_PRICE_GBP = 45;

// ---------------------------------------------------------------------------
// Crew
// ---------------------------------------------------------------------------

/**
 * Applied to the volume+distance base. A second pair of hands is close to a
 * second wage for the day, but the van, fuel and admin don't double — hence
 * meaningfully more than 1x but well short of 2x.
 */
export const CREW_MULTIPLIERS: Record<1 | 2, number> = {
  1: 1.0,
  2: 1.45,
};

// ---------------------------------------------------------------------------
// Day of week
// ---------------------------------------------------------------------------

/**
 * Keyed by JS `Date.getDay()` (0 = Sunday). Weekends cost more because
 * that's when demand concentrates and when crew availability is scarcest;
 * Sunday is the thinnest supply of all. Midweek is the cheap baseline, which
 * is exactly the nudge we want the calendar to give.
 */
export const DAY_OF_WEEK_MULTIPLIERS: Record<number, number> = {
  0: 1.2, // Sunday
  1: 1.0, // Monday
  2: 0.97, // Tuesday — quietest day, priced to pull demand into it
  3: 0.97, // Wednesday
  4: 1.0, // Thursday
  5: 1.08, // Friday — end-of-tenancy moves cluster here
  6: 1.15, // Saturday
};

// ---------------------------------------------------------------------------
// Lead time
// ---------------------------------------------------------------------------

/**
 * Days-from-today → multiplier, as an ordered ladder. The first entry whose
 * `withinDays` the booking falls inside wins.
 *
 * Short notice is genuinely more expensive to service: it means pulling a
 * crew off other work or paying to fill a gap at short notice, and there's
 * far less chance of pairing the job with another move on the same route.
 * By about two weeks out that pressure is gone entirely and the price
 * flattens — booking three months ahead is no cheaper than booking three
 * weeks ahead, and pretending otherwise would just be a fake discount.
 */
export const LEAD_TIME_MULTIPLIERS: { withinDays: number; multiplier: number }[] = [
  { withinDays: 0, multiplier: 1.45 }, // same day
  { withinDays: 1, multiplier: 1.3 }, // tomorrow
  { withinDays: 2, multiplier: 1.2 },
  { withinDays: 4, multiplier: 1.12 },
  { withinDays: 7, multiplier: 1.05 },
  { withinDays: 13, multiplier: 1.01 },
];

/** Applied from LEAD_TIME_MULTIPLIERS' last threshold onwards — the flat floor. */
export const LEAD_TIME_BASELINE_MULTIPLIER = 1.0;

// ---------------------------------------------------------------------------
// Access (floors and lifts)
// ---------------------------------------------------------------------------

/**
 * Flat surcharge per stop, by floor. Stairs cost time and a second person's
 * back; each additional flight adds more than the last because crews slow
 * down. Charged per stop, so a 3rd-floor pickup and a 3rd-floor delivery are
 * charged twice — which is correct, it's twice the carrying.
 *
 * Basement is charged like a first floor: fewer stairs, but awkward turns
 * and no vehicle access at the door.
 */
export const FLOOR_SURCHARGES_GBP: Record<FloorLevel, number> = {
  basement: 12,
  ground: 0,
  first: 12,
  second: 24,
  third: 38,
  fourth: 54,
  fifth: 72,
  sixth: 92,
  above_sixth: 115,
};

/**
 * What fraction of the floor surcharge still applies when there's a working
 * lift. Not zero — there's still a walk to the lift, waiting for it, and
 * items that won't fit in it — but most of the cost goes away.
 */
export const LIFT_SURCHARGE_RETAINED = 0.25;

// ---------------------------------------------------------------------------
// Time windows
// ---------------------------------------------------------------------------

/** The free, default window: a full working day, 8am to 6pm. */
export const FULL_DAY_WINDOW_START_HOUR = 8;
export const FULL_DAY_WINDOW_END_HOUR = 18;

/** Narrower than this and we can't realistically route around it. */
export const MIN_WINDOW_HOURS = 1;

/**
 * Charged per hour by which a window is narrower than the full day, per end
 * of the route (collection and delivery are surcharged independently).
 *
 * A narrow window is a real constraint on routing: the tighter it is, the
 * fewer other jobs can share that vehicle's day. The rate is superlinear —
 * see WINDOW_TIGHTNESS_EXPONENT — because going from 10 hours to 8 barely
 * constrains anything, while going from 3 hours to 1 effectively dedicates
 * the vehicle.
 *
 * Calibrated so the realistic range lands between about £4 (a 8-hour window,
 * barely a constraint) and about £49 (a 1-hour window, effectively an
 * appointment) per end of the route.
 */
export const WINDOW_SURCHARGE_PER_HOUR_GBP = 1.4;
export const WINDOW_TIGHTNESS_EXPONENT = 1.6;

// ---------------------------------------------------------------------------
// Helper add-on
// ---------------------------------------------------------------------------

/**
 * Adding a second person to help load and unload, on a 1-person booking.
 * Scales a little with volume because a bigger load is a longer day for
 * them, but is mostly a flat half-day-rate style charge.
 *
 * NOTE the interaction with crew size: on the 2-person tab a helper is
 * already part of the crew, so the drawer offers the *reverse* choice —
 * "just the driver" — priced as a reduction of the same amount.
 */
export const HELPER_BASE_GBP = 45;
export const HELPER_PER_M3_GBP = 3;

// ---------------------------------------------------------------------------
// Rounding
// ---------------------------------------------------------------------------

/**
 * Final prices are rounded to whole pounds. Not to a .99 or .95 — this is a
 * service quote, not retail, and a clean number reads as more honest.
 */
export const PRICE_ROUNDING_GBP = 1;
