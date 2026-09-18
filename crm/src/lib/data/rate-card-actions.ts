"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/** Writes go through the session client, so RLS decides who may do this:
 *  rate_cards_write requires 'manager' on the card's brand. Nothing here
 *  re-checks that, deliberately — two places deciding the same thing is how
 *  they drift, and the weaker one wins. */

const money = z.coerce.number().min(0).max(10_000_000);
const rate = z.coerce.number().min(0).max(10);

/** Amounts arrive from the form in POUNDS because that is what a person types.
 *  They are stored in minor units, always integers — a rate card is money and
 *  money is never a float. */
const poundsToMinor = (pounds: number) => Math.round(pounds * 100);

const FormSchema = z.object({
  id: z.string().uuid(),
  minimumCharge: money,
  band1Up: z.coerce.number().int().positive(),
  band1Rate: money,
  band2Up: z.coerce.number().int().positive(),
  band2Rate: money,
  band3Up: z.coerce.number().int().positive(),
  band3Rate: money,
  band4Up: z.coerce.number().int().positive(),
  band4Rate: money,
  band5Rate: money,
  includedMiles: z.coerce.number().int().min(0),
  perMile: money,
  includedMovers: z.coerce.number().int().min(1).max(20),
  additionalMoverPerHour: money,
  perFloorWithoutLift: money,
  longCarryThresholdM: z.coerce.number().int().min(0),
  longCarry: money,
  weekendMultiplier: rate,
  bankHolidayMultiplier: rate,
  peakSeasonMultiplier: rate,
  vatRate: z.coerce.number().min(0).max(1),
  depositPercentage: z.coerce.number().min(0).max(1),
  depositMinimum: money,
});

export interface ActionResult {
  ok: boolean;
  message: string;
}

export async function saveRateCard(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = FormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: `${first?.path.join(".") ?? "form"}: ${first?.message ?? "invalid"}` };
  }
  const v = parsed.data;

  // Bands must ascend, and the rate per ft³ must not rise as volume grows —
  // a bigger move costing more per cubic foot is a pricing error, not a
  // policy, and it is the kind that only shows up in an angry phone call.
  const ups = [v.band1Up, v.band2Up, v.band3Up, v.band4Up];
  if (ups.some((n, i) => i > 0 && n <= ups[i - 1]!)) {
    return { ok: false, message: "Volume bands must increase: each upper bound above the one before it." };
  }
  const rates = [v.band1Rate, v.band2Rate, v.band3Rate, v.band4Rate, v.band5Rate];
  if (rates.some((n, i) => i > 0 && n > rates[i - 1]!)) {
    return { ok: false, message: "A later band cannot cost more per ft³ than an earlier one." };
  }

  const supabase = createClient();

  const { data: existing, error: readError } = await supabase
    .from("rate_cards")
    .select("rules, brand_id")
    .eq("id", v.id)
    .maybeSingle();
  if (readError) return { ok: false, message: `Could not read the rate card: ${readError.message}` };
  if (!existing) return { ok: false, message: "That rate card no longer exists." };

  const rules = {
    ...(existing.rules as Record<string, unknown>),
    minimumChargeMinor: poundsToMinor(v.minimumCharge),
    volumeBands: [
      { upToFt3: v.band1Up, perFt3Minor: poundsToMinor(v.band1Rate) },
      { upToFt3: v.band2Up, perFt3Minor: poundsToMinor(v.band2Rate) },
      { upToFt3: v.band3Up, perFt3Minor: poundsToMinor(v.band3Rate) },
      { upToFt3: v.band4Up, perFt3Minor: poundsToMinor(v.band4Rate) },
      { upToFt3: null, perFt3Minor: poundsToMinor(v.band5Rate) },
    ],
    includedMiles: v.includedMiles,
    perMileMinor: poundsToMinor(v.perMile),
    includedMovers: v.includedMovers,
    additionalMoverPerHourMinor: poundsToMinor(v.additionalMoverPerHour),
    perFloorWithoutLiftMinor: poundsToMinor(v.perFloorWithoutLift),
    longCarryThresholdM: v.longCarryThresholdM,
    longCarryMinor: poundsToMinor(v.longCarry),
    weekendMultiplier: v.weekendMultiplier,
    bankHolidayMultiplier: v.bankHolidayMultiplier,
    peakSeasonMultiplier: v.peakSeasonMultiplier,
    vatRate: v.vatRate,
    depositPercentage: v.depositPercentage,
    depositMinimumMinor: poundsToMinor(v.depositMinimum),
  };

  // .select() is not decoration. An RLS denial on UPDATE is a silent no-op
  // rather than an error, so without asking for the affected rows back this
  // would report success to someone who changed nothing.
  const { data: updated, error } = await supabase
    .from("rate_cards")
    .update({ rules })
    .eq("id", v.id)
    .select("id");

  if (error) return { ok: false, message: `Could not save: ${error.message}` };
  if (!updated || updated.length === 0) {
    return { ok: false, message: "Nothing was saved — your account needs manager access on this brand." };
  }

  revalidatePath("/rate-cards");
  revalidatePath(`/rate-cards/${v.id}`);
  return { ok: true, message: "Saved. The card is still provisional until you confirm it." };
}

/** Flips provisional to false. Separate from saving on purpose: this is the
 *  moment invented numbers become the business's own, and it is what removes
 *  the PROVISIONAL PRICING watermark from customer quotes. */
export async function confirmRateCard(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, message: "Invalid rate card." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("rate_cards")
    .update({ provisional: false })
    .eq("id", id.data)
    .select("id, service_category");

  if (error) return { ok: false, message: `Could not confirm: ${error.message}` };
  if (!data || data.length === 0) {
    return { ok: false, message: "Nothing changed — confirming rates needs manager access on this brand." };
  }

  revalidatePath("/rate-cards");
  revalidatePath(`/rate-cards/${id.data}`);
  return { ok: true, message: "Confirmed. Quotes from this card no longer carry the provisional watermark." };
}

export async function reopenRateCard(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, message: "Invalid rate card." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("rate_cards")
    .update({ provisional: true })
    .eq("id", id.data)
    .select("id");

  if (error) return { ok: false, message: `Could not reopen: ${error.message}` };
  if (!data || data.length === 0) {
    return { ok: false, message: "Nothing changed — this needs manager access on this brand." };
  }

  revalidatePath("/rate-cards");
  revalidatePath(`/rate-cards/${id.data}`);
  return { ok: true, message: "Marked provisional again." };
}
