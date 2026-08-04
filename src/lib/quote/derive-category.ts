// Derives `jobs.category` from what the visitor actually told us.
//
// WHY THIS EXISTS
// Phase 5's flow asked the visitor to pick a service category up front, and
// Phase 6/6b's allocation rules key off `jobs.category`
// (lib/allocation/assign-method.ts forces single-item-transport to
// click_claim and office-relocation/international-moves to auction). Phase 8A
// removed that question — the new flow asks for addresses and an inventory
// instead, which is both a better experience and strictly more information.
//
// APPROACH CHOSEN: derive from the item mix and stop count, with the
// homepage service card's slug kept only as a tiebreaker hint.
// The alternative — keeping a category question — was rejected because it
// asks the visitor to classify their own move, which they're worse at than we
// are once we know their inventory.
//
// The hint is honoured ONLY for categories the item list can't tell us about
// (car, motorbike, and piano moves, which have no catalogue representation
// and would otherwise be misread as generic furniture). For everything else
// the inventory wins over the hint, because the inventory is what they
// actually entered.

import type { QuoteItem } from "@/lib/quote/types";
import { totalItemCount, totalVolumeM3 } from "@/lib/quote/types";

/** The 7 slugs Phase 1's service pages and Phase 6's allocation rules use. */
export type JobCategory =
  | "home-removals"
  | "single-item-transport"
  | "office-relocation"
  | "car-transport"
  | "motorbike-transport"
  | "piano-moving"
  | "international-moves";

/**
 * Human labels for the seven slugs. Duplicated from
 * `components/home/ServicesGrid`'s SERVICE_CATEGORIES deliberately: that
 * module carries React icon components with it, and the server-side booking
 * code needs a title without dragging a component tree along.
 */
export const JOB_CATEGORY_TITLES: Record<JobCategory, string> = {
  "home-removals": "Home Removals",
  "single-item-transport": "Single Item Transport",
  "office-relocation": "Office Relocation",
  "car-transport": "Car Transport",
  "motorbike-transport": "Motorbike Transport",
  "piano-moving": "Piano Moving",
  "international-moves": "International Moves",
};

/**
 * Categories the inventory genuinely can't express — there's no "car" or
 * "upright piano" in item_catalogue — so a visitor who arrived from one of
 * those service cards keeps that classification.
 */
const HINT_ONLY_CATEGORIES = new Set<JobCategory>([
  "car-transport",
  "motorbike-transport",
  "piano-moving",
  "international-moves",
]);

/**
 * At or below this many m3 with only a handful of lines, it's a single-item
 * style job rather than a removal — roughly a sofa and a couple of boxes.
 * This matters beyond labelling: single-item-transport is force-routed to
 * click_claim allocation, so the threshold decides which partners see it.
 */
export const SINGLE_ITEM_MAX_VOLUME_M3 = 3;
export const SINGLE_ITEM_MAX_LINES = 3;

/**
 * Above this, the job is big enough that it's more than someone shifting a
 * desk out of a spare room. Deliberately not high: office furniture is
 * compact, and a dozen desks plus a dozen chairs — obviously an office move —
 * is still under 15 m3.
 *
 * The discriminating test is the office-item *share* below, not this
 * threshold. A large house move can easily exceed this volume and still be a
 * home removal, because a desk or two among 25 m3 of domestic furniture
 * won't clear the share test.
 */
export const OFFICE_SCALE_MIN_VOLUME_M3 = 8;

/** Office items must be at least this fraction of the load to reclassify it. */
export const OFFICE_ITEM_SHARE = 0.3;

/** Catalogue names that read as workplace rather than domestic furniture. */
const OFFICE_ITEM_NAMES = new Set(["Office Desk", "Office Chair", "Small Desk", "Desk Chair"]);

export function deriveJobCategory(items: QuoteItem[], stopCount: number, hint?: string | null): JobCategory {
  if (hint && HINT_ONLY_CATEGORIES.has(hint as JobCategory)) {
    return hint as JobCategory;
  }

  const volume = totalVolumeM3(items);
  const lineCount = items.length;
  const unitCount = totalItemCount(items);

  // A small, few-line inventory on a straight A-to-B route.
  if (
    stopCount <= 2 &&
    lineCount <= SINGLE_ITEM_MAX_LINES &&
    volume <= SINGLE_ITEM_MAX_VOLUME_M3 &&
    unitCount <= 6
  ) {
    return "single-item-transport";
  }

  // A big load that's mostly desks and office chairs.
  const officeUnits = items
    .filter((item) => OFFICE_ITEM_NAMES.has(item.name))
    .reduce((sum, item) => sum + item.quantity, 0);
  if (volume >= OFFICE_SCALE_MIN_VOLUME_M3 && officeUnits >= Math.max(2, unitCount * OFFICE_ITEM_SHARE)) {
    return "office-relocation";
  }

  return "home-removals";
}
