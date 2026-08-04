import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  claimQuoteForCustomer,
  getQuoteOwner,
  loadQuote,
  QuoteRequestError,
  repriceQuote,
} from "@/lib/quote/server";
import {
  BookingError,
  confirmBookingAndCreateJob,
} from "@/lib/booking/confirm-booking";
import { sendBookingConfirmationEmail } from "@/lib/email/booking-confirmation";

// POST /api/quote/[id]/confirm — turn a priced quote into a real booking.
//
// This is the gate that runs immediately before anything is committed, and
// it's the place the price is re-established from the server's own data. The
// browser sends the figure it displayed; this route recalculates from the
// stored stops, items, date and windows and refuses to confirm if the two
// disagree. The customer is shown the new price and has to accept it.
//
// That check matters even now, with no money attached: the lead-time
// multiplier is a function of how far away the move date is, so a quote left
// open overnight genuinely reprices, and confirming silently at the old
// number would create a booking we'd have to argue about later. Once Stripe
// is wired up, the same check is what stops a tampered client from paying
// £1 for a £400 move.
//
// STRIPE: this handler is where the PaymentIntent gets created. The call to
// confirmBookingAndCreateJob() below moves to the webhook — see the header
// comment in lib/booking/confirm-booking.ts.

/** Prices agreeing to the penny. Both sides are already rounded by the engine. */
const PRICE_TOLERANCE_GBP = 0.01;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // --- Who's asking --------------------------------------------------
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to confirm your booking." },
        { status: 401 }
      );
    }

    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json(
        { error: "Your customer account isn't set up yet. Please sign in again." },
        { status: 403 }
      );
    }

    const quote = await loadQuote(params.id);

    // --- Ownership -----------------------------------------------------
    // The quote UUID is a capability token anyone with the link holds, so
    // being able to READ a quote is not the same as being allowed to book
    // it. Claim it if it's unclaimed; otherwise it has to already be ours.
    const owner =
      (await getQuoteOwner(quote.id)) ?? (await claimQuoteForCustomer(quote.id, customer.id));

    if (owner !== customer.id) {
      return NextResponse.json(
        { error: "This quote belongs to a different account." },
        { status: 403 }
      );
    }

    // --- Already booked ------------------------------------------------
    // A double-submit or a back-then-resubmit lands here. Report success
    // with the existing booking instead of erroring — the customer's intent
    // was satisfied the first time.
    if (quote.status === "converted") {
      const existing = await confirmBookingAndCreateJob(quote.id);
      return NextResponse.json({
        status: "confirmed",
        reference: existing.reference,
        jobId: existing.jobId,
        alreadyBooked: true,
      });
    }

    // --- What the customer submitted -----------------------------------
    const body = (await request.json()) as Record<string, unknown>;

    const contactName = text(body.contactName, 120);
    const contactPhone = text(body.contactPhone, 40);
    const accessNotes = text(body.accessNotes, 2000);
    const termsAccepted = body.termsAccepted === true;
    const expectedTotal =
      typeof body.expectedTotalGBP === "number" && Number.isFinite(body.expectedTotalGBP)
        ? body.expectedTotalGBP
        : null;

    // Extended Liability Cover has no fixed price (see
    // src/lib/constants/liability-cover.ts) — this only captures a request
    // for staff to quote, never a charge, so it doesn't affect expectedTotal
    // or the price-tolerance check below.
    const extendedCoverRequested = body.coverTier === "extended_requested";
    const extendedCoverDeclaredValue =
      typeof body.extendedCoverDeclaredValue === "number" &&
      Number.isFinite(body.extendedCoverDeclaredValue) &&
      body.extendedCoverDeclaredValue > 0
        ? body.extendedCoverDeclaredValue
        : null;
    const extendedCoverNotes = text(body.extendedCoverNotes, 1000);

    if (!contactName) {
      return NextResponse.json({ error: "Please give us a name for the booking." }, { status: 400 });
    }
    if (!contactPhone) {
      return NextResponse.json(
        { error: "Please give us a phone number — the driver needs a way to reach you." },
        { status: 400 }
      );
    }
    if (!termsAccepted) {
      return NextResponse.json(
        { error: "Please accept the terms and conditions to confirm." },
        { status: 400 }
      );
    }
    if (expectedTotal === null) {
      return NextResponse.json({ error: "Couldn't read the price you were shown." }, { status: 400 });
    }
    if (extendedCoverRequested && extendedCoverDeclaredValue === null) {
      return NextResponse.json(
        { error: "Please tell us the value you'd like Extended Cover to protect." },
        { status: 400 }
      );
    }

    // Street addresses, one per stop, keyed by the stop's row id.
    const submittedAddresses = (body.addressLines ?? {}) as Record<string, unknown>;
    const addressUpdates = quote.stops.map((stop) => ({
      id: stop.key,
      addressLine: text(submittedAddresses[stop.key], 300),
    }));

    if (addressUpdates.some((stop) => !stop.addressLine)) {
      return NextResponse.json(
        { error: "Please give the full address for every stop on the route." },
        { status: 400 }
      );
    }

    // --- Persist it on the quote ---------------------------------------
    // Everything the booking needs lives on the quote before the booking is
    // created, so confirmBookingAndCreateJob() stays a one-argument function
    // that a Stripe webhook can call with no request body.
    const admin = createAdminClient();

    for (const stop of addressUpdates) {
      const { error } = await admin
        .from("quote_stops")
        .update({ address_line: stop.addressLine })
        .eq("id", stop.id)
        .eq("quote_id", quote.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const { error: quoteError } = await admin
      .from("quotes")
      .update({
        contact_name: contactName,
        contact_phone: contactPhone,
        access_notes: accessNotes || null,
        terms_accepted_at: new Date().toISOString(),
        cover_tier: extendedCoverRequested ? "extended_requested" : "standard",
        extended_cover_declared_value: extendedCoverRequested ? extendedCoverDeclaredValue : null,
        extended_cover_notes: extendedCoverRequested ? extendedCoverNotes || null : null,
      })
      .eq("id", quote.id);
    if (quoteError) {
      return NextResponse.json({ error: quoteError.message }, { status: 500 });
    }

    // --- Re-establish the price ----------------------------------------
    const { totalPrice } = await repriceQuote(quote.id);

    if (totalPrice === null) {
      return NextResponse.json(
        { error: "This quote isn't priced yet. Go back and pick a date." },
        { status: 409 }
      );
    }

    if (Math.abs(totalPrice - expectedTotal) > PRICE_TOLERANCE_GBP) {
      // Not an error — the quote is still valid, it just costs something
      // different now (almost always because the lead time shortened). The
      // customer reviews the new figure and confirms again.
      return NextResponse.json({
        status: "price_changed",
        previousTotalGBP: expectedTotal,
        totalGBP: totalPrice,
      });
    }

    // --- Book it -------------------------------------------------------
    // STRIPE SWAP POINT: replace this single call with "create a
    // PaymentIntent and return its client secret". The webhook then calls
    // confirmBookingAndCreateJob(quote.id) on payment_intent.succeeded.
    const booking = await confirmBookingAndCreateJob(quote.id);

    // --- Confirmation email --------------------------------------------
    // Deliberately after the booking and deliberately not awaited into the
    // success path's failure modes: a receipt that didn't send must not undo
    // a booking that did. sendEmail() never throws; it logs when no provider
    // is configured, which is the case today.
    const confirmed = await loadQuote(quote.id);
    const recipient = confirmed.email ?? user.email ?? "";
    const emailResult = await sendBookingConfirmationEmail({
      to: recipient,
      contactName: confirmed.contactName,
      reference: booking.reference,
      jobId: booking.jobId,
      selectedDate: confirmed.selectedDate,
      collectionWindow: confirmed.collectionWindow,
      deliveryWindow: confirmed.deliveryWindow,
      stops: confirmed.stops.map((stop) => ({
        label: [stop.addressLine, stop.postcode].filter(Boolean).join(", "),
        floor: stop.floor,
        hasLift: stop.hasLift,
      })),
      items: confirmed.items.map((item) => ({ name: item.name, quantity: item.quantity })),
      totalVolumeM3: confirmed.totalVolumeM3,
      totalGBP: confirmed.totalPrice,
      allocationMethod: await allocationMethodFor(booking.jobId),
    });

    // --- Fill in the profile, if it's still blank ----------------------
    // The customer just typed their name and number for their own booking;
    // carrying it onto their profile saves them retyping it next time. Only
    // fills gaps — it never overwrites something they've already set.
    await backfillProfile(user.id, contactName, contactPhone);

    return NextResponse.json({
      status: "confirmed",
      reference: booking.reference,
      jobId: booking.jobId,
      emailDelivered: emailResult.delivered,
    });
  } catch (error) {
    if (error instanceof QuoteRequestError || error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[confirm] Unexpected failure:", error);
    return NextResponse.json({ error: "Couldn't confirm your booking." }, { status: 500 });
  }
}

async function allocationMethodFor(jobId: string): Promise<string> {
  const { data } = await createAdminClient()
    .from("jobs")
    .select("allocation_method")
    .eq("id", jobId)
    .maybeSingle();
  return data?.allocation_method ?? "click_claim";
}

async function backfillProfile(profileId: string, name: string, phone: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, phone")
    .eq("id", profileId)
    .maybeSingle();

  const updates: { full_name?: string; phone?: string } = {};
  if (!profile?.full_name) updates.full_name = name;
  if (!profile?.phone) updates.phone = phone;

  if (Object.keys(updates).length > 0) {
    await admin.from("profiles").update(updates).eq("id", profileId);
  }
}
