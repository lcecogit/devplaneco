import { PriceBreakdownList } from "@/components/quote/PriceBreakdownList";
import { formatDuration } from "@/lib/geo/distance";
import { formatMoveDate } from "@/lib/email/booking-confirmation";
import { floorLabel, formatWindow, totalItemCount, totalVolumeM3 } from "@/lib/quote/types";
import {
  STANDARD_COVER_MOVE_CAP_GBP,
  STANDARD_COVER_PER_BOX_GBP,
  STANDARD_COVER_PER_ITEM_GBP,
} from "@/lib/constants/liability-cover";
import type { QuoteDraft } from "@/lib/quote/api";

// Everything the customer is about to book, in one place — route with every
// stop, date, both time windows, crew, helper, the full item list, total
// volume, and the price with its breakdown showing rather than a single
// number they have to take on trust.

function stopRole(index: number, total: number): string {
  if (index === 0) return "Pickup";
  if (index === total - 1) return "Delivery";
  return `Stop ${index}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-700">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink-900">{children}</dd>
    </div>
  );
}

export function OrderSummary({ quote }: { quote: QuoteDraft }) {
  const volume = totalVolumeM3(quote.items);

  return (
    <div className="flex flex-col gap-4">
      {/* Route ------------------------------------------------------- */}
      <section className="rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-lg font-bold text-ink-900">Your route</h2>
        <ol className="mt-4 flex flex-col gap-3">
          {quote.stops.map((stop, index) => (
            <li key={stop.key} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">
                  {stopRole(index, quote.stops.length)}
                </p>
                <p className="text-sm font-semibold text-ink-900">
                  {stop.addressLine ? `${stop.addressLine}, ` : ""}
                  {stop.postcode || stop.addressText || "—"}
                </p>
                <p className="text-xs text-ink-700">
                  {floorLabel(stop.floor)}
                  {stop.hasLift ? " · lift available" : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 border-t border-brand-100 pt-3 text-xs text-ink-700">
          About {quote.distanceMiles} miles, estimated {formatDuration(quote.durationMinutes)}{" "}
          driving.
        </p>
      </section>

      {/* When and who ------------------------------------------------ */}
      <section className="rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-lg font-bold text-ink-900">Date and crew</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Moving date">{formatMoveDate(quote.selectedDate)}</Field>
          <Field label="Crew">
            {quote.crewSize === 2 ? "2 people" : "1 person (driver)"}
            {quote.helperIncluded ? " · helper included" : ""}
          </Field>
          <Field label="Collection window">
            {quote.collectionWindow ? formatWindow(quote.collectionWindow) : "Any time on the day"}
          </Field>
          <Field label="Delivery window">
            {quote.deliveryWindow ? formatWindow(quote.deliveryWindow) : "Any time on the day"}
          </Field>
        </dl>
      </section>

      {/* Items -------------------------------------------------------- */}
      <section className="rounded-2xl border border-brand-100 bg-white p-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-heading text-lg font-bold text-ink-900">
            Your items ({totalItemCount(quote.items)})
          </h2>
          <p className="text-sm text-ink-700">{volume.toFixed(2)} m³ total</p>
        </div>
        <ul className="mt-4 flex flex-col gap-1.5 text-sm">
          {quote.items.map((item) => (
            <li key={item.key} className="flex justify-between gap-4">
              <span className="text-ink-900">{item.name}</span>
              <span className="shrink-0 font-semibold text-ink-700">×{item.quantity}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Cover ---------------------------------------------------------- */}
      <section className="rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-lg font-bold text-ink-900">What&apos;s covered</h2>
        <p className="mt-1 text-sm text-ink-700">
          Standard Cover is included free: up to £{STANDARD_COVER_PER_BOX_GBP} per box and £
          {STANDARD_COVER_PER_ITEM_GBP} per item, capped at £{STANDARD_COVER_MOVE_CAP_GBP} for the
          whole move.
        </p>
        {quote.coverTier === "extended_requested" && (
          <p className="mt-2 text-sm font-semibold text-brand-700">
            Extended Cover requested
            {quote.extendedCoverDeclaredValue !== null
              ? ` — £${quote.extendedCoverDeclaredValue.toLocaleString("en-GB")} declared value`
              : ""}
            . We&apos;ll confirm pricing with you before your move.
          </p>
        )}
      </section>

      {/* Price -------------------------------------------------------- */}
      <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-6">
        <h2 className="font-heading text-lg font-bold text-ink-900">Your price</h2>
        {quote.priceBreakdown ? (
          <div className="mt-4">
            <PriceBreakdownList breakdown={quote.priceBreakdown} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-700">
            This quote hasn&apos;t been priced yet — go back and pick a moving date.
          </p>
        )}
      </section>
    </div>
  );
}
