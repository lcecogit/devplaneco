// Real figures from Ecogreen Relocation Group Ltd's Terms and Conditions
// (clauses 11.1.3, 11.3, 11.4.2) — not invented, and deliberately not
// AnyVan's marketing "£50k complimentary cover" framing, which this
// business's actual contract doesn't offer.
//
// Every move carries this standard cover automatically, at no extra charge.
// It is a liability CAP, not a payout guarantee: the maximum the business is
// contractually on the hook for if something is damaged, not what a
// customer is promised they'll receive.

export const STANDARD_COVER_PER_BOX_GBP = 25;
export const STANDARD_COVER_PER_ITEM_GBP = 50;
export const STANDARD_COVER_MOVE_CAP_GBP = 1000;
export const CLAIM_DEDUCTIBLE_GBP = 100;

/**
 * The T&Cs are careful never to call Extended Liability Cover "insurance" —
 * it isn't regulated by the FCA, it's a contractual allocation of risk. Any
 * customer-facing copy that mentions it must carry this distinction; reuse
 * this string rather than paraphrasing it.
 */
export const EXTENDED_COVER_DISCLAIMER =
  "Extended Liability Cover is not insurance and is not regulated by the Financial Conduct Authority. It's a contractual allocation of responsibility between you and Ecogreen Relocation Group Ltd.";

/**
 * There is no fixed rate for Extended Cover in the T&Cs — clause 11.3 says
 * it's "subject to our written acceptance, applicable pricing" and a rate
 * "advised" per request. So the checkout flow can only ever capture a
 * REQUEST (declared value + notes) for staff to quote directly, not charge
 * a price on the spot.
 */
export const EXTENDED_COVER_REQUEST_COPY =
  "There's no fixed price for this — we review the value you'd like covered and confirm a rate with you directly before your move.";
