import Link from "next/link";

import { Panel, PanelHeader } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatMoneyMinor } from "@/lib/format";
import { isSampleMode } from "@/lib/sample-data";
import { getRateCards, sampleRateCards, type RateCardRow } from "@/lib/data/rate-cards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rate cards" };

const CATEGORY_LABEL: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  office: "Office",
  specialist: "Specialist",
  clearance: "Clearance",
  storage: "Storage",
};

/** The pricing matrix, made visible.
 *
 *  RECOMMENDATIONS.md §6 puts this first for a reason: every quote the system
 *  produces comes from these numbers, and until somebody can see them they
 *  cannot be signed off. The seeded values are placeholders, so the provisional
 *  state is the loudest thing on the page rather than a footnote. */
export default async function RateCardsPage() {
  const cards = isSampleMode ? sampleRateCards() : await getRateCards();
  const provisional = cards.filter((c) => c.provisional);
  const brands = [...new Set(cards.map((c) => c.brand))];

  return (
    <div className="mx-auto w-full max-w-content">
      <header className="mb-6">
        <h1 className="text-title-1 text-ink-1">Rate cards</h1>
        <p className="mt-1 max-w-[70ch] text-body text-ink-2">
          The seven pricing components every quote is built from. Volume is banded
          progressively, like tax bands, so there is no cliff where one more cubic
          foot costs less than the last.
        </p>
      </header>

      {provisional.length > 0 ? (
        <div className="mb-6 rounded-lg border border-hairline bg-surface-sunken p-5">
          <p className="text-title-3 text-status-critical-text">
            {provisional.length} of {cards.length} rate cards are provisional
          </p>
          <p className="mt-2 max-w-[75ch] text-body-dense text-ink-2">
            These numbers were chosen as a working default, not supplied by the
            business. Quotes calculated from them will be wrong. Every quote PDF
            carries a PROVISIONAL PRICING watermark until someone with manager
            access confirms the real commercial rates.
          </p>
        </div>
      ) : null}

      {cards.length === 0 ? (
        <EmptyState
          title="No rate cards yet"
          description="Run the seed in supabase/parts/05_seed.sql, or add a card per service category."
        />
      ) : (
        brands.map((brand) => (
          <section key={brand} className="mb-8">
            <h2 className="mb-3 text-title-3 text-ink-1">{brand}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cards.filter((c) => c.brand === brand).map((card) => (
                <RateCardPanel key={card.id} card={card} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function RateCardPanel({ card }: { card: RateCardRow }) {
  const r = card.rules;
  const bands = r.volumeBands ?? [];

  return (
    <Panel>
      <PanelHeader
        title={CATEGORY_LABEL[card.category] ?? card.category}
        description={`From ${formatDate(card.effectiveFrom)}${card.effectiveTo ? ` to ${formatDate(card.effectiveTo)}` : ""}`}
        action={
          card.provisional ? (
            <Badge tone="critical">Provisional</Badge>
          ) : (
            <Badge tone="good">Confirmed</Badge>
          )
        }
      />

      <dl className="flex flex-col gap-3">
        <Row label="Minimum charge" value={formatMoneyMinor(r.minimumChargeMinor, card.currency)} />

        <div>
          <dt className="text-label text-ink-2">Volume bands</dt>
          <dd className="mt-2">
            <table className="w-full text-body-dense">
              <thead>
                <tr className="text-ink-2">
                  <th scope="col" className="pb-1 text-left font-normal">Up to</th>
                  <th scope="col" className="pb-1 text-right font-normal">Per ft³</th>
                </tr>
              </thead>
              <tbody>
                {bands.map((band, i) => (
                  <tr key={i} className="border-t border-hairline">
                    <td data-numeric className="py-1 text-ink-1">
                      {band.upToFt3 === null ? "Above" : `${band.upToFt3.toLocaleString("en-GB")} ft³`}
                    </td>
                    <td data-numeric className="py-1 text-right text-ink-1">
                      {formatMoneyMinor(band.perFt3Minor, card.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </dd>
        </div>

        <Row
          label="Distance"
          value={`${r.includedMiles} miles included, then ${formatMoneyMinor(r.perMileMinor, card.currency)}/mile`}
        />
        <Row
          label="Crew"
          value={`${r.includedMovers} included, then ${formatMoneyMinor(r.additionalMoverPerHourMinor, card.currency)}/hour`}
        />
        <Row
          label="Access"
          value={`${formatMoneyMinor(r.perFloorWithoutLiftMinor, card.currency)} per floor without a lift · ${formatMoneyMinor(r.longCarryMinor, card.currency)} over ${r.longCarryThresholdM}m`}
        />
        <Row
          label="Packing (per ft³)"
          value={Object.entries(r.packingPerFt3Minor ?? {})
            .filter(([, v]) => v > 0)
            .map(([k, v]) => `${k.replace(/_/g, " ")} ${formatMoneyMinor(v, card.currency)}`)
            .join(" · ") || "Materials only"}
        />
        <Row
          label="Date multipliers"
          value={`Weekend ×${r.weekendMultiplier} · Bank holiday ×${r.bankHolidayMultiplier} · Peak ×${r.peakSeasonMultiplier}`}
        />
        <Row
          label="VAT and deposit"
          value={`VAT ${(r.vatRate * 100).toFixed(0)}% · deposit ${(r.depositPercentage * 100).toFixed(0)}%, minimum ${formatMoneyMinor(r.depositMinimumMinor, card.currency)}`}
        />
        <Row
          label="Sent to a human when"
          value={`Value over ${formatMoneyMinor(r.manualPricing?.declaredValueOverMinor ?? 0, card.currency)} · volume over ${(r.manualPricing?.volumeOverFt3 ?? 0).toLocaleString("en-GB")} ft³ · distance over ${r.manualPricing?.distanceOverMiles ?? 0} miles`}
        />
      </dl>

      <Link
        href={`/rate-cards/${card.id}`}
        className="mt-5 inline-flex h-9 items-center border border-hairline px-5 text-caption font-medium uppercase tracking-[0.1em] text-ink-1 transition-colors duration-instant ease-standard hover:bg-surface-sunken"
      >
        {card.provisional ? "Review and sign off" : "Edit"}
      </Link>
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-label text-ink-2">{label}</dt>
      <dd data-numeric className="mt-1 text-body text-ink-1">{value}</dd>
    </div>
  );
}
