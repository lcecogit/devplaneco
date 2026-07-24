// Turns two UK postcodes into a straight-line driving-ish distance estimate,
// for feeding into estimate-quote.ts. Kept separate from the estimator
// itself: this does network I/O and can fail, the estimator is a pure
// function and should never need to know that.
//
// Uses postcodes.io (https://postcodes.io) — a free, keyless, public UK
// postcode geocoding API — rather than a paid maps provider, since this
// project has no Google Maps/Mapbox key configured yet. If a lookup fails
// (bad postcode, offline, rate limited), we fall back to a flat assumed
// distance rather than blocking the quote flow — the price is already
// labelled as an estimate, so a rough fallback is an acceptable trade-off.

const POSTCODES_IO_BASE_URL = "https://api.postcodes.io/postcodes";

/** Assumed distance when a postcode can't be geocoded, in miles. */
export const FALLBACK_DISTANCE_MILES = 20;

/** Straight-line distance tends to undercount real road distance; this is a simple correction factor. */
export const ROAD_DISTANCE_FACTOR = 1.25;

const EARTH_RADIUS_MILES = 3958.8;

type PostcodesIoLookupResult = {
  result: { latitude: number; longitude: number } | null;
};

async function geocodePostcode(postcode: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `${POSTCODES_IO_BASE_URL}/${encodeURIComponent(postcode.trim())}`
    );
    if (!response.ok) return null;

    const body = (await response.json()) as PostcodesIoLookupResult;
    if (!body.result) return null;

    return { lat: body.result.latitude, lng: body.result.longitude };
  } catch {
    return null;
  }
}

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

export type DistanceLookupResult = {
  distanceMiles: number;
  /** False when either postcode failed to geocode and the fallback was used. */
  resolved: boolean;
};

export async function estimateDistanceMiles(
  collectionPostcode: string,
  deliveryPostcode: string
): Promise<DistanceLookupResult> {
  const [from, to] = await Promise.all([
    geocodePostcode(collectionPostcode),
    geocodePostcode(deliveryPostcode),
  ]);

  if (!from || !to) {
    return { distanceMiles: FALLBACK_DISTANCE_MILES, resolved: false };
  }

  const straightLine = haversineMiles(from, to);
  return { distanceMiles: Math.round(straightLine * ROAD_DISTANCE_FACTOR * 10) / 10, resolved: true };
}
