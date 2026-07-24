// Instant-quote price estimator for the public /quote flow.
//
// This is deliberately a simple, transparent model — base price + a
// per-mile distance charge, scaled by a category multiplier and a job-size
// factor — NOT a real pricing engine. It exists to give a visitor a
// ballpark figure before they create an account, and the number it
// produces must always be shown to the user labelled as an *estimate*.
// Once Phase 6 (partner bidding/allocation) exists, the real price a
// customer pays comes from that process, not from this function.
//
// Tuning: adjust the named constants below. Nothing in the formula itself
// should need to change for a pricing tweak.

import type { QuoteCategory } from "@/lib/quote/quote-state";

/** Flat call-out fee included in every job, before distance or size. */
export const BASE_PRICE_GBP = 45;

/** Added per mile of driving distance between collection and delivery. */
export const PRICE_PER_MILE_GBP = 1.1;

/** No job is ever quoted below this, regardless of how short/small it is. */
export const MINIMUM_ESTIMATE_GBP = 35;

/**
 * Applied to (base + distance) per service category, to reflect the
 * relative crew size / handling complexity / risk of each job type.
 */
export const CATEGORY_MULTIPLIERS: Record<QuoteCategory, number> = {
  "home-removals": 2.6,
  "single-item-transport": 1.0,
  "office-relocation": 2.2,
  "car-transport": 1.6,
  "motorbike-transport": 1.1,
  "piano-moving": 1.8,
  "international-moves": 3.5,
};

/**
 * Extra multiplier per additional room, for the categories sized by room
 * count (home removals, office relocation, international moves). A 1-room
 * job has a size factor of exactly 1.0.
 */
export const PER_EXTRA_ROOM_MULTIPLIER = 0.35;

/**
 * Size factor for the categories sized by a single item's tier instead of
 * room count (single item, car, motorbike, piano transport).
 */
export const ITEM_SIZE_MULTIPLIERS = {
  small: 0.8,
  medium: 1,
  large: 1.35,
} as const;

export type ItemSizeTier = keyof typeof ITEM_SIZE_MULTIPLIERS;

const ROOM_SIZED_CATEGORIES = new Set<QuoteCategory>([
  "home-removals",
  "office-relocation",
  "international-moves",
]);

export function isRoomSizedCategory(category: QuoteCategory): boolean {
  return ROOM_SIZED_CATEGORIES.has(category);
}

export type EstimateQuoteInput = {
  category: QuoteCategory;
  distanceMiles: number;
  /** Number of rooms, only used for room-sized categories. */
  roomCount?: number;
  /** Item size tier, only used for item-sized categories. */
  itemSizeTier?: ItemSizeTier;
};

export type EstimateQuoteResult = {
  priceGBP: number;
  distanceMiles: number;
  sizeFactor: number;
  categoryMultiplier: number;
};

function sizeFactorFor(input: EstimateQuoteInput): number {
  if (isRoomSizedCategory(input.category)) {
    const rooms = Math.max(1, input.roomCount ?? 1);
    return 1 + (rooms - 1) * PER_EXTRA_ROOM_MULTIPLIER;
  }
  return ITEM_SIZE_MULTIPLIERS[input.itemSizeTier ?? "medium"];
}

/**
 * Estimate a quote price in GBP. Pure function — no I/O, no rounding
 * surprises — so it stays easy to unit test and tune independently of the
 * UI or the postcode-distance lookup that feeds it.
 */
export function estimateQuote(input: EstimateQuoteInput): EstimateQuoteResult {
  const distanceMiles = Math.max(0, input.distanceMiles);
  const categoryMultiplier = CATEGORY_MULTIPLIERS[input.category];
  const sizeFactor = sizeFactorFor(input);

  const raw =
    (BASE_PRICE_GBP + distanceMiles * PRICE_PER_MILE_GBP) * categoryMultiplier * sizeFactor;

  return {
    priceGBP: Math.max(MINIMUM_ESTIMATE_GBP, Math.round(raw)),
    distanceMiles,
    sizeFactor,
    categoryMultiplier,
  };
}
