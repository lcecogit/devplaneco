"use client";

import dynamic from "next/dynamic";
import { EmailQuoteCapture } from "@/components/quote/EmailQuoteCapture";
import { formatDuration } from "@/lib/geo/distance";
import { siteConfig } from "@/lib/site-config";
import { floorLabel, totalItemCount, totalVolumeM3, type QuoteItem, type QuoteStop } from "@/lib/quote/types";

// Persistent sidebar, shown from step 2 onward. Everything the visitor has
// told us so far, plus the running price.
//
// NOTE: there is deliberately no "save X% vs other companies" claim here.
// That's a comparative advertising claim and would need substantiating price
// data for named competitors that we don't have. Don't add one.

const RouteMap = dynamic(() => import("@/components/quote/RouteMap").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => <div className="h-40 w-full animate-pulse rounded-xl bg-brand-50" />,
});

export function QuoteSidebar({
  reference,
  stops,
  items,
  distanceMiles,
  durationMinutes,
  totalPrice,
  email,
  marketingOptIn,
  onEditItems,
  onSaveEmail,
}: {
  reference: string;
  stops: QuoteStop[];
  items: QuoteItem[];
  distanceMiles: number;
  durationMinutes: number;
  totalPrice: number | null;
  email: string | null;
  marketingOptIn: boolean;
  onEditItems: () => void;
  onSaveEmail: (email: string, marketingOptIn: boolean) => Promise<void>;
}) {
  const mapStops = stops
    .filter((stop) => stop.lat !== null && stop.lng !== null)
    .map((stop) => ({
      lat: stop.lat as number,
      lng: stop.lng as number,
      label: stop.addressText || stop.postcode || "Stop",
    }));

  const first = stops[0];
  const last = stops[stops.length - 1];

  /** "Bushey to Theydon Bois" — district names, matching what we resolved. */
  const routeName = [placeName(first), placeName(last)].filter(Boolean).join(" to ");
  const floorSummary = `${floorLabel(first?.floor ?? "ground")} to ${floorLabel(last?.floor ?? "ground")}`;

  return (
    <aside className="flex flex-col gap-4">
      {/* Reference + support ---------------------------------------- */}
      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">
          Your quote reference
        </p>
        <p className="mt-0.5 font-heading text-xl font-extrabold tracking-wide text-ink-900">
          #{reference}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-ink-700">
          Questions? Call{" "}
          <a
            href={`tel:${siteConfig.supportPhone.replace(/\s/g, "")}`}
            className="font-semibold text-brand-600"
          >
            {siteConfig.supportPhone}
          </a>{" "}
          or email{" "}
          <a href={`mailto:${siteConfig.supportEmail}`} className="font-semibold text-brand-600">
            {siteConfig.supportEmail}
          </a>
          .
        </p>
        <div className="mt-3 border-t border-brand-100 pt-3">
          <EmailQuoteCapture savedEmail={email} savedOptIn={marketingOptIn} onSave={onSaveEmail} />
        </div>
      </div>

      {/* Route ------------------------------------------------------- */}
      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <h3 className="font-heading text-base font-bold text-ink-900">Your route</h3>
        <div className="mt-3">
          <RouteMap stops={mapStops} />
        </div>
        <dl className="mt-3 flex flex-col gap-1 text-sm">
          {routeName && (
            <div>
              <dt className="sr-only">Route</dt>
              <dd className="font-semibold text-ink-900">{routeName}</dd>
            </div>
          )}
          <div>
            <dt className="sr-only">Access</dt>
            <dd className="text-ink-700">{floorSummary}</dd>
          </div>
          <div>
            <dt className="sr-only">Distance</dt>
            <dd className="text-ink-700">
              {distanceMiles} miles, estimated {formatDuration(durationMinutes)}
            </dd>
          </div>
          {stops.length > 2 && (
            <div>
              <dt className="sr-only">Stops</dt>
              <dd className="text-ink-700">{stops.length - 2} extra stop(s) on the way</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Inventory --------------------------------------------------- */}
      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="font-heading text-base font-bold text-ink-900">
            Your items ({totalItemCount(items)})
          </h3>
          <button
            type="button"
            onClick={onEditItems}
            className="text-xs font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700"
          >
            Edit
          </button>
        </div>
        <p className="mt-0.5 text-xs text-ink-700">
          {totalVolumeM3(items).toFixed(2)} m³ total volume
        </p>

        {items.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {items.map((item) => (
              <li key={item.key} className="flex justify-between gap-2">
                <span className="truncate text-ink-900">{item.name}</span>
                <span className="shrink-0 font-semibold text-ink-700">×{item.quantity}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Price ------------------------------------------------------- */}
      <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Amount to pay
        </p>
        <p className="mt-0.5 font-heading text-3xl font-extrabold text-ink-900">
          {totalPrice === null ? "—" : `£${totalPrice}`}
        </p>
        {totalPrice === null && (
          <p className="mt-1 text-xs text-ink-700">Pick a date to see your price.</p>
        )}
      </div>
    </aside>
  );
}

/** Pulls the district out of a "M1, Bushey, UK" style label. */
function placeName(stop: QuoteStop | undefined): string {
  if (!stop) return "";
  const parts = stop.addressText.split(",").map((part) => part.trim());
  return parts[1] || parts[0] || stop.postcode || "";
}
