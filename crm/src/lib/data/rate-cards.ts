import "server-only";

import { createClient } from "@/lib/supabase/server";
import { defaultRateCard } from "@/domain/pricing/default-rate-card";
import type { ServiceCategory } from "@/domain/pricing/types";

export interface RateCardRow {
  id: string;
  brand: string;
  brandSlug: string;
  category: string;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  provisional: boolean;
  rules: RateCardRules;
}

/** The stored shape. Deliberately a narrow read model: the domain's RateCard
 *  type is what pricing runs on, and it is reconstructed from these rows, so
 *  this interface only has to describe what the screen shows. */
export interface RateCardRules {
  minimumChargeMinor: number;
  volumeBands: { upToFt3: number | null; perFt3Minor: number }[];
  includedMiles: number;
  perMileMinor: number;
  includedMovers: number;
  additionalMoverPerHourMinor: number;
  perFloorWithoutLiftMinor: number;
  longCarryThresholdM: number;
  longCarryMinor: number;
  packingPerFt3Minor: Record<string, number>;
  materialUnitMinor: Record<string, number>;
  weekendMultiplier: number;
  bankHolidayMultiplier: number;
  peakSeasonMultiplier: number;
  peakMonths: number[];
  vatRate: number;
  depositPercentage: number;
  depositMinimumMinor: number;
  manualPricing: { declaredValueOverMinor: number; volumeOverFt3: number; distanceOverMiles: number };
}

export async function getRateCards(): Promise<RateCardRow[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("rate_cards")
    .select(
      `id, service_category, currency, effective_from, effective_to, provisional, rules,
       brands ( name, slug )`,
    )
    .order("service_category", { ascending: true });

  if (error) throw new Error(`Could not load rate cards: ${error.message}`);

  return (data ?? []).map(toRow);
}

function toRow(row: any): RateCardRow {
  return {
    id: row.id,
    brand: row.brands?.name ?? "—",
    brandSlug: row.brands?.slug ?? "",
    category: row.service_category,
    currency: row.currency,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    provisional: row.provisional,
    rules: row.rules as RateCardRules,
  };
}

/** Sample rows for when no database is connected, built from the same domain
 *  defaults the seed was generated from, so the screen shows the real structure
 *  either way. */
export async function getRateCard(id: string): Promise<RateCardRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("rate_cards")
    .select(
      `id, service_category, currency, effective_from, effective_to, provisional, rules,
       brands ( name, slug )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load the rate card: ${error.message}`);
  if (!data) return null;
  return toRow(data);
}

export function sampleRateCards(): RateCardRow[] {
  const categories: ServiceCategory[] = [
    "residential", "commercial", "office", "specialist", "clearance", "storage",
  ];
  return categories.map((category) => {
    const card = defaultRateCard("ecogreen-movers", category);
    return {
      id: `sample-${category}`,
      brand: "EcoGreen Movers",
      brandSlug: "ecogreen-movers",
      category,
      currency: card.currency,
      effectiveFrom: card.effectiveFrom,
      effectiveTo: null,
      provisional: card.provisional,
      rules: card as unknown as RateCardRules,
    };
  });
}
