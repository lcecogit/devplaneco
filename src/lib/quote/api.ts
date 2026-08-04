// The wire format between the /quote UI and the /api/quote route handlers,
// plus thin client-side fetch helpers.
//
// Why an API layer at all, when the rest of this app talks to Supabase
// directly from the browser? Because a quote belongs to nobody until
// checkout — an anonymous visitor has no auth.uid() for RLS to key ownership
// on. Rather than opening a `using (true)` read policy on `quotes` (which
// would let anyone enumerate every quote and its addresses), the quote tables
// are locked to service-role and reached only through these routes, with the
// quote's unguessable UUID acting as the capability token. See the RLS
// comment block in migration 0030.
//
// The server also recalculates the price on every save rather than storing
// whatever number the browser sent. The client-side calculation is for
// instant feedback; the stored `total_price` is the authoritative one, and
// Phase 8B's checkout must price off the stored value, not a posted one.

import type { FloorLevel, QuoteItem, QuoteStop, TimeWindow } from "@/lib/quote/types";
import type { CrewSize, PriceBreakdown } from "@/lib/pricing/calculate-price";

export type QuoteDraft = {
  id: string;
  reference: string;
  stops: QuoteStop[];
  items: QuoteItem[];
  totalVolumeM3: number;
  distanceMiles: number;
  durationMinutes: number;
  crewSize: CrewSize | null;
  selectedDate: string | null;
  collectionWindow: TimeWindow | null;
  deliveryWindow: TimeWindow | null;
  helperIncluded: boolean;
  totalPrice: number | null;
  priceBreakdown: PriceBreakdown | null;
  email: string | null;
  marketingOptIn: boolean;
  categoryHint: string | null;
  /** 'in_progress' until checkout converts it into a real booking. */
  status: "in_progress" | "converted" | "abandoned";
  /** Checkout fields (Phase 8B) — null until /quote/checkout collects them. */
  contactName: string | null;
  contactPhone: string | null;
  accessNotes: string | null;
  termsAcceptedAt: string | null;
  /**
   * 'standard' unless the customer asked for Extended Liability Cover at
   * checkout, in which case it's a REQUEST for staff to quote — there's no
   * fixed price to charge, see src/lib/constants/liability-cover.ts.
   */
  coverTier: "standard" | "extended_requested";
  extendedCoverDeclaredValue: number | null;
  extendedCoverNotes: string | null;
};

export type StopPayload = {
  addressText: string;
  addressLine: string | null;
  postcode: string | null;
  outcode: string | null;
  lat: number | null;
  lng: number | null;
  floor: FloorLevel;
  hasLift: boolean;
};

export type ItemPayload = {
  catalogueItemId: string | null;
  name: string;
  quantity: number;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  weightKg: number | null;
  volumeM3: number;
};

export type CreateQuotePayload = {
  stops: StopPayload[];
  categoryHint?: string | null;
};

export type UpdateQuotePayload = {
  stops?: StopPayload[];
  items?: ItemPayload[];
  crewSize?: CrewSize;
  selectedDate?: string | null;
  collectionWindow?: TimeWindow;
  deliveryWindow?: TimeWindow;
  helperIncluded?: boolean;
  email?: string | null;
  marketingOptIn?: boolean;
};

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((body as { error?: string }).error || "Something went wrong.");
  }
  return body;
}

export async function createQuote(payload: CreateQuotePayload): Promise<QuoteDraft> {
  const response = await fetch("/api/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await readJson(response)).quote as QuoteDraft;
}

export async function fetchQuote(id: string): Promise<QuoteDraft> {
  const response = await fetch(`/api/quote/${id}`, { cache: "no-store" });
  return (await readJson(response)).quote as QuoteDraft;
}

export async function updateQuote(id: string, payload: UpdateQuotePayload): Promise<QuoteDraft> {
  const response = await fetch(`/api/quote/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await readJson(response)).quote as QuoteDraft;
}
