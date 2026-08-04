// Feature switches for the /quote flow. Both default OFF, both deliberately.

/**
 * Whether to render scarcity/availability badges ("One slot left", "3 vans
 * available") on calendar dates.
 *
 * ===========================================================================
 * DO NOT TURN THIS ON UNTIL THERE IS REAL PARTNER AVAILABILITY DATA.
 * ===========================================================================
 * The rendering capability exists (see AvailabilityBadge in PriceCalendar),
 * but there is currently no source of truth for how many partners are free on
 * a given date — partner availability isn't modelled anywhere in the schema
 * yet. With this false, the badge renders nothing at all.
 *
 * If you are here because the calendar "looks empty": the fix is to build a
 * real availability source and feed it in. It is NOT to generate a random
 * number or a date-seeded pseudo-random one. Inventing scarcity to pressure a
 * purchase is a misleading commercial practice under the UK's Digital
 * Markets, Competition and Consumers Act 2024 (and the CPRs before it), and
 * the CMA has taken enforcement action over exactly this pattern in the
 * accommodation-booking sector. It is a legal risk, not just a taste
 * question.
 */
export const SHOW_AVAILABILITY_BADGES = false;

/**
 * Whether to hide prices behind an email capture form on step 3.
 *
 * The reference design we're working from does this. We deliberately don't:
 * a visitor who has told us what they're moving and where has earned the
 * number, and gating it is the single most common reason people abandon a
 * quote flow. The gated variant is implemented (see EmailGate in
 * DateStep) so it can be A/B tested later by flipping this, but off is the
 * default and the intended behaviour.
 *
 * When on, the email is still only ever *requested* — the form has a "show me
 * prices without emailing" escape hatch, because a hard gate on a price we've
 * already calculated is not something we want to ship.
 */
export const GATE_PRICES_BEHIND_EMAIL = false;
