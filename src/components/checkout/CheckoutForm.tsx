"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { QuoteDraft } from "@/lib/quote/api";
import {
  CLAIM_DEDUCTIBLE_GBP,
  EXTENDED_COVER_DISCLAIMER,
  EXTENDED_COVER_REQUEST_COPY,
  STANDARD_COVER_MOVE_CAP_GBP,
  STANDARD_COVER_PER_BOX_GBP,
  STANDARD_COVER_PER_ITEM_GBP,
} from "@/lib/constants/liability-cover";

// Contact details, street addresses, access notes, terms — then confirm.
//
// The price shown here is only ever the one the server stored. It is posted
// back as `expectedTotalGBP` purely so the server can tell us it has changed;
// it is never treated as the price to charge. If the server comes back with
// `price_changed`, the form switches into a review state and the customer has
// to accept the new figure explicitly before anything is booked.

type Props = {
  quote: QuoteDraft;
  /** Prefill from the signed-in customer's profile, where they have one. */
  defaultName: string;
  defaultPhone: string;
};

function stopRole(index: number, total: number): string {
  if (index === 0) return "Pickup address";
  if (index === total - 1) return "Delivery address";
  return `Stop ${index} address`;
}

export function CheckoutForm({ quote, defaultName, defaultPhone }: Props) {
  const router = useRouter();
  const fieldId = useId();

  const [name, setName] = useState(quote.contactName ?? defaultName);
  const [phone, setPhone] = useState(quote.contactPhone ?? defaultPhone);
  const [notes, setNotes] = useState(quote.accessNotes ?? "");
  const [addressLines, setAddressLines] = useState<Record<string, string>>(() =>
    Object.fromEntries(quote.stops.map((stop) => [stop.key, stop.addressLine ?? ""]))
  );
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [extendedCoverRequested, setExtendedCoverRequested] = useState(
    quote.coverTier === "extended_requested"
  );
  const [declaredValue, setDeclaredValue] = useState(
    quote.extendedCoverDeclaredValue !== null ? String(quote.extendedCoverDeclaredValue) : ""
  );
  const [coverNotes, setCoverNotes] = useState(quote.extendedCoverNotes ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the server recalculated a different price. Holds the new figure,
  // which becomes what we submit on the next attempt.
  const [revisedTotal, setRevisedTotal] = useState<number | null>(null);

  const displayedTotal = revisedTotal ?? quote.totalPrice;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (displayedTotal === null) return;

    if (extendedCoverRequested && (!declaredValue || Number(declaredValue) <= 0)) {
      setError("Please tell us the value you'd like Extended Cover to protect.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/quote/${quote.id}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contactName: name,
          contactPhone: phone,
          accessNotes: notes,
          addressLines,
          termsAccepted,
          expectedTotalGBP: displayedTotal,
          coverTier: extendedCoverRequested ? "extended_requested" : "standard",
          extendedCoverDeclaredValue: extendedCoverRequested ? Number(declaredValue) : null,
          extendedCoverNotes: extendedCoverRequested ? coverNotes : null,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        status?: string;
        reference?: string;
        totalGBP?: number;
        error?: string;
      };

      if (!response.ok) {
        setError(body.error || "Couldn't confirm your booking.");
        setSubmitting(false);
        return;
      }

      if (body.status === "price_changed" && typeof body.totalGBP === "number") {
        setRevisedTotal(body.totalGBP);
        setSubmitting(false);
        return;
      }

      if (body.status === "confirmed" && body.reference) {
        // Not setSubmitting(false) — keep the button locked through the
        // navigation so a slow route change can't be double-submitted.
        router.push(`/quote/confirmation/${body.reference}`);
        return;
      }

      setError("Couldn't confirm your booking.");
      setSubmitting(false);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Contact ------------------------------------------------------ */}
      <section className="rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-lg font-bold text-ink-900">Contact details</h2>
        <p className="mt-1 text-sm text-ink-700">
          Your transport partner will use these to arrange the day with you.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${fieldId}-name`} className="block text-sm font-semibold text-ink-900">
              Full name
            </label>
            <input
              id={`${fieldId}-name`}
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${fieldId}-phone`} className="block text-sm font-semibold text-ink-900">
              Phone number
            </label>
            <input
              id={`${fieldId}-phone`}
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Addresses ---------------------------------------------------- */}
      <section className="rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-lg font-bold text-ink-900">Full addresses</h2>
        <p className="mt-1 text-sm text-ink-700">
          We only asked for postcodes to price your move. Your driver needs the rest.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          {quote.stops.map((stop, index) => (
            <div key={stop.key}>
              <label
                htmlFor={`${fieldId}-address-${index}`}
                className="block text-sm font-semibold text-ink-900"
              >
                {stopRole(index, quote.stops.length)}
                <span className="ml-2 font-normal text-ink-700">{stop.postcode}</span>
              </label>
              <input
                id={`${fieldId}-address-${index}`}
                type="text"
                required
                placeholder="House number and street, e.g. 14 Elm Road"
                value={addressLines[stop.key] ?? ""}
                onChange={(event) =>
                  setAddressLines((current) => ({ ...current, [stop.key]: event.target.value }))
                }
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Notes -------------------------------------------------------- */}
      <section className="rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-lg font-bold text-ink-900">
          Anything else we should know?
        </h2>
        <p className="mt-1 text-sm text-ink-700">
          Parking restrictions, gate codes, narrow stairs, a buzzer that doesn&apos;t work —
          anything that would slow the crew down on the day. Optional.
        </p>
        <label htmlFor={`${fieldId}-notes`} className="sr-only">
          Access instructions and notes
        </label>
        <textarea
          id={`${fieldId}-notes`}
          rows={4}
          maxLength={2000}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={`${inputClass} resize-y`}
        />
      </section>

      {/* Move protection ------------------------------------------------ */}
      <section className="rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-lg font-bold text-ink-900">Move protection</h2>
        <p className="mt-1 text-sm text-ink-700">
          Every move includes Standard Cover at no extra charge: up to £{STANDARD_COVER_PER_BOX_GBP}{" "}
          per box and £{STANDARD_COVER_PER_ITEM_GBP} per item, capped at £
          {STANDARD_COVER_MOVE_CAP_GBP} for the whole move. A £{CLAIM_DEDUCTIBLE_GBP} deductible
          applies per claim.
        </p>

        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-ink-900">
          <input
            type="checkbox"
            checked={extendedCoverRequested}
            onChange={(event) => setExtendedCoverRequested(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-brand-300 text-brand-600 focus:ring-brand-400"
          />
          <span>
            <span className="font-semibold">Request Extended Liability Cover</span> for higher-value
            items
          </span>
        </label>

        {extendedCoverRequested && (
          <div className="mt-4 flex flex-col gap-3 border-t border-brand-100 pt-4">
            <p className="text-xs text-ink-700">{EXTENDED_COVER_REQUEST_COPY}</p>
            <div>
              <label
                htmlFor={`${fieldId}-declared-value`}
                className="block text-sm font-semibold text-ink-900"
              >
                Value you&apos;d like covered (£)
              </label>
              <input
                id={`${fieldId}-declared-value`}
                type="number"
                min="1"
                step="1"
                required={extendedCoverRequested}
                value={declaredValue}
                onChange={(event) => setDeclaredValue(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor={`${fieldId}-cover-notes`}
                className="block text-sm font-semibold text-ink-900"
              >
                Anything we should know? (optional)
              </label>
              <textarea
                id={`${fieldId}-cover-notes`}
                rows={3}
                maxLength={1000}
                value={coverNotes}
                onChange={(event) => setCoverNotes(event.target.value)}
                className={`${inputClass} resize-y`}
              />
            </div>
            <p className="text-xs text-ink-700">{EXTENDED_COVER_DISCLAIMER}</p>
          </div>
        )}
      </section>

      {/* Payment placeholder ------------------------------------------ */}
      {/* Deliberately not a form. No card fields, no fake "pay now" button —
          a half-wired checkout that looks real is worse than an honest gap. */}
      <section className="rounded-2xl border border-dashed border-brand-300 bg-white p-6">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-lg font-bold text-ink-900">Payment</h2>
          <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
            Coming soon
          </span>
        </div>
        <p className="mt-2 text-sm text-ink-700">
          We&apos;re not taking card payments online yet. Confirming below books your move at
          the price shown and sends it out to our transport partners — nothing is charged now.
          We&apos;ll arrange payment with you separately before the day.
        </p>
      </section>

      {/* Price change review ------------------------------------------ */}
      {revisedTotal !== null && (
        <div
          role="alert"
          className="rounded-2xl border border-coral-300 bg-coral-50 p-6"
        >
          <h2 className="font-heading text-base font-bold text-ink-900">
            The price has changed — please review
          </h2>
          <p className="mt-2 text-sm text-ink-700">
            This quote now comes to{" "}
            <span className="font-semibold text-ink-900">£{revisedTotal.toFixed(2)}</span>, not
            £{(quote.totalPrice ?? 0).toFixed(2)}. Prices move as the moving date gets closer,
            so a quote left open for a while can reprice. Nothing has been booked. Confirm below
            to go ahead at the new price, or go back and pick a different date.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-coral-600">
          {error}
        </p>
      )}

      {/* Terms + confirm ---------------------------------------------- */}
      <section className="rounded-2xl border border-brand-100 bg-white p-6">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-900">
          <input
            type="checkbox"
            required
            checked={termsAccepted}
            onChange={(event) => setTermsAccepted(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-brand-300 text-brand-600 focus:ring-brand-400"
          />
          <span>
            I accept the terms and conditions and confirm the details above are correct. I
            understand my move will be carried out by an independent transport partner matched
            through {""}
            <span className="font-semibold">Movers Now</span>.
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting || displayedTotal === null}
          className="mt-5 w-full rounded-full bg-coral-500 px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "Confirming…"
            : displayedTotal === null
              ? "Pick a date first"
              : revisedTotal !== null
                ? `Confirm booking at £${revisedTotal.toFixed(2)}`
                : `Confirm booking — £${displayedTotal.toFixed(2)}`}
        </button>

        <p className="mt-3 text-center text-xs text-ink-700">
          No payment is taken at this step.
        </p>
      </section>
    </form>
  );
}
