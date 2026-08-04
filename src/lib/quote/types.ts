// Shared vocabulary for the Phase 8A quote flow — used by the pricing
// engine, the API routes, and every step component. Mirrors the database
// enums/columns added in migration 0030.

import type { Database } from "@/types/database";

export type FloorLevel = Database["public"]["Enums"]["floor_level"];
export type ItemCategory = Database["public"]["Enums"]["item_category"];

/** Dropdown options for the floor selector, in building order. */
export const FLOOR_OPTIONS: { value: FloorLevel; label: string }[] = [
  { value: "basement", label: "Basement" },
  { value: "ground", label: "Ground floor" },
  { value: "first", label: "1st floor" },
  { value: "second", label: "2nd floor" },
  { value: "third", label: "3rd floor" },
  { value: "fourth", label: "4th floor" },
  { value: "fifth", label: "5th floor" },
  { value: "sixth", label: "6th floor" },
  { value: "above_sixth", label: "Above 6th floor" },
];

const FLOOR_LABELS = new Map(FLOOR_OPTIONS.map((option) => [option.value, option.label]));

export function floorLabel(floor: FloorLevel): string {
  return FLOOR_LABELS.get(floor) ?? "Ground floor";
}

/**
 * A lift only matters where there are stairs to avoid. The checkbox is shown
 * for exactly these floors and hidden (and the value cleared) for the rest.
 */
export function floorCanHaveLift(floor: FloorLevel): boolean {
  return floor !== "ground" && floor !== "basement";
}

/** Display order and labelling for the 8 catalogue categories. */
export const ITEM_CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: "sofas", label: "Sofas" },
  { value: "wardrobes", label: "Wardrobes" },
  { value: "boxes_bags", label: "Boxes & Bags" },
  { value: "beds_mattresses", label: "Beds & Mattresses" },
  { value: "tables", label: "Tables" },
  { value: "televisions", label: "Televisions" },
  { value: "appliances", label: "Appliances" },
  { value: "chairs", label: "Chairs" },
];

export type CatalogueItem = {
  id: string;
  name: string;
  category: ItemCategory;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumeM3: number;
  weightKg: number | null;
  searchTerms: string[];
};

/** One line in the visitor's item list. */
export type QuoteItem = {
  /** Client-side row id — stable across edits, not the database id. */
  key: string;
  catalogueItemId: string | null;
  name: string;
  quantity: number;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  weightKg: number | null;
  /** Per-unit volume. Multiply by quantity for the line total. */
  volumeM3: number;
};

export type QuoteStop = {
  key: string;
  addressText: string;
  /**
   * Street address, collected at checkout (Phase 8B) rather than during the
   * quote flow, which only ever asks for a postcode. Kept separate from
   * `addressText` — that holds the postcodes.io label ("M1, Bushey, UK") that
   * drives the route map and the "Bushey to Theydon Bois" summary, and would
   * be lost if the street address overwrote it.
   */
  addressLine: string | null;
  postcode: string | null;
  outcode: string | null;
  lat: number | null;
  lng: number | null;
  floor: FloorLevel;
  hasLift: boolean;
};

/** An hour-granularity window on the day of the move. */
export type TimeWindow = {
  startHour: number;
  endHour: number;
};

export function totalVolumeM3(items: QuoteItem[]): number {
  const total = items.reduce((sum, item) => sum + item.volumeM3 * item.quantity, 0);
  return Math.round(total * 1000) / 1000;
}

export function totalItemCount(items: QuoteItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/** "08:00:00" — the shape Postgres `time` columns want. */
export function hourToTimeString(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00:00`;
}

/** 8 → "8am", 13 → "1pm", 18 → "6pm". */
export function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

export function formatWindow(window: TimeWindow): string {
  return `${formatHour(window.startHour)} - ${formatHour(window.endHour)}`;
}
