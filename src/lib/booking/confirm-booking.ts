import "server-only";

// Turning a priced quote into a real booking.
//
// ===========================================================================
// WHERE STRIPE ATTACHES  (read this before changing anything in here)
// ===========================================================================
// Today this function is called directly from the confirm action in
// src/app/api/quote/[id]/confirm/route.ts, immediately after the customer
// ticks the terms box. No money moves.
//
// When Stripe is added, the ONLY change on this side is that the direct call
// is removed and the Stripe webhook handler calls this same function instead:
//
//   1. The confirm action creates a PaymentIntent for `quotes.total_price`
//      (converted to pence) with `metadata: { quote_id }`, and returns its
//      client secret instead of calling confirmBookingAndCreateJob().
//   2. A new route — src/app/api/webhooks/stripe/route.ts — verifies the
//      signature and, on `payment_intent.succeeded`, calls
//      `confirmBookingAndCreateJob(event.data.object.metadata.quote_id)`.
//      That is the one-line swap.
//   3. It then updates the customer_payments row this function created:
//      status -> 'succeeded', provider -> 'stripe', provider_payment_id ->
//      the PaymentIntent id, payment_method_type -> from the charge.
//
// That works because this function takes ONE argument. Everything it needs —
// contact details, access notes, terms acceptance, the price — is already
// persisted on the quote by the time it runs, so it never needs a request
// body, a session, or a browser. Keep it that way: if you find yourself
// wanting to pass a second argument, put the value on the quote instead.
//
// It is also idempotent, which is not optional once a webhook is the caller —
// Stripe retries deliveries, and a retry must not produce a second booking.
// The real guard is the unique index on jobs.quote_id (migration 0032); the
// quotes.status check below is just a cheaper fast path.
// ===========================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { assignAllocationMethod } from "@/lib/allocation/assign-method";
import { deriveJobCategory, JOB_CATEGORY_TITLES } from "@/lib/quote/derive-category";
import { getQuoteOwner, loadQuote } from "@/lib/quote/server";
import { FULL_DAY_WINDOW } from "@/lib/pricing/calculate-price";
import { ukWallClockToUtcIso } from "@/lib/time/uk-datetime";
import type { QuoteDraft } from "@/lib/quote/api";
import type { TimeWindow } from "@/lib/quote/types";

/** Postgres unique-violation. Raised by the jobs.quote_id index on a double call. */
const UNIQUE_VIOLATION = "23505";

export type ConfirmBookingResult = {
  jobId: string;
  quoteId: string;
  reference: string;
  /** False when the booking already existed — a retry, not a new job. */
  created: boolean;
};

export class BookingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Creates the real booking for a quote: the `jobs` row, its stops and items,
 * the customer's payment record, and the allocation-method assignment that
 * Phase 6/7 matching depends on. Marks the quote `converted`.
 *
 * Safe to call more than once for the same quote — a second call returns the
 * existing booking with `created: false` rather than duplicating it.
 *
 * Runs entirely through the service-role client. That's deliberate: the
 * eventual caller is a Stripe webhook with no user session at all, so this
 * must not depend on RLS for anything. Ownership is therefore checked by the
 * caller (the confirm route verifies the signed-in customer owns the quote)
 * before it gets here.
 */
export async function confirmBookingAndCreateJob(quoteId: string): Promise<ConfirmBookingResult> {
  const admin = createAdminClient();
  const [quote, customerId] = await Promise.all([loadQuote(quoteId), getQuoteOwner(quoteId)]);

  // --- Fast path: already converted ------------------------------------
  if (quote.status === "converted") {
    const existing = await findJobForQuote(quoteId);
    if (existing) {
      return { jobId: existing, quoteId, reference: quote.reference, created: false };
    }
    // Converted but no job: a previous run died between the two writes.
    // Fall through and let the unique index arbitrate.
  }

  // --- Preconditions ----------------------------------------------------
  // Everything below is checked here rather than trusted from the caller,
  // because the webhook caller has no way to check any of it.
  if (!customerId) {
    throw new BookingError("This quote isn't linked to an account yet.", 409);
  }
  if (!quote.selectedDate) {
    throw new BookingError("Pick a moving date before booking.", 409);
  }
  if (quote.items.length === 0) {
    throw new BookingError("This quote has no items on it.", 409);
  }
  if (quote.stops.length < 2) {
    throw new BookingError("This quote doesn't have a full route.", 409);
  }
  if (quote.totalPrice === null) {
    throw new BookingError("This quote hasn't been priced yet.", 409);
  }

  const first = quote.stops[0];
  const last = quote.stops[quote.stops.length - 1];
  if (!first.postcode || !last.postcode) {
    throw new BookingError("Both ends of the route need a postcode.", 409);
  }

  // --- Derived fields ---------------------------------------------------
  const category = deriveJobCategory(quote.items, quote.stops.length, quote.categoryHint);

  // Phase 7's automatic allocation-method assignment. This is the step the
  // Phase 8A checkout placeholder was missing — without it a booking has no
  // allocation_method and neither find_work_jobs() nor find_auction_jobs()
  // will ever surface it to a partner.
  const { allocationMethod, biddingClosesAt } = assignAllocationMethod(category, quote.totalPrice);

  const collection = windowTimestamps(quote.selectedDate, quote.collectionWindow);
  const delivery = windowTimestamps(quote.selectedDate, quote.deliveryWindow);

  // --- The jobs row -----------------------------------------------------
  // job_stops is the source of truth for the full route, but the flat
  // collection_*/delivery_* columns stay populated with the first and last
  // stop because every Phase 6/7 allocation query reads them directly.
  const { data: job, error: jobError } = await admin
    .from("jobs")
    .insert({
      quote_id: quote.id,
      customer_id: customerId,
      title: `${JOB_CATEGORY_TITLES[category]} — ${first.postcode} to ${last.postcode}`,
      work_type: "single",
      category,
      collection_address: fullAddress(first),
      collection_postcode: first.postcode,
      collection_window_start: collection.start,
      collection_window_end: collection.end,
      delivery_address: fullAddress(last),
      delivery_postcode: last.postcode,
      // Same-visit assumption, unchanged from Phase 5: a local move collects
      // and delivers on one scheduled day. Multi-day journeys aren't modelled.
      delivery_window_start: delivery.start,
      delivery_window_end: delivery.end,
      distance_miles: quote.distanceMiles,
      estimated_duration_minutes: quote.durationMinutes,
      customer_price: quote.totalPrice,
      crew_size: quote.crewSize,
      total_volume_m3: quote.totalVolumeM3,
      helper_included: quote.helperIncluded,
      // The generated Json type can't express PriceBreakdown, but it is plain
      // JSON-serialisable data — same single cast repriceQuote() uses.
      price_breakdown: quote.priceBreakdown as unknown as Record<string, never>,
      access_notes: quote.accessNotes,
      matching_status: "listed",
      allocation_method: allocationMethod,
      bidding_closes_at: biddingClosesAt,
      cover_tier: quote.coverTier,
      extended_cover_declared_value: quote.extendedCoverDeclaredValue,
      extended_cover_notes: quote.extendedCoverNotes,
    })
    .select("id")
    .single();

  if (jobError) {
    // Lost the race with a concurrent call (double-click, retried webhook).
    // Not an error — the booking exists, which is all the caller wanted.
    if (jobError.code === UNIQUE_VIOLATION) {
      const existing = await findJobForQuote(quoteId);
      if (existing) {
        return { jobId: existing, quoteId, reference: quote.reference, created: false };
      }
    }
    throw new BookingError(jobError.message, 500);
  }

  // From here on we hold the only job row for this quote, so the remaining
  // writes can't be duplicated by a concurrent caller.
  const jobId = job.id;

  // --- Route and inventory ---------------------------------------------
  const { error: stopsError } = await admin.from("job_stops").insert(
    quote.stops.map((stop, index) => ({
      job_id: jobId,
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
  if (stopsError) throw new BookingError(stopsError.message, 500);

  const { error: itemsError } = await admin.from("job_items").insert(
    quote.items.map((item) => ({
      job_id: jobId,
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
  if (itemsError) throw new BookingError(itemsError.message, 500);

  // --- Customer payment record -----------------------------------------
  // Created 'unpaid': no money has moved, but the obligation exists and has a
  // row waiting for Stripe to fulfil it. Guarded rather than blindly inserted
  // so a run that died after the job insert doesn't leave two payment rows
  // behind when it's retried.
  const { data: existingPayment } = await admin
    .from("customer_payments")
    .select("id")
    .eq("quote_id", quote.id)
    .limit(1)
    .maybeSingle();

  if (!existingPayment) {
    const { error: paymentError } = await admin.from("customer_payments").insert({
      quote_id: quote.id,
      job_id: jobId,
      customer_id: customerId,
      amount: quote.totalPrice,
      currency: "gbp",
      status: "unpaid",
    });
    if (paymentError) throw new BookingError(paymentError.message, 500);
  } else {
    // Payment row predates the job (the order Stripe will use). Link it.
    await admin
      .from("customer_payments")
      .update({ job_id: jobId })
      .eq("id", existingPayment.id)
      .is("job_id", null);
  }

  // --- Close the quote --------------------------------------------------
  const { error: quoteError } = await admin
    .from("quotes")
    .update({ status: "converted" })
    .eq("id", quote.id);
  if (quoteError) throw new BookingError(quoteError.message, 500);

  return { jobId, quoteId: quote.id, reference: quote.reference, created: true };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findJobForQuote(quoteId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("jobs")
    .select("id")
    .eq("quote_id", quoteId)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * The quote flow only ever collects a postcode; the street address is added at
 * checkout. Join the two when both exist so a partner gets a full address.
 */
function fullAddress(stop: QuoteDraft["stops"][number]): string | null {
  const parts = [stop.addressLine, stop.addressText].filter(
    (part): part is string => Boolean(part && part.trim())
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Hour-granularity UK wall-clock window on the move date -> real instants.
 * `jobs.collection_window_*` are timestamptz, so this conversion has to be
 * anchored to Europe/London and not to the server's timezone — see
 * lib/time/uk-datetime.ts for why that distinction bites.
 */
function windowTimestamps(dateIso: string, window: TimeWindow | null) {
  const resolved = window ?? FULL_DAY_WINDOW;
  return {
    start: ukWallClockToUtcIso(dateIso, resolved.startHour),
    // An end hour of 24 is midnight the following day; ukWallClockToUtcIso
    // clamps to 23, so shift the date instead of losing the last hour.
    end:
      resolved.endHour >= 24
        ? ukWallClockToUtcIso(nextDay(dateIso), 0)
        : ukWallClockToUtcIso(dateIso, resolved.endHour),
  };
}

function nextDay(dateIso: string): string {
  const next = new Date(`${dateIso}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}
