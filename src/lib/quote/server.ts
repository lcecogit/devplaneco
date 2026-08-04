import "server-only";

// Server-side quote persistence, shared by the /api/quote route handlers.
//
// Everything here runs with the service-role client, so it is the single
// place responsible for validating what the browser sent. Nothing in this
// file may trust a client-supplied price, volume, or distance — those are
// all recomputed here from the stops and items, which are the only things a
// visitor actually chooses.

import { createAdminClient } from "@/lib/supabase/admin";
import { calculateRouteDistance } from "@/lib/geo/distance";
import { ukToday } from "@/lib/time/uk-datetime";
import { calculatePrice, FULL_DAY_WINDOW, type CrewSize } from "@/lib/pricing/calculate-price";
import {
  FLOOR_OPTIONS,
  floorCanHaveLift,
  hourToTimeString,
  totalVolumeM3,
  type FloorLevel,
  type QuoteItem,
  type QuoteStop,
  type TimeWindow,
} from "@/lib/quote/types";
import type { ItemPayload, QuoteDraft, StopPayload } from "@/lib/quote/api";
import type { PriceBreakdown } from "@/lib/pricing/calculate-price";
import type { Database } from "@/types/database";

export type QuoteUpdate = Database["public"]["Tables"]["quotes"]["Update"];

const VALID_FLOORS = new Set<string>(FLOOR_OPTIONS.map((option) => option.value));

/** A route can't be one stop, and nobody legitimately needs more than this. */
export const MIN_STOPS = 2;
export const MAX_STOPS = 8;
export const MAX_ITEM_LINES = 200;
export const MAX_ITEM_QUANTITY = 99;

export class QuoteRequestError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clampLat(value: number | null): number | null {
  return value !== null && value >= -90 && value <= 90 ? value : null;
}

function clampLng(value: number | null): number | null {
  return value !== null && value >= -180 && value <= 180 ? value : null;
}

export function parseStops(raw: unknown): StopPayload[] {
  if (!Array.isArray(raw) || raw.length < MIN_STOPS) {
    throw new QuoteRequestError("A quote needs at least a pickup and a delivery address.");
  }
  if (raw.length > MAX_STOPS) {
    throw new QuoteRequestError(`A route can have at most ${MAX_STOPS} stops.`);
  }

  return raw.map((entry) => {
    const stop = (entry ?? {}) as Record<string, unknown>;
    const floor = typeof stop.floor === "string" && VALID_FLOORS.has(stop.floor)
      ? (stop.floor as FloorLevel)
      : "ground";

    return {
      addressText: String(stop.addressText ?? "").slice(0, 300),
      addressLine: stop.addressLine ? String(stop.addressLine).trim().slice(0, 300) || null : null,
      postcode: stop.postcode ? String(stop.postcode).slice(0, 12) : null,
      outcode: stop.outcode ? String(stop.outcode).slice(0, 6) : null,
      lat: clampLat(asFiniteNumber(stop.lat)),
      lng: clampLng(asFiniteNumber(stop.lng)),
      floor,
      // A lift is meaningless on the ground floor or in a basement; drop the
      // flag rather than storing a value the UI would never have shown.
      hasLift: floorCanHaveLift(floor) && stop.hasLift === true,
    };
  });
}

export function parseItems(raw: unknown): ItemPayload[] {
  if (!Array.isArray(raw)) {
    throw new QuoteRequestError("Items must be a list.");
  }
  if (raw.length > MAX_ITEM_LINES) {
    throw new QuoteRequestError(`A quote can have at most ${MAX_ITEM_LINES} item lines.`);
  }

  return raw.map((entry) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const name = String(item.name ?? "").trim().slice(0, 120);
    if (!name) throw new QuoteRequestError("Every item needs a name.");

    const quantity = Math.min(
      MAX_ITEM_QUANTITY,
      Math.max(1, Math.round(asFiniteNumber(item.quantity) ?? 1))
    );
    // Volume is capped rather than rejected: a mistyped custom item
    // shouldn't 500 the flow, and an absurd figure is visible in the
    // sidebar's running m3 total anyway.
    const volumeM3 = Math.min(200, Math.max(0, asFiniteNumber(item.volumeM3) ?? 0));

    return {
      catalogueItemId: item.catalogueItemId ? String(item.catalogueItemId) : null,
      name,
      quantity,
      lengthCm: asFiniteNumber(item.lengthCm),
      widthCm: asFiniteNumber(item.widthCm),
      heightCm: asFiniteNumber(item.heightCm),
      weightKg: asFiniteNumber(item.weightKg),
      volumeM3,
    };
  });
}

export function parseCrewSize(raw: unknown): CrewSize {
  return raw === 2 ? 2 : 1;
}

/** yyyy-mm-dd, and a real calendar date. */
export function parseDate(raw: unknown): string | null {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : raw;
}

export function parseWindow(raw: unknown): TimeWindow | null {
  const window = (raw ?? {}) as Record<string, unknown>;
  const startHour = asFiniteNumber(window.startHour);
  const endHour = asFiniteNumber(window.endHour);
  if (startHour === null || endHour === null) return null;

  const start = Math.min(23, Math.max(0, Math.round(startHour)));
  const end = Math.min(24, Math.max(start + 1, Math.round(endHour)));
  return { startHour: start, endHour: end };
}

/** Deliberately permissive — this is an optional convenience field, not a login. */
export function parseEmail(raw: unknown): string | null {
  if (raw === null) return null;
  if (typeof raw !== "string") return null;
  const email = raw.trim().slice(0, 254);
  if (!email) return null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new QuoteRequestError("That doesn't look like a valid email address.");
  }
  return email;
}

// ---------------------------------------------------------------------------
// Load / save
// ---------------------------------------------------------------------------

type QuoteRow = {
  id: string;
  reference: string;
  crew_size: number | null;
  total_volume_m3: number | null;
  distance_miles: number | null;
  duration_minutes: number | null;
  collection_window_start: string | null;
  collection_window_end: string | null;
  delivery_window_start: string | null;
  delivery_window_end: string | null;
  helper_included: boolean;
  selected_date: string | null;
  price_breakdown: unknown;
  total_price: number | null;
  email: string | null;
  marketing_opt_in: boolean;
  category_hint: string | null;
  status: string;
  contact_name: string | null;
  contact_phone: string | null;
  access_notes: string | null;
  terms_accepted_at: string | null;
  cover_tier: string;
  extended_cover_declared_value: number | null;
  extended_cover_notes: string | null;
};

function hourFromTime(value: string | null): number | null {
  if (!value) return null;
  const hour = Number(value.slice(0, 2));
  return Number.isFinite(hour) ? hour : null;
}

function windowFrom(start: string | null, end: string | null): TimeWindow | null {
  const startHour = hourFromTime(start);
  const endHour = hourFromTime(end);
  if (startHour === null || endHour === null) return null;
  return { startHour, endHour };
}

export async function loadQuote(id: string): Promise<QuoteDraft> {
  // Fail fast on a malformed id rather than letting Postgres throw 22P02.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new QuoteRequestError("Quote not found.", 404);
  }

  const supabase = createAdminClient();

  const [{ data: quote, error }, { data: stops }, { data: items }] = await Promise.all([
    supabase.from("quotes").select("*").eq("id", id).maybeSingle(),
    supabase.from("quote_stops").select("*").eq("quote_id", id).order("sequence"),
    supabase.from("quote_items").select("*").eq("quote_id", id).order("created_at"),
  ]);

  if (error) throw new QuoteRequestError(error.message, 500);
  if (!quote) throw new QuoteRequestError("Quote not found.", 404);

  return serializeQuote(quote as unknown as QuoteRow, stops ?? [], items ?? []);
}

type StopRow = {
  id: string;
  address_text: string | null;
  address_line: string | null;
  postcode: string | null;
  outcode: string | null;
  lat: number | null;
  lng: number | null;
  floor: FloorLevel;
  has_lift: boolean;
};

type ItemRow = {
  id: string;
  catalogue_item_id: string | null;
  custom_name: string | null;
  quantity: number;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  volume_m3: number;
};

function serializeQuote(
  quote: QuoteRow,
  stopRows: unknown[],
  itemRows: unknown[]
): QuoteDraft {
  const stops: QuoteStop[] = (stopRows as StopRow[]).map((row) => ({
    key: row.id,
    addressText: row.address_text ?? "",
    addressLine: row.address_line,
    postcode: row.postcode,
    outcode: row.outcode,
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
    floor: row.floor,
    hasLift: row.has_lift,
  }));

  const items: QuoteItem[] = (itemRows as ItemRow[]).map((row) => ({
    key: row.id,
    catalogueItemId: row.catalogue_item_id,
    // custom_name doubles as the display name for catalogue items too — it's
    // written on every row so the item list survives a catalogue rename the
    // same way the dimensions do.
    name: row.custom_name ?? "Item",
    quantity: row.quantity,
    lengthCm: row.length_cm === null ? null : Number(row.length_cm),
    widthCm: row.width_cm === null ? null : Number(row.width_cm),
    heightCm: row.height_cm === null ? null : Number(row.height_cm),
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
    volumeM3: Number(row.volume_m3),
  }));

  return {
    id: quote.id,
    reference: quote.reference,
    stops,
    items,
    totalVolumeM3: quote.total_volume_m3 === null ? 0 : Number(quote.total_volume_m3),
    distanceMiles: quote.distance_miles === null ? 0 : Number(quote.distance_miles),
    durationMinutes: quote.duration_minutes ?? 0,
    crewSize: quote.crew_size === 2 ? 2 : quote.crew_size === 1 ? 1 : null,
    selectedDate: quote.selected_date,
    collectionWindow: windowFrom(quote.collection_window_start, quote.collection_window_end),
    deliveryWindow: windowFrom(quote.delivery_window_start, quote.delivery_window_end),
    helperIncluded: quote.helper_included,
    totalPrice: quote.total_price === null ? null : Number(quote.total_price),
    priceBreakdown: (quote.price_breakdown as PriceBreakdown | null) ?? null,
    email: quote.email,
    marketingOptIn: quote.marketing_opt_in,
    categoryHint: quote.category_hint,
    status: quote.status as QuoteDraft["status"],
    contactName: quote.contact_name,
    contactPhone: quote.contact_phone,
    accessNotes: quote.access_notes,
    termsAcceptedAt: quote.terms_accepted_at,
    coverTier: quote.cover_tier === "extended_requested" ? "extended_requested" : "standard",
    extendedCoverDeclaredValue:
      quote.extended_cover_declared_value === null ? null : Number(quote.extended_cover_declared_value),
    extendedCoverNotes: quote.extended_cover_notes,
  };
}

/**
 * Which customer (if any) a quote belongs to.
 *
 * Deliberately NOT part of QuoteDraft: that shape is returned by
 * `GET /api/quote/[id]`, which anyone holding the quote's UUID can call, and
 * an internal customer id has no business travelling over that endpoint.
 * Checkout and the booking function read it through here instead.
 */
export async function getQuoteOwner(quoteId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("quotes")
    .select("customer_id")
    .eq("id", quoteId)
    .maybeSingle();
  return data?.customer_id ?? null;
}

/**
 * Attaches a quote to a customer, but only if it's still unclaimed.
 *
 * The `is('customer_id', null)` filter is the whole point: the quote UUID is a
 * capability token that anyone with the link holds, so without it a second
 * signed-in visitor opening a shared link would silently take over someone
 * else's quote. Returns the owner as it stands afterwards.
 */
export async function claimQuoteForCustomer(
  quoteId: string,
  customerId: string
): Promise<string | null> {
  // `.select()` makes the update return the row it wrote, so the answer comes
  // back in the same round trip instead of needing a follow-up read.
  const { data } = await createAdminClient()
    .from("quotes")
    .update({ customer_id: customerId })
    .eq("id", quoteId)
    .is("customer_id", null)
    .select("customer_id")
    .maybeSingle();

  // No row updated means it was already claimed — by us or by someone else.
  return data?.customer_id ?? (await getQuoteOwner(quoteId));
}

/** Replaces a quote's stops wholesale and returns the recomputed route. */
export async function writeStops(quoteId: string, stops: StopPayload[]) {
  const supabase = createAdminClient();

  const { error: deleteError } = await supabase
    .from("quote_stops")
    .delete()
    .eq("quote_id", quoteId);
  if (deleteError) throw new QuoteRequestError(deleteError.message, 500);

  const { error: insertError } = await supabase.from("quote_stops").insert(
    stops.map((stop, index) => ({
      quote_id: quoteId,
      sequence: index,
      address_text: stop.addressText || null,
      address_line: stop.addressLine,
      postcode: stop.postcode,
      outcode: stop.outcode,
      lat: stop.lat,
      lng: stop.lng,
      floor: stop.floor,
      has_lift: stop.hasLift,
    }))
  );
  if (insertError) throw new QuoteRequestError(insertError.message, 500);

  return calculateRouteDistance(stops.map((stop) => ({ lat: stop.lat ?? undefined, lng: stop.lng ?? undefined })));
}

/** Replaces a quote's items wholesale. */
export async function writeItems(quoteId: string, items: ItemPayload[]) {
  const supabase = createAdminClient();

  const { error: deleteError } = await supabase
    .from("quote_items")
    .delete()
    .eq("quote_id", quoteId);
  if (deleteError) throw new QuoteRequestError(deleteError.message, 500);

  if (items.length === 0) return;

  const { error: insertError } = await supabase.from("quote_items").insert(
    items.map((item) => ({
      quote_id: quoteId,
      catalogue_item_id: item.catalogueItemId,
      custom_name: item.name,
      quantity: item.quantity,
      length_cm: item.lengthCm,
      width_cm: item.widthCm,
      height_cm: item.heightCm,
      weight_kg: item.weightKg,
      volume_m3: item.volumeM3,
    }))
  );
  if (insertError) throw new QuoteRequestError(insertError.message, 500);
}

/**
 * Recompute and persist the price for a quote from its *stored* stops and
 * items. Never takes a price from the client.
 *
 * Returns silently without pricing if the quote isn't priceable yet (no date
 * chosen, or no items) — steps 1 and 2 legitimately save a quote in that
 * state.
 */
export async function repriceQuote(
  quoteId: string
): Promise<{ totalPrice: number | null; breakdown: PriceBreakdown | null }> {
  const draft = await loadQuote(quoteId);
  const supabase = createAdminClient();

  const volume = totalVolumeM3(draft.items);
  const route = calculateRouteDistance(
    draft.stops.map((stop) => ({ lat: stop.lat ?? undefined, lng: stop.lng ?? undefined }))
  );

  const updates: QuoteUpdate = {
    total_volume_m3: volume,
    distance_miles: route.distanceMiles,
    duration_minutes: route.durationMinutes,
  };

  let breakdown: PriceBreakdown | null = null;

  if (draft.selectedDate && draft.crewSize && draft.items.length > 0) {
    breakdown = calculatePrice({
      totalVolumeM3: volume,
      distanceMiles: route.distanceMiles,
      crewSize: draft.crewSize,
      date: draft.selectedDate,
      today: todayIsoDate(),
      stops: draft.stops.map((stop) => ({ floor: stop.floor, hasLift: stop.hasLift })),
      collectionWindow: draft.collectionWindow ?? FULL_DAY_WINDOW,
      deliveryWindow: draft.deliveryWindow ?? FULL_DAY_WINDOW,
      helperIncluded: draft.helperIncluded,
    });
    // The generated Json type can't express our PriceBreakdown shape, but it
    // is plain JSON-serialisable data — hence the one cast.
    updates.price_breakdown = breakdown as unknown as QuoteUpdate["price_breakdown"];
    updates.total_price = breakdown.totalGBP;
  }

  const { error } = await supabase.from("quotes").update(updates).eq("id", quoteId);
  if (error) throw new QuoteRequestError(error.message, 500);

  return { totalPrice: breakdown?.totalGBP ?? null, breakdown };
}

/**
 * "Today" in UK local terms. Lead-time pricing is a business-day concept, so
 * it has to be anchored to the market's timezone, not to whatever the server
 * happens to be set to.
 */
export const todayIsoDate = ukToday;

export { hourToTimeString };
