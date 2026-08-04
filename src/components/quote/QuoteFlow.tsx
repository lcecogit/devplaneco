"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AddressStep, newStop } from "@/components/quote/steps/AddressStep";
import { ItemsStep } from "@/components/quote/steps/ItemsStep";
import { DateStep } from "@/components/quote/steps/DateStep";
import { QuoteSidebar } from "@/components/quote/QuoteSidebar";
import { StepProgress } from "@/components/quote/StepProgress";
import { createQuote, fetchQuote, updateQuote, type ItemPayload, type StopPayload } from "@/lib/quote/api";
import { FULL_DAY_WINDOW, type CrewSize } from "@/lib/pricing/calculate-price";
import type { DrawerSelection } from "@/components/quote/DateDrawer";
import type { CatalogueItem, QuoteItem, QuoteStop, TimeWindow } from "@/lib/quote/types";

// Orchestrates the three steps and owns all quote state.
//
// State lives here in React and is mirrored to the database at each step
// boundary (and on every step-3 change, since that's what determines the
// price we store). The quote's UUID goes in the URL as ?quote=… so the
// visitor can close the tab and come back — that's the capability token the
// API routes check, and it's why the reference number alone isn't enough.

const QUOTE_PARAM = "quote";

/** UK-local "today", matching the pricing engine's lead-time anchor. */
function ukToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function toStopPayload(stop: QuoteStop): StopPayload {
  return {
    addressText: stop.addressText,
    addressLine: stop.addressLine,
    postcode: stop.postcode,
    outcode: stop.outcode,
    lat: stop.lat,
    lng: stop.lng,
    floor: stop.floor,
    hasLift: stop.hasLift,
  };
}

function toItemPayload(item: QuoteItem): ItemPayload {
  return {
    catalogueItemId: item.catalogueItemId,
    name: item.name,
    quantity: item.quantity,
    lengthCm: item.lengthCm,
    widthCm: item.widthCm,
    heightCm: item.heightCm,
    weightKg: item.weightKg,
    volumeM3: item.volumeM3,
  };
}

export function QuoteFlow({ categoryHint }: { categoryHint: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteParam = searchParams.get(QUOTE_PARAM);

  const [step, setStep] = useState(1);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [reference, setReference] = useState<string>("");
  // Lazy initialiser — newStop() calls crypto.randomUUID(), which we only
  // want running once per mount, not on every render.
  const [stops, setStops] = useState<QuoteStop[]>(() => [newStop(), newStop()]);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [crewSize, setCrewSize] = useState<CrewSize>(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [collectionWindow, setCollectionWindow] = useState<TimeWindow>(FULL_DAY_WINDOW);
  const [deliveryWindow, setDeliveryWindow] = useState<TimeWindow>(FULL_DAY_WINDOW);
  const [helperIncluded, setHelperIncluded] = useState(false);
  const [distanceMiles, setDistanceMiles] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(Boolean(quoteParam));

  const today = useMemo(ukToday, []);

  // --- Catalogue -----------------------------------------------------
  // Loaded once, read directly from Supabase: item_catalogue is public
  // reference data with an `is_active` RLS read policy, so it doesn't need
  // to go through our API routes the way the quote tables do.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error: loadError } = await supabase
        .from("item_catalogue")
        .select("id,name,category,length_cm,width_cm,height_cm,volume_m3,weight_kg,search_terms")
        .eq("is_active", true)
        .order("category")
        .order("sort_order");

      if (cancelled) return;
      if (loadError) {
        setCatalogueError("We couldn't load the item list. You can still add custom items.");
        return;
      }

      setCatalogue(
        (data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          lengthCm: Number(row.length_cm),
          widthCm: Number(row.width_cm),
          heightCm: Number(row.height_cm),
          volumeM3: Number(row.volume_m3),
          weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
          searchTerms: row.search_terms ?? [],
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Restore an existing quote from ?quote=… -----------------------
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!quoteParam || restoredRef.current) return;
    restoredRef.current = true;

    (async () => {
      try {
        const draft = await fetchQuote(quoteParam);
        setQuoteId(draft.id);
        setReference(draft.reference);
        if (draft.stops.length >= 2) setStops(draft.stops);
        setItems(draft.items);
        setCrewSize(draft.crewSize ?? 1);
        setSelectedDate(null); // don't reopen the drawer on a fresh load
        setCollectionWindow(draft.collectionWindow ?? FULL_DAY_WINDOW);
        setDeliveryWindow(draft.deliveryWindow ?? FULL_DAY_WINDOW);
        setHelperIncluded(draft.helperIncluded);
        setDistanceMiles(draft.distanceMiles);
        setDurationMinutes(draft.durationMinutes);
        setTotalPrice(draft.totalPrice);
        setEmail(draft.email);
        setMarketingOptIn(draft.marketingOptIn);
        setStep(draft.items.length > 0 ? 3 : 2);
      } catch {
        setError("We couldn't find that quote. Start a new one below.");
      } finally {
        setRestoring(false);
      }
    })();
  }, [quoteParam]);

  const applyDraft = useCallback(
    (draft: Awaited<ReturnType<typeof fetchQuote>>) => {
      setQuoteId(draft.id);
      setReference(draft.reference);
      setDistanceMiles(draft.distanceMiles);
      setDurationMinutes(draft.durationMinutes);
      setTotalPrice(draft.totalPrice);
      setEmail(draft.email);
      setMarketingOptIn(draft.marketingOptIn);
      // Stops and items come back with database ids as their keys — adopt
      // them so subsequent edits target the same rows.
      if (draft.stops.length >= 2) setStops(draft.stops);
      if (draft.items.length > 0) setItems(draft.items);
    },
    []
  );

  // --- Step 1 → 2 -----------------------------------------------------
  async function handleAddressesNext() {
    setError(null);
    setBusy(true);
    try {
      const payload = stops.map(toStopPayload);
      const draft = quoteId
        ? await updateQuote(quoteId, { stops: payload })
        : await createQuote({ stops: payload, categoryHint });

      applyDraft(draft);

      if (!quoteId) {
        // Put the id in the URL so the quote is recoverable. replace, not
        // push — Back from step 2 should go to step 2's own back button
        // behaviour, not bounce the browser out of the flow.
        const params = new URLSearchParams(searchParams.toString());
        params.set(QUOTE_PARAM, draft.id);
        router.replace(`/quote?${params.toString()}`, { scroll: false });
      }

      setStep(2);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't save your addresses.");
    } finally {
      setBusy(false);
    }
  }

  // --- Step 2 → 3 -----------------------------------------------------
  async function handleItemsNext() {
    if (!quoteId || items.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      applyDraft(
        await updateQuote(quoteId, {
          items: items.map(toItemPayload),
          crewSize,
          helperIncluded: crewSize === 2,
        })
      );
      setHelperIncluded(crewSize === 2);
      setStep(3);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't save your items.");
    } finally {
      setBusy(false);
    }
  }

  // --- Step 3 ---------------------------------------------------------
  // Every change in step 3 is persisted, because the price we store has to
  // match the price on screen. The server recalculates it either way — the
  // client-side number is only for instant feedback.
  const persistPricing = useCallback(
    async (patch: {
      crewSize?: CrewSize;
      selectedDate?: string | null;
      collectionWindow?: TimeWindow;
      deliveryWindow?: TimeWindow;
      helperIncluded?: boolean;
    }) => {
      if (!quoteId) return;
      try {
        const draft = await updateQuote(quoteId, patch);
        setTotalPrice(draft.totalPrice);
      } catch {
        // A failed autosave shouldn't interrupt someone browsing dates —
        // the next change retries, and "Proceed & Book" saves explicitly.
      }
    },
    [quoteId]
  );

  function handleCrewSizeChange(next: CrewSize) {
    setCrewSize(next);
    // The 2-person crew includes a helper by default; the 1-person crew
    // doesn't. Keeps the two tabs internally consistent.
    const nextHelper = next === 2;
    setHelperIncluded(nextHelper);
    void persistPricing({ crewSize: next, helperIncluded: nextHelper });
  }

  function handleSelectDate(date: string | null) {
    setSelectedDate(date);
    if (date) void persistPricing({ selectedDate: date });
  }

  function handleSelectionChange(selection: DrawerSelection) {
    setCollectionWindow(selection.collectionWindow);
    setDeliveryWindow(selection.deliveryWindow);
    setHelperIncluded(selection.helperIncluded);
    void persistPricing(selection);
  }

  async function handleProceed() {
    if (!quoteId || !selectedDate) return;
    setError(null);
    setBusy(true);
    try {
      await updateQuote(quoteId, {
        crewSize,
        selectedDate,
        collectionWindow,
        deliveryWindow,
        helperIncluded,
      });
      router.push(`/quote/checkout?${QUOTE_PARAM}=${quoteId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't save your selection.");
      setBusy(false);
    }
  }

  async function handleSaveEmail(nextEmail: string, optIn: boolean) {
    if (!quoteId) return;
    const draft = await updateQuote(quoteId, { email: nextEmail, marketingOptIn: optIn });
    setEmail(draft.email);
    setMarketingOptIn(draft.marketingOptIn);
  }

  const pricingStops = useMemo(
    () => stops.map((stop) => ({ floor: stop.floor, hasLift: stop.hasLift })),
    [stops]
  );

  if (restoring) {
    return <p className="py-12 text-center text-sm text-ink-700">Loading your quote…</p>;
  }

  const showSidebar = step >= 2 && Boolean(quoteId);

  return (
    <div className={showSidebar ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" : ""}>
      <div className="min-w-0">
        <StepProgress currentStep={step} />

        <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6 sm:p-8">
          {step === 1 && (
            <AddressStep
              stops={stops}
              onChange={setStops}
              onNext={handleAddressesNext}
              submitting={busy}
              error={error}
            />
          )}

          {step === 2 && (
            <ItemsStep
              catalogue={catalogue}
              catalogueError={catalogueError}
              items={items}
              onChange={setItems}
              onBack={() => setStep(1)}
              onNext={handleItemsNext}
              submitting={busy}
              error={error}
            />
          )}

          {step === 3 && (
            <DateStep
              totalVolumeM3={items.reduce((sum, item) => sum + item.volumeM3 * item.quantity, 0)}
              distanceMiles={distanceMiles}
              stops={pricingStops}
              today={today}
              crewSize={crewSize}
              onCrewSizeChange={handleCrewSizeChange}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              collectionWindow={collectionWindow}
              deliveryWindow={deliveryWindow}
              helperIncluded={helperIncluded}
              onSelectionChange={handleSelectionChange}
              onBack={() => setStep(2)}
              onProceed={handleProceed}
              proceeding={busy}
              error={error}
            />
          )}
        </div>
      </div>

      {showSidebar && (
        <QuoteSidebar
          reference={reference}
          stops={stops}
          items={items}
          distanceMiles={distanceMiles}
          durationMinutes={durationMinutes}
          totalPrice={step === 3 ? totalPrice : null}
          email={email}
          marketingOptIn={marketingOptIn}
          onEditItems={() => setStep(2)}
          onSaveEmail={handleSaveEmail}
        />
      )}
    </div>
  );
}
