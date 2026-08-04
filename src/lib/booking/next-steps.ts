// What actually happens after a booking is confirmed, described accurately.
//
// This copy is shared by the thank-you page and the confirmation email so the
// two can't drift apart, and it is written against how Phase 6/6b matching
// really behaves — not against a nicer-sounding version of it:
//
//   * click_claim — the job is listed and the first partner with a compatible
//     approved vehicle who claims it gets it (lib RPC `claim_job`). There is
//     no queue, no dispatcher, and no guaranteed time-to-match. Saying "we'll
//     assign someone shortly" would be inventing a promise nothing keeps.
//   * auction — partners bid for a fixed 24h window
//     (AUCTION_BIDDING_WINDOW_HOURS) and `close_expired_auctions()` awards the
//     lowest bid when it closes. If nobody bids, the job stays listed with no
//     deadline until someone intervenes — a known Phase 6b gap — so the copy
//     promises a human will be in touch rather than an automatic outcome.
//
// Payment is called out plainly in both cases: nothing is collected online
// yet, so the customer should not be left wondering whether they've paid.

import { AUCTION_BIDDING_WINDOW_HOURS } from "@/lib/allocation/assign-method";

/**
 * Nullable because `jobs.allocation_method` is (migration 0018 dropped the
 * not-null). Anything that isn't 'auction' — including null — gets the
 * click_claim copy, which is the conservative description of the two.
 */
export type AllocationMethod = "click_claim" | "auction" | (string & {}) | null;

export type NextSteps = {
  headline: string;
  steps: string[];
  paymentNote: string;
};

const PAYMENT_NOTE =
  "We haven't taken any payment. Online payment isn't switched on yet, so we'll arrange it with you separately before your move — there's nothing for you to pay right now.";

export function bookingNextSteps(allocationMethod: AllocationMethod): NextSteps {
  if (allocationMethod === "auction") {
    return {
      headline: "We're finding you a transport partner",
      steps: [
        `Your job is open to our transport partners for the next ${AUCTION_BIDDING_WINDOW_HOURS} hours. Partners with a suitable, approved vehicle can bid on it during that window.`,
        "When the window closes we award the job automatically to the best bid, and your booking moves to Matched.",
        "If no partner bids, we'll contact you to talk through the options rather than leaving it open indefinitely.",
        "You'll see the partner's business name on your booking as soon as it's matched.",
      ],
      paymentNote: PAYMENT_NOTE,
    };
  }

  return {
    headline: "We're finding you a transport partner",
    steps: [
      "Your job is now listed to our transport partners. Partners with a suitable, approved vehicle can see it and claim it.",
      "The first partner to claim it takes the job, so we can't promise an exact time — most jobs are picked up well before the moving date, and further-out dates naturally take longer.",
      "You'll see the partner's business name on your booking as soon as it's matched.",
      "If nothing has been claimed as your date gets close, we'll get in touch.",
    ],
    paymentNote: PAYMENT_NOTE,
  };
}
