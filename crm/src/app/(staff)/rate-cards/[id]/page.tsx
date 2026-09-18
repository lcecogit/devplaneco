import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { isSampleMode } from "@/lib/sample-data";
import { getRateCard, sampleRateCards } from "@/lib/data/rate-cards";

import { RateCardForm } from "./RateCardForm";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  office: "Office",
  specialist: "Specialist",
  clearance: "Clearance",
  storage: "Storage",
};

export default async function RateCardPage({ params }: { params: { id: string } }) {
  const card = isSampleMode
    ? sampleRateCards().find((c) => c.id === params.id) ?? null
    : await getRateCard(params.id);

  if (!card) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link href="/rate-cards" className="text-body-dense text-ink-2 underline-offset-4 hover:text-ink-1 hover:underline">
        ← Rate cards
      </Link>

      <header className="mb-8 mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title-1 text-ink-1">
            {CATEGORY_LABEL[card.category] ?? card.category}
          </h1>
          <p className="mt-1 text-body text-ink-2">
            {card.brand} · effective {formatDate(card.effectiveFrom)}
            {card.effectiveTo ? ` to ${formatDate(card.effectiveTo)}` : ""} · {card.currency}
          </p>
        </div>
        {card.provisional ? <Badge tone="critical">Provisional</Badge> : <Badge tone="good">Confirmed</Badge>}
      </header>

      {isSampleMode ? (
        <p className="mb-6 rounded-lg border border-hairline bg-surface-sunken p-4 text-body-dense text-ink-2">
          Sample mode — these figures are an example and cannot be edited. Connect
          a database to change real rates.
        </p>
      ) : null}

      <RateCardForm card={card} readOnly={isSampleMode} />
    </div>
  );
}
