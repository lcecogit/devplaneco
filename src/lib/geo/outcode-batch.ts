// Server-side geocoding for outward codes (e.g. "SW1A", "M1") — used to plot
// Find Work's map pins. Separate from lib/geo/postcodes.ts, which is
// deliberately browser-only (module-level cache scoped to one page session,
// used by the quote flow's address typeahead). This runs in a Server
// Component instead, so it gets its own small process-lifetime cache rather
// than sharing that one.
//
// postcodes.io has no bulk outcode endpoint — /outcodes only supports single
// lookups (GET /outcodes/:outcode) or a nearby-point search, unlike
// /postcodes which does have a real bulk POST. Confirmed live: a bulk
// POST /outcodes 404s. So this fetches each uncached outcode individually,
// in parallel — fine at Find Work's scale (a handful of distinct outward
// codes per page, not hundreds).

const API_BASE = "https://api.postcodes.io";
const MAX_CONCURRENT = 20;

export type OutcodePoint = { outcode: string; lat: number; lng: number };

const cache = new Map<string, OutcodePoint | null>();

/** Geocodes a set of outward codes, returning only the ones that resolved. */
export async function geocodeOutcodes(outcodes: string[]): Promise<OutcodePoint[]> {
  const unique = Array.from(new Set(outcodes.map((o) => o.trim().toUpperCase()).filter(Boolean)));

  const uncached = unique.filter((o) => !cache.has(o));
  for (let i = 0; i < uncached.length; i += MAX_CONCURRENT) {
    const batch = uncached.slice(i, i + MAX_CONCURRENT);
    await Promise.all(batch.map(fetchOne));
  }

  return unique
    .map((o) => cache.get(o))
    .filter((point): point is OutcodePoint => point != null);
}

async function fetchOne(outcode: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/outcodes/${encodeURIComponent(outcode)}`);

    if (!response.ok) {
      cache.set(outcode, null);
      return;
    }

    const body = (await response.json()) as {
      result: { outcode: string; latitude: number | null; longitude: number | null } | null;
    };

    if (body.result?.latitude != null && body.result?.longitude != null) {
      cache.set(outcode, { outcode, lat: body.result.latitude, lng: body.result.longitude });
    } else {
      cache.set(outcode, null);
    }
  } catch {
    // Offline / blocked / rate limited — the map just shows fewer pins than
    // jobs rather than breaking the page.
    cache.set(outcode, null);
  }
}
