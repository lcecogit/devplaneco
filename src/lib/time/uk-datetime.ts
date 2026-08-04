// Turning a UK calendar date + wall-clock hour into a real instant.
//
// WHY THIS EXISTS
// The quote flow stores a `date` (yyyy-mm-dd) and hour-granularity time
// windows — both UK wall-clock concepts. `jobs.collection_window_start` and
// friends are `timestamptz`, i.e. actual instants. Converting between the two
// is the only place in the codebase where a timezone mistake silently
// produces a booking an hour off, twice a year, for half the year.
//
// Phase 5's booking code did `new Date(\`${date}T00:00:00\`)` + `setHours()`,
// which resolves against the SERVER's timezone. That happens to be UTC on
// Netlify, so every summer (BST) booking would have been written an hour
// early. This module fixes that by resolving against Europe/London
// explicitly, regardless of where the code runs.

const LONDON = "Europe/London";

const LONDON_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/**
 * What UTC instant would show this same wall-clock reading if it were read in
 * London? Used to measure London's offset at a given instant.
 */
function londonWallClockAsUtc(instant: Date): number {
  const parts = LONDON_PARTS.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  // Intl renders midnight as hour "24" in some engines; normalise it.
  const hour = get("hour") % 24;

  return Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
}

/**
 * `2026-08-14` + hour `9` → the ISO instant for 9am *London time* on that
 * date (08:00Z in summer, 09:00Z in winter).
 *
 * We're solving for the instant `t` where `londonWallClockAsUtc(t)` equals the
 * requested wall clock. Guess once using the offset at the naive instant,
 * then correct by however much that guess still reads wrong. The correction
 * is always measured against the TARGET, never against the running guess —
 * measuring against the guess just re-applies the offset and lands an hour
 * early, which is exactly the bug this replaced.
 *
 * Two passes converge everywhere: the first lands within an hour, the second
 * fixes the case where the first guess fell on the far side of a DST
 * boundary.
 */
export function ukWallClockToUtcIso(dateIso: string, hour: number): string {
  const clampedHour = Math.min(23, Math.max(0, Math.round(hour)));
  const target = Date.parse(`${dateIso}T${String(clampedHour).padStart(2, "0")}:00:00Z`);
  if (Number.isNaN(target)) {
    throw new Error(`Not a date: ${dateIso}`);
  }

  let instant = target;
  for (let pass = 0; pass < 2; pass += 1) {
    const drift = londonWallClockAsUtc(new Date(instant)) - target;
    if (drift === 0) break;
    instant -= drift;
  }

  return new Date(instant).toISOString();
}

/** "Today" in UK local terms, as yyyy-mm-dd. */
export function ukToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LONDON,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
