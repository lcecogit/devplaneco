// Decides how a freshly booked job gets matched to a transport partner —
// run automatically at booking confirmation (see ConfirmStep.tsx), never
// surfaced to the customer as a choice. Two allocation methods are live so
// far: 'click_claim' (Phase 6 — first partner to claim it wins) and
// 'auction' (Phase 6b — partners bid, lowest payout wins when the window
// closes). Both look identical to the customer once resolved.

import type { QuoteCategory } from "@/lib/quote/quote-state";

/** Below this price, a job defaults to click_claim regardless of category
 * (unless the category forces one method or the other below). */
export const AUCTION_PRICE_THRESHOLD_GBP = 150;

/** How long a job's bidding window stays open once it's sent to auction. */
export const AUCTION_BIDDING_WINDOW_HOURS = 24;

/** Fast/simple jobs that always go to click_claim, even above the price
 * threshold — there's no real benefit to a partner sitting on a bidding
 * window for a one-item job. */
const FORCE_CLICK_CLAIM_CATEGORIES = new Set<QuoteCategory>(["single-item-transport"]);

/** Larger/higher-value job types that always go to auction, regardless of
 * this particular booking's price — the category itself is the signal. */
const FORCE_AUCTION_CATEGORIES = new Set<QuoteCategory>(["office-relocation", "international-moves"]);

export type AllocationAssignment = {
  allocationMethod: "click_claim" | "auction";
  /** Set only when allocationMethod is 'auction'. */
  biddingClosesAt: string | null;
};

/** Pure function — no I/O — so the rule can be unit tested and the
 * thresholds above tuned independently of the booking flow that calls it. */
export function assignAllocationMethod(category: QuoteCategory, priceGBP: number): AllocationAssignment {
  let allocationMethod: AllocationAssignment["allocationMethod"];

  if (FORCE_CLICK_CLAIM_CATEGORIES.has(category)) {
    allocationMethod = "click_claim";
  } else if (FORCE_AUCTION_CATEGORIES.has(category)) {
    allocationMethod = "auction";
  } else {
    allocationMethod = priceGBP >= AUCTION_PRICE_THRESHOLD_GBP ? "auction" : "click_claim";
  }

  const biddingClosesAt =
    allocationMethod === "auction"
      ? new Date(Date.now() + AUCTION_BIDDING_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
      : null;

  return { allocationMethod, biddingClosesAt };
}
