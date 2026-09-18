"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import {
  confirmRateCard,
  reopenRateCard,
  saveRateCard,
  type ActionResult,
} from "@/lib/data/rate-card-actions";
import type { RateCardRow } from "@/lib/data/rate-cards";

const minorToPounds = (minor: number | undefined) => ((minor ?? 0) / 100).toFixed(2);

/** The pricing matrix as a form.
 *
 *  Amounts are entered in pounds because that is what a person has in their
 *  head; they are stored as integer minor units. Nothing here edits raw JSON —
 *  a rate card is a commercial document, and the person signing it off should
 *  not have to read a brace to find the minimum charge. */
export function RateCardForm({ card, readOnly }: { card: RateCardRow; readOnly: boolean }) {
  const [saveState, save] = useFormState<ActionResult | null, FormData>(saveRateCard, null);
  const [flagState, flag] = useFormState<ActionResult | null, FormData>(
    card.provisional ? confirmRateCard : reopenRateCard,
    null,
  );
  const r = card.rules;
  const bands = r.volumeBands ?? [];
  const band = (i: number) => bands[i];

  return (
    <>
      <form action={save} className="flex flex-col gap-8">
        <input type="hidden" name="id" value={card.id} />

        <Group title="Base" hint="The floor no job goes below, whatever its size.">
          <Money name="minimumCharge" label="Minimum charge" value={r.minimumChargeMinor} readOnly={readOnly} />
        </Group>

        <Group
          title="Volume bands"
          hint="Progressive, like tax bands: a move is charged the lower rate on the cubic feet that fall in each band, so there is no cliff where one more foot costs less."
        >
          <div className="grid gap-x-6 sm:grid-cols-2">
            <Num name="band1Up" label="Band 1 up to (ft³)" value={band(0)?.upToFt3 ?? 250} readOnly={readOnly} />
            <Money name="band1Rate" label="Band 1 per ft³" value={band(0)?.perFt3Minor} readOnly={readOnly} />
            <Num name="band2Up" label="Band 2 up to (ft³)" value={band(1)?.upToFt3 ?? 500} readOnly={readOnly} />
            <Money name="band2Rate" label="Band 2 per ft³" value={band(1)?.perFt3Minor} readOnly={readOnly} />
            <Num name="band3Up" label="Band 3 up to (ft³)" value={band(2)?.upToFt3 ?? 900} readOnly={readOnly} />
            <Money name="band3Rate" label="Band 3 per ft³" value={band(2)?.perFt3Minor} readOnly={readOnly} />
            <Num name="band4Up" label="Band 4 up to (ft³)" value={band(3)?.upToFt3 ?? 1400} readOnly={readOnly} />
            <Money name="band4Rate" label="Band 4 per ft³" value={band(3)?.perFt3Minor} readOnly={readOnly} />
            <Money name="band5Rate" label="Above that, per ft³" value={band(4)?.perFt3Minor} readOnly={readOnly} />
          </div>
        </Group>

        <Group title="Distance">
          <div className="grid gap-x-6 sm:grid-cols-2">
            <Num name="includedMiles" label="Miles included" value={r.includedMiles} readOnly={readOnly} />
            <Money name="perMile" label="Per mile after that" value={r.perMileMinor} readOnly={readOnly} />
          </div>
        </Group>

        <Group title="Crew">
          <div className="grid gap-x-6 sm:grid-cols-2">
            <Num name="includedMovers" label="Movers included" value={r.includedMovers} readOnly={readOnly} />
            <Money name="additionalMoverPerHour" label="Extra mover, per hour" value={r.additionalMoverPerHourMinor} readOnly={readOnly} />
          </div>
        </Group>

        <Group title="Access" hint="What makes a move slower: stairs and distance from the van.">
          <div className="grid gap-x-6 sm:grid-cols-3">
            <Money name="perFloorWithoutLift" label="Per floor, no lift" value={r.perFloorWithoutLiftMinor} readOnly={readOnly} />
            <Num name="longCarryThresholdM" label="Long carry over (m)" value={r.longCarryThresholdM} readOnly={readOnly} />
            <Money name="longCarry" label="Long carry charge" value={r.longCarryMinor} readOnly={readOnly} />
          </div>
        </Group>

        <Group title="Date multipliers" hint="1.15 means 15% more. 1 means no uplift.">
          <div className="grid gap-x-6 sm:grid-cols-3">
            <Rate name="weekendMultiplier" label="Weekend" value={r.weekendMultiplier} readOnly={readOnly} />
            <Rate name="bankHolidayMultiplier" label="Bank holiday" value={r.bankHolidayMultiplier} readOnly={readOnly} />
            <Rate name="peakSeasonMultiplier" label="Peak season" value={r.peakSeasonMultiplier} readOnly={readOnly} />
          </div>
        </Group>

        <Group title="VAT and deposit" hint="Rates as fractions: 0.2 is 20%.">
          <div className="grid gap-x-6 sm:grid-cols-3">
            <Rate name="vatRate" label="VAT rate" value={r.vatRate} readOnly={readOnly} />
            <Rate name="depositPercentage" label="Deposit" value={r.depositPercentage} readOnly={readOnly} />
            <Money name="depositMinimum" label="Minimum deposit" value={r.depositMinimumMinor} readOnly={readOnly} />
          </div>
        </Group>

        {readOnly ? null : (
          <div className="flex flex-wrap items-center gap-4">
            <SubmitButton label="Save changes" />
            <Result state={saveState} />
          </div>
        )}
      </form>

      {readOnly ? null : (
        <form action={flag} className="mt-10 border-t border-hairline pt-6">
          <input type="hidden" name="id" value={card.id} />
          <h2 className="text-title-3 text-ink-1">
            {card.provisional ? "Sign these rates off" : "These rates are confirmed"}
          </h2>
          <p className="mt-2 max-w-[70ch] text-body-dense text-ink-2">
            {card.provisional
              ? "Until a card is confirmed, every quote built from it carries a PROVISIONAL PRICING watermark. Confirming says these are the commercial rates the business will honour."
              : "Quotes from this card are sent as final prices. Mark it provisional again if the numbers are under review."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <SubmitButton
              label={card.provisional ? "Confirm these rates" : "Mark provisional again"}
              variant={card.provisional ? "primary" : "secondary"}
            />
            <Result state={flagState} />
          </div>
        </form>
      )}
    </>
  );
}

function SubmitButton({ label, variant = "primary" }: { label: string; variant?: "primary" | "secondary" }) {
  // useFormStatus reads the enclosing form, so the button disables itself for
  // the duration without any state plumbing — and cannot be left spinning.
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? "Working…" : label}
    </Button>
  );
}

function Result({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return (
    <p
      role="status"
      aria-live="polite"
      className={state.ok ? "text-body-dense text-status-good-text" : "text-body-dense text-status-critical-text"}
    >
      {state.message}
    </p>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-title-3 text-ink-1">{title}</h2>
      {hint ? <p className="mb-4 mt-1 max-w-[70ch] text-body-dense text-ink-2">{hint}</p> : <div className="mb-4" />}
      {children}
    </section>
  );
}

function Money({ name, label, value, readOnly }: { name: string; label: string; value?: number; readOnly: boolean }) {
  return (
    <Field label={`${label} (£)`} htmlFor={name}>
      <TextInput id={name} name={name} type="number" step="0.01" min="0"
        defaultValue={minorToPounds(value)} readOnly={readOnly} disabled={readOnly} data-numeric />
    </Field>
  );
}

function Num({ name, label, value, readOnly }: { name: string; label: string; value?: number | null; readOnly: boolean }) {
  return (
    <Field label={label} htmlFor={name}>
      <TextInput id={name} name={name} type="number" step="1" min="0"
        defaultValue={String(value ?? 0)} readOnly={readOnly} disabled={readOnly} data-numeric />
    </Field>
  );
}

function Rate({ name, label, value, readOnly }: { name: string; label: string; value?: number; readOnly: boolean }) {
  return (
    <Field label={label} htmlFor={name}>
      <TextInput id={name} name={name} type="number" step="0.01" min="0"
        defaultValue={String(value ?? 0)} readOnly={readOnly} disabled={readOnly} data-numeric />
    </Field>
  );
}
