// Route distance and duration estimation for the /quote flow.
//
// ============================================================================
// THESE ARE ESTIMATES, NOT ROUTED DISTANCES.
// ============================================================================
// We compute the great-circle (haversine) distance between consecutive stops
// and scale it by a winding factor to approximate what a van actually drives.
// There is no routing API call here — no road network, no one-way systems, no
// traffic, no congestion charge, no ferry.
//
// SWAPPING IN A REAL ROUTING API:
// Everything downstream (the pricing engine, the sidebar route summary, the
// jobs.distance_miles column) goes through `calculateRouteDistance()` and
// nothing else in this file is exported for general use. To move to
// OpenRouteService / OSRM / Google Directions, replace the *body* of
// `calculateRouteDistance` with an async call to that provider and change its
// return type to a Promise — the call sites are the only thing that needs
// touching, and the pricing engine and UI stay untouched. The `estimated`
// flag on the result exists so the UI can distinguish a real routed distance
// from this approximation once that swap happens.
//
// Note this stays synchronous and pure deliberately: step 3 re-prices ~35
// calendar dates on every crew-tab switch, and every one of those prices
// depends on the route distance. A network call in this path would make the
// calendar unusable. When a real routing API lands, the route should be
// resolved ONCE (when the visitor leaves step 1) and cached on the quote row,
// not re-fetched per price.

/**
 * Real UK road distance typically exceeds straight-line distance by roughly
 * 25–35% once you account for the road network not going where the crow
 * flies. 1.3 sits in the middle of that band and errs slightly high, which
 * is the safer direction for a price we're quoting to a customer.
 */
export const ROAD_WINDING_FACTOR = 1.3;

/**
 * Blended average speed for a loaded van across mixed urban/A-road/motorway
 * driving, including the stop-start of getting in and out of residential
 * streets at each end. Deliberately conservative — a pure-motorway run beats
 * this comfortably, an all-London move does not.
 */
export const AVERAGE_SPEED_MPH = 35;

/** Mean Earth radius in miles, for the haversine formula. */
const EARTH_RADIUS_MILES = 3958.8;

export type GeoPoint = {
  lat: number;
  lng: number;
};

/** A stop only needs coordinates for distance purposes. */
export type RouteStop = Partial<GeoPoint>;

export type RouteDistanceResult = {
  /** Total approximate driving distance across the whole route, in miles. */
  distanceMiles: number;
  /** Approximate driving time across the whole route, in minutes. */
  durationMinutes: number;
  /**
   * How many stops actually had coordinates. If this is below 2 the route
   * couldn't be measured at all and both figures above are 0.
   */
  resolvedStopCount: number;
  /**
   * True while these numbers come from the haversine approximation rather
   * than a real routing provider. Flip to false in the same change that
   * introduces a routing API, so the UI can stop hedging its wording.
   */
  estimated: true;
};

/** Great-circle distance between two points, in miles. */
export function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

function hasCoords(stop: RouteStop): stop is GeoPoint {
  return typeof stop.lat === "number" && typeof stop.lng === "number";
}

/**
 * The single entry point for "how far is this job, and how long will it
 * take". Sums leg-by-leg across every stop in order, so multi-stop routes
 * are measured properly rather than just first-to-last.
 *
 * Stops without coordinates are skipped rather than treated as (0, 0) — a
 * visitor can legitimately be mid-typing an address when a re-render happens.
 */
export function calculateRouteDistance(stops: RouteStop[]): RouteDistanceResult {
  const points = stops.filter(hasCoords);

  if (points.length < 2) {
    return { distanceMiles: 0, durationMinutes: 0, resolvedStopCount: points.length, estimated: true };
  }

  let straightLineMiles = 0;
  for (let i = 1; i < points.length; i += 1) {
    straightLineMiles += haversineMiles(points[i - 1], points[i]);
  }

  const distanceMiles = straightLineMiles * ROAD_WINDING_FACTOR;
  const durationMinutes = (distanceMiles / AVERAGE_SPEED_MPH) * 60;

  return {
    distanceMiles: Math.round(distanceMiles * 10) / 10,
    durationMinutes: Math.round(durationMinutes),
    resolvedStopCount: points.length,
    estimated: true,
  };
}

/** "49 mins" / "1 hr 25 mins" — shared by the sidebar and the item summary. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours} hr${hours === 1 ? "" : "s"}`;
  return `${hours} hr${hours === 1 ? "" : "s"} ${rest} min${rest === 1 ? "" : "s"}`;
}
