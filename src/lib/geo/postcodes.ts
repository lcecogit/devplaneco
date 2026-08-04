// UK address lookup via postcodes.io (https://api.postcodes.io).
//
// Free, keyless, open-data (ONS Postcode Directory) — no account, no billing,
// no API key to leak. That's why it's here instead of Google Places.
//
// BEING A GOOD CITIZEN: postcodes.io is a free public service run on
// donations. Everything in this module is built to keep our request count
// low:
//   - callers debounce keystrokes (see DEBOUNCE_MS, used by AddressLookup)
//   - every response is memoised in a module-level cache for the lifetime of
//     the page, so re-typing or stepping back through the flow costs nothing
//   - in-flight requests are deduped, so two components asking for the same
//     postcode at once make one network call
//   - queries shorter than MIN_QUERY_LENGTH never leave the browser
// If this ever gets real traffic, the right next step is to proxy through our
// own server with a shared cache, not to raise the request rate from clients.

/** Typeahead waits this long after the last keystroke before querying. */
export const DEBOUNCE_MS = 300;

/** Don't bother the API with one or two characters — too broad to be useful. */
export const MIN_QUERY_LENGTH = 2;

const API_BASE = "https://api.postcodes.io";

export type ResolvedAddress = {
  /** Normalised postcode as postcodes.io returns it, e.g. "M1 1AE". */
  postcode: string;
  /** Outward code, e.g. "M1". Null when we only resolved an outcode query. */
  outcode: string;
  lat: number;
  lng: number;
  /** District-level label for display, e.g. "M1, Manchester, UK". */
  label: string;
  adminDistrict: string | null;
  region: string | null;
};

type PostcodeResult = {
  postcode: string;
  outcode: string;
  latitude: number | null;
  longitude: number | null;
  admin_district: string | null;
  admin_ward: string | null;
  region: string | null;
};

type OutcodeResult = {
  outcode: string;
  latitude: number | null;
  longitude: number | null;
  admin_district: string[] | null;
  region: string[] | null;
};

// ---------------------------------------------------------------------------
// Caching
// ---------------------------------------------------------------------------
// Module-level so it's shared across every component on the page and survives
// step navigation. Not persisted — a page reload legitimately re-validates.

const suggestionCache = new Map<string, string[]>();
const lookupCache = new Map<string, ResolvedAddress | null>();
const inFlight = new Map<string, Promise<unknown>>();

function normaliseKey(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

/** Dedupes concurrent identical requests onto a single promise. */
function once<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = run().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`);
    // 404 is postcodes.io's "no such postcode", not an error worth throwing.
    if (!response.ok) return null;
    const body = (await response.json()) as { result: T | null };
    return body.result ?? null;
  } catch {
    // Offline / blocked / rate limited. The caller degrades to "we couldn't
    // verify that postcode" rather than breaking the flow.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Is this plausibly a full UK postcode (as opposed to a partial/outcode)? */
export function looksLikeFullPostcode(value: string): boolean {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(value.trim());
}

/**
 * Typeahead suggestions for a partial postcode. Returns normalised postcode
 * strings, e.g. ["M1 1AE", "M1 1AF", ...].
 */
export async function suggestPostcodes(query: string): Promise<string[]> {
  const key = normaliseKey(query);
  if (key.length < MIN_QUERY_LENGTH) return [];

  const cached = suggestionCache.get(key);
  if (cached) return cached;

  return once(`suggest:${key}`, async () => {
    const result = await getJson<string[]>(
      `/postcodes/${encodeURIComponent(key)}/autocomplete`
    );
    const suggestions = result ?? [];
    suggestionCache.set(key, suggestions);
    return suggestions;
  });
}

/**
 * Full lookup for a postcode — the one that gives us the lat/lng we actually
 * store on the stop and feed to distance calculation.
 *
 * Falls back to an outcode lookup ("M1") when the input isn't a full
 * postcode, so a visitor who only knows their area still gets a usable
 * (centroid-accurate) quote rather than a dead end.
 */
export async function lookupPostcode(value: string): Promise<ResolvedAddress | null> {
  const key = normaliseKey(value);
  if (key.length < MIN_QUERY_LENGTH) return null;

  if (lookupCache.has(key)) return lookupCache.get(key) ?? null;

  return once(`lookup:${key}`, async () => {
    const resolved = looksLikeFullPostcode(key)
      ? await lookupFullPostcode(key)
      : await lookupOutcode(key);

    lookupCache.set(key, resolved);
    return resolved;
  });
}

async function lookupFullPostcode(key: string): Promise<ResolvedAddress | null> {
  const result = await getJson<PostcodeResult>(`/postcodes/${encodeURIComponent(key)}`);
  if (!result || result.latitude == null || result.longitude == null) return null;

  return {
    postcode: result.postcode,
    outcode: result.outcode,
    lat: result.latitude,
    lng: result.longitude,
    label: buildLabel(result.outcode, result.admin_ward ?? result.admin_district),
    adminDistrict: result.admin_district,
    region: result.region,
  };
}

async function lookupOutcode(key: string): Promise<ResolvedAddress | null> {
  const result = await getJson<OutcodeResult>(`/outcodes/${encodeURIComponent(key)}`);
  if (!result || result.latitude == null || result.longitude == null) return null;

  const district = result.admin_district?.[0] ?? null;

  return {
    postcode: result.outcode,
    outcode: result.outcode,
    lat: result.latitude,
    lng: result.longitude,
    label: buildLabel(result.outcode, district),
    adminDistrict: district,
    region: result.region?.[0] ?? null,
  };
}

/**
 * District-level display label, e.g. "M1, Bushey, UK". Deliberately coarse —
 * we never show a street-level address back to the visitor at quote stage,
 * because we only ever asked for a postcode.
 */
function buildLabel(outcode: string, district: string | null): string {
  return [outcode, district, "UK"].filter(Boolean).join(", ");
}
