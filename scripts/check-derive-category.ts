// Throwaway sanity check for lib/quote/derive-category.ts — run with
//   npx tsx scripts/check-derive-category.ts
// Kept in scripts/ alongside create-first-admin.ts rather than deleted, so
// the derivation thresholds can be re-checked after a tuning change. Phase 8B
// is the first thing that actually calls deriveJobCategory in anger.

import { deriveJobCategory } from "../src/lib/quote/derive-category";
import type { QuoteItem } from "../src/lib/quote/types";

function item(name: string, quantity: number, volumeM3: number): QuoteItem {
  return {
    key: name,
    catalogueItemId: "x",
    name,
    quantity,
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    weightKg: null,
    volumeM3,
  };
}

const cases: { label: string; items: QuoteItem[]; stops: number; hint?: string; expect: string }[] = [
  {
    label: "one sofa, A to B",
    items: [item("Three Seater Sofa", 1, 1.607)],
    stops: 2,
    expect: "single-item-transport",
  },
  {
    label: "sofa + 4 boxes (the browser-tested quote)",
    items: [item("Three Seater Sofa", 1, 1.607), item("Large Box", 4, 0.125)],
    stops: 2,
    expect: "single-item-transport",
  },
  {
    label: "a flat's worth of furniture",
    items: [
      item("Three Seater Sofa", 1, 1.607),
      item("Double Wardrobe", 2, 1.44),
      item("Double Bed & Mattress", 1, 1.539),
      item("Large Box", 20, 0.125),
      item("Fridge Freezer", 1, 0.722),
    ],
    stops: 2,
    expect: "home-removals",
  },
  {
    label: "small load but three stops",
    items: [item("Two Seater Sofa", 1, 1.224)],
    stops: 3,
    expect: "home-removals",
  },
  {
    label: "big load of desks and office chairs",
    items: [item("Office Desk", 12, 0.735), item("Office Chair", 12, 0.486)],
    stops: 2,
    expect: "office-relocation",
  },
  {
    label: "piano hint from a service card beats the item list",
    items: [item("Large Box", 30, 0.125)],
    stops: 2,
    hint: "piano-moving",
    expect: "piano-moving",
  },
  {
    label: "home-removals hint is ignored — inventory wins",
    items: [item("Small Box", 1, 0.036)],
    stops: 2,
    hint: "home-removals",
    expect: "single-item-transport",
  },
];

let failures = 0;
for (const testCase of cases) {
  const actual = deriveJobCategory(testCase.items, testCase.stops, testCase.hint);
  const pass = actual === testCase.expect;
  if (!pass) failures += 1;
  console.log(`${pass ? "PASS" : "FAIL"}  ${testCase.label} -> ${actual}`);
}

console.log(failures === 0 ? "\nAll cases passed." : `\n${failures} case(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
