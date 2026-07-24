"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  isBookableQuote,
  isQuoteReadyForEstimate,
  useQuoteState,
  type QuoteCategory,
  type TimeWindow,
} from "@/lib/quote/quote-state";
import { estimateQuote } from "@/lib/pricing/estimate-quote";
import { estimateDistanceMiles } from "@/lib/pricing/postcode-distance";
import { StepProgress } from "@/components/quote/StepProgress";
import { CategoryStep } from "@/components/quote/steps/CategoryStep";
import { RouteStep, type RouteStepValue } from "@/components/quote/steps/RouteStep";
import { DetailsStep } from "@/components/quote/steps/DetailsStep";
import { EstimateStep } from "@/components/quote/steps/EstimateStep";
import { ConfirmStep } from "@/components/quote/steps/ConfirmStep";

type AuthState = { status: "loading" } | { status: "anon" } | { status: "customer"; customerId: string };

export function QuoteWizard() {
  const router = useRouter();
  const { state: quote, hydrated, update, clear } = useQuoteState();
  const [step, setStep] = useState(1);
  const [estimating, setEstimating] = useState(false);
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const jumpedToSavedStep = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function loadAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setAuth({ status: "anon" });
        return;
      }
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setAuth(customer ? { status: "customer", customerId: customer.id } : { status: "anon" });
    }
    loadAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  // Resume an in-progress quote (e.g. after being sent off to sign up) at
  // the right step instead of restarting the wizard from step 1.
  useEffect(() => {
    if (!hydrated || auth.status === "loading" || jumpedToSavedStep.current) return;
    jumpedToSavedStep.current = true;

    if (quote.estimate && auth.status === "customer") {
      setStep(5);
    } else if (isQuoteReadyForEstimate(quote)) {
      setStep(4);
    }
  }, [hydrated, auth.status, quote]);

  async function goToEstimateStep() {
    setStep(4);
    setEstimating(true);
    const category = quote.category as QuoteCategory;
    const { distanceMiles, resolved } = await estimateDistanceMiles(
      quote.collectionPostcode ?? "",
      quote.deliveryPostcode ?? ""
    );
    const result = estimateQuote({
      category,
      distanceMiles,
      roomCount: quote.itemDetails?.roomCount,
      itemSizeTier: quote.itemDetails?.itemSizeTier,
    });
    update({
      estimate: {
        priceGBP: result.priceGBP,
        distanceMiles: result.distanceMiles,
        distanceResolved: resolved,
      },
    });
    setEstimating(false);
  }

  function handleBookNow() {
    if (auth.status === "customer") {
      setStep(5);
      return;
    }
    // Quote is already saved to sessionStorage on every change, so it
    // survives the trip through signup/login and back.
    router.push("/customer/signup?next=/quote");
  }

  function handleBooked() {
    clear();
    router.push("/customer/dashboard?justBooked=1");
  }

  const routeStepValue: RouteStepValue = {
    collectionAddress: quote.collectionAddress ?? "",
    collectionPostcode: quote.collectionPostcode ?? "",
    deliveryAddress: quote.deliveryAddress ?? "",
    deliveryPostcode: quote.deliveryPostcode ?? "",
    preferredDate: quote.preferredDate ?? "",
    timeWindow: (quote.timeWindow as TimeWindow) ?? "",
  };

  const canLeaveRouteStep = Boolean(
    routeStepValue.collectionPostcode &&
      routeStepValue.deliveryPostcode &&
      routeStepValue.preferredDate &&
      routeStepValue.timeWindow
  );

  if (!hydrated) return null;

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-6 sm:p-8">
      <StepProgress currentStep={step} />

      <div className="mt-8">
        {step === 1 && (
          <CategoryStep
            selected={quote.category}
            onSelect={(category) => {
              update({ category });
              setStep(2);
            }}
          />
        )}

        {step === 2 && <RouteStep value={routeStepValue} onChange={update} />}

        {step === 3 && quote.category && (
          <DetailsStep
            category={quote.category}
            value={quote.itemDetails ?? {}}
            onChange={(itemDetails) => update({ itemDetails })}
          />
        )}

        {step === 4 && <EstimateStep quote={quote} loading={estimating} />}

        {step === 5 && isBookableQuote(quote) && auth.status === "customer" && (
          <ConfirmStep
            quote={quote}
            customerId={auth.customerId}
            onBack={() => setStep(4)}
            onBooked={handleBooked}
          />
        )}
      </div>

      {step < 4 && (
        <div className="mt-8 flex justify-between border-t border-brand-100 pt-6">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="rounded-full border border-brand-300 px-6 py-3 text-sm font-semibold text-ink-700 hover:bg-brand-50 disabled:opacity-0"
          >
            Back
          </button>
          {step === 1 && (
            <button
              type="button"
              onClick={() => quote.category && setStep(2)}
              disabled={!quote.category}
              className="rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-40"
            >
              Continue
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={() => canLeaveRouteStep && setStep(3)}
              disabled={!canLeaveRouteStep}
              className="rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-40"
            >
              Continue
            </button>
          )}
          {step === 3 && (
            <button type="button" onClick={goToEstimateStep} className="rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600">
              See my estimate
            </button>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="mt-8 flex justify-between border-t border-brand-100 pt-6">
          <button
            type="button"
            onClick={() => setStep(3)}
            className="rounded-full border border-brand-300 px-6 py-3 text-sm font-semibold text-ink-700 hover:bg-brand-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleBookNow}
            disabled={estimating || auth.status === "loading"}
            className="rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-40"
          >
            Book now
          </button>
        </div>
      )}
    </div>
  );
}
