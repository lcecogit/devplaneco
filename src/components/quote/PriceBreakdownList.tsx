import { floorLabel } from "@/lib/quote/types";
import type { PriceBreakdown } from "@/lib/pricing/calculate-price";

// Shows how a price was arrived at, line by line.
//
// The brief for checkout is explicit that the customer must not be shown one
// opaque number, and this is the component that honours it. Everything here
// comes out of the stored `quotes.price_breakdown`, so what's displayed is
// literally the arithmetic the pricing engine did — not a re-derivation that
// could drift from it.

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function money(value: number): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}£${Math.abs(value).toFixed(2)}`;
}

/** "×1.45" — only worth showing when it isn't 1. */
function multiplierNote(label: string, multiplier: number): string | null {
  if (Math.abs(multiplier - 1) < 0.0001) return null;
  return `${label} ×${multiplier.toFixed(2)}`;
}

function leadTimeLabel(days: number): string {
  if (days <= 0) return "Booked for today";
  if (days === 1) return "Booked for tomorrow";
  return `Booked ${days} days ahead`;
}

function Row({
  label,
  detail,
  value,
  emphasis,
}: {
  label: string;
  detail?: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className={emphasis ? "font-semibold text-ink-900" : "text-ink-700"}>
        {label}
        {detail && <span className="ml-1.5 text-xs text-ink-700">{detail}</span>}
      </span>
      <span
        className={`shrink-0 tabular-nums ${emphasis ? "font-semibold text-ink-900" : "text-ink-900"}`}
      >
        {value}
      </span>
    </div>
  );
}

export function PriceBreakdownList({ breakdown }: { breakdown: PriceBreakdown }) {
  const { inputs } = breakdown;

  const multipliers = [
    multiplierNote(inputs.crewSize === 2 ? "2-person crew" : "1-person crew", breakdown.crewMultiplier),
    multiplierNote(DAY_NAMES[inputs.dayOfWeek] ?? "Day rate", breakdown.dayOfWeekMultiplier),
    multiplierNote(leadTimeLabel(inputs.leadTimeDays), breakdown.leadTimeMultiplier),
  ].filter((note): note is string => note !== null);

  return (
    <div className="text-sm">
      <Row label="Call-out charge" value={money(breakdown.calloutGBP)} />
      <Row
        label="Volume"
        detail={`${inputs.totalVolumeM3.toFixed(2)} m³`}
        value={money(breakdown.volumeGBP)}
      />
      <Row
        label="Distance"
        detail={`${inputs.distanceMiles.toFixed(1)} miles`}
        value={money(breakdown.distanceGBP)}
      />

      <div className="mt-1 border-t border-brand-100 pt-1">
        <Row label="Base price" value={money(breakdown.baseGBP)} emphasis />
      </div>

      {multipliers.length > 0 && (
        <div className="mt-1 border-t border-brand-100 pt-1">
          <Row
            label="Crew, day and lead time"
            detail={multipliers.join(" · ")}
            value={money(breakdown.scaledBaseGBP)}
            emphasis
          />
        </div>
      )}

      {breakdown.accessGBP !== 0 && (
        <Row
          label="Building access"
          detail={breakdown.accessDetail
            .filter((stop) => stop.surchargeGBP !== 0)
            .map((stop) => `${floorLabel(stop.floor)}${stop.hasLift ? " (lift)" : ""}`)
            .join(", ")}
          value={money(breakdown.accessGBP)}
        />
      )}

      {breakdown.windowGBP !== 0 && (
        <Row
          label="Narrower time windows"
          detail="Instead of a full day"
          value={money(breakdown.windowGBP)}
        />
      )}

      {breakdown.helperGBP !== 0 && (
        <Row
          label={breakdown.helperGBP > 0 ? "Extra helper" : "No extra helper"}
          value={money(breakdown.helperGBP)}
        />
      )}

      {breakdown.minimumApplied && (
        <p className="py-1.5 text-xs text-ink-700">
          Our minimum charge applies to this job, so the total below is higher than the lines
          above add up to.
        </p>
      )}

      <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-brand-200 pt-3">
        <span className="font-heading text-base font-bold text-ink-900">Total</span>
        <span className="font-heading text-2xl font-extrabold tabular-nums text-ink-900">
          £{breakdown.totalGBP.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
