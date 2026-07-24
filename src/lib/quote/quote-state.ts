"use client";

import { useCallback, useEffect, useState } from "react";
import type { ItemSizeTier } from "@/lib/pricing/estimate-quote";

// In-progress quote state, held in sessionStorage — not the database — until
// the visitor confirms a real booking. This lets an anonymous visitor start
// and progress a quote, get sent off to sign up/log in partway through, and
// come back to /quote afterward without losing what they entered. Session
// (not local) storage is deliberate: an abandoned quote shouldn't linger
// across browser sessions.

export type QuoteCategory =
  | "home-removals"
  | "single-item-transport"
  | "office-relocation"
  | "car-transport"
  | "motorbike-transport"
  | "piano-moving"
  | "international-moves";

export type TimeWindow = "morning" | "afternoon" | "evening" | "flexible";

/** Label + 24h clock hour range for each time window, shared between the
 * route step (display) and the booking confirmation (building the
 * collection/delivery window timestamps sent to the database). */
export const TIME_WINDOW_OPTIONS: {
  value: TimeWindow;
  label: string;
  startHour: number;
  endHour: number;
}[] = [
  { value: "morning", label: "Morning (8am–12pm)", startHour: 8, endHour: 12 },
  { value: "afternoon", label: "Afternoon (12pm–5pm)", startHour: 12, endHour: 17 },
  { value: "evening", label: "Evening (5pm–8pm)", startHour: 17, endHour: 20 },
  { value: "flexible", label: "I'm flexible", startHour: 8, endHour: 20 },
];

export type QuoteItemDetails = {
  roomCount?: number;
  itemSizeTier?: ItemSizeTier;
};

export type QuoteEstimate = {
  priceGBP: number;
  distanceMiles: number;
  distanceResolved: boolean;
};

export type QuoteState = {
  category?: QuoteCategory;
  collectionPostcode?: string;
  collectionAddress?: string;
  deliveryPostcode?: string;
  deliveryAddress?: string;
  preferredDate?: string; // yyyy-mm-dd
  timeWindow?: TimeWindow;
  itemDetails?: QuoteItemDetails;
  estimate?: QuoteEstimate;
};

/** A quote with every field needed to book it actually present. */
export type BookableQuote = Required<
  Pick<
    QuoteState,
    "category" | "collectionPostcode" | "deliveryPostcode" | "preferredDate" | "timeWindow" | "estimate"
  >
> &
  QuoteState;

export function isBookableQuote(state: QuoteState): state is BookableQuote {
  return Boolean(
    state.category &&
      state.collectionPostcode &&
      state.deliveryPostcode &&
      state.preferredDate &&
      state.timeWindow &&
      state.estimate
  );
}

const STORAGE_KEY = "movers-now:quote-state";

function readFromStorage(): QuoteState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QuoteState) : {};
  } catch {
    return {};
  }
}

function writeToStorage(state: QuoteState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearQuoteState() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

/** Has the visitor filled in everything needed to show step 4 (the estimate)? */
export function isQuoteReadyForEstimate(state: QuoteState): boolean {
  return Boolean(
    state.category &&
      state.collectionPostcode &&
      state.deliveryPostcode &&
      state.preferredDate &&
      state.timeWindow
  );
}

export function useQuoteState() {
  const [state, setState] = useState<QuoteState>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readFromStorage());
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<QuoteState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      writeToStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    clearQuoteState();
    setState({});
  }, []);

  return { state, hydrated, update, clear };
}
