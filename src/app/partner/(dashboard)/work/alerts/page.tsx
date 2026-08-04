import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { BellIcon, CarIcon } from "@/components/icons";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";
import { SavedSearchForm } from "@/components/partner/work/SavedSearchForm";
import { DeleteSavedSearchButton } from "@/components/partner/work/DeleteSavedSearchButton";

export const metadata: Metadata = { title: "Alerts" };

type SearchFilters = {
  categories?: string[];
  postcodeArea?: string;
  minPrice?: number;
  maxPrice?: number;
};

function formatWindow(start: string | null, end: string | null) {
  if (!start) return "Date TBC";
  const startDate = new Date(start);
  const datePart = startDate.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  if (!end) return datePart;
  const timePart = `${startDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}–${new Date(
    end
  ).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  return `${datePart}, ${timePart}`;
}

function describeFilters(filters: SearchFilters) {
  const parts: string[] = [];
  if (filters.categories?.length) {
    parts.push(
      filters.categories
        .map((slug) => SERVICE_CATEGORIES.find((s) => s.slug === slug)?.title ?? slug)
        .join(", ")
    );
  } else {
    parts.push("Any category");
  }
  if (filters.postcodeArea) parts.push(`near ${filters.postcodeArea.toUpperCase()}`);
  if (filters.minPrice != null || filters.maxPrice != null) {
    parts.push(`£${filters.minPrice ?? "0"}–£${filters.maxPrice ?? "any"}`);
  }
  return parts.join(" · ");
}

export default async function AlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { count: approvedVehicleCount } = await supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true })
    .eq("transport_partner_id", partner!.id)
    .eq("approval_status", "approved");

  if (!approvedVehicleCount) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Alerts</h1>
        <p className="mt-1 text-sm text-ink-700">Get notified when a job matching your criteria is listed.</p>
        <EmptyState
          icon={CarIcon}
          title="Add an approved vehicle to start setting up alerts"
          description="Alerts are matched against your approved vehicles, so you'll need at least one before they can find you work."
        />
        <Link
          href="/partner/vehicles/new"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral-600"
        >
          Add a vehicle
        </Link>
      </div>
    );
  }

  // saved_searches is a direct, RLS-scoped select (fully partner-owned since
  // Phase 2) — alert_matches() is the only new piece, a SECURITY DEFINER RPC
  // (migration 0038) needed because a matching job may still be 'listed' and
  // not yet assigned to this partner, same reasoning as find_work_jobs.
  const [{ data: savedSearches }, { data: matches, error }] = await Promise.all([
    supabase
      .from("saved_searches")
      .select("id, name, filters")
      .eq("transport_partner_id", partner!.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("alert_matches"),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink-900">Alerts</h1>
          <p className="mt-1 text-sm text-ink-700">Get notified when a job matching your criteria is listed.</p>
        </div>
        <SavedSearchForm transportPartnerId={partner!.id} />
      </div>

      <h2 className="mt-8 font-heading text-lg font-bold text-ink-900">Your alerts</h2>
      {!savedSearches?.length ? (
        <p className="mt-2 text-sm text-ink-700">
          No alerts yet — create one above to start matching listed jobs against your own criteria.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {savedSearches.map((search) => (
            <div
              key={search.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-brand-100 bg-white p-4"
            >
              <div>
                <p className="text-sm font-semibold text-ink-900">{search.name}</p>
                <p className="text-xs text-ink-700">{describeFilters((search.filters as SearchFilters) ?? {})}</p>
              </div>
              <DeleteSavedSearchButton savedSearchId={search.id} />
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-10 font-heading text-lg font-bold text-ink-900">Matching jobs</h2>
      {error ? (
        <p className="mt-4 text-sm font-medium text-coral-600">Couldn&apos;t load matches: {error.message}</p>
      ) : !matches?.length ? (
        <EmptyState
          icon={BellIcon}
          title="No matches right now"
          description="Listed jobs matching one of your alerts will show up here — check back, or widen your criteria."
        />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {matches.map((job) => {
            const category = SERVICE_CATEGORIES.find((s) => s.slug === job.category);
            const href = job.allocation_method === "auction" ? "/partner/work/bidding" : "/partner/work/find";
            return (
              <Link
                key={job.job_id}
                href={href}
                className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-white p-5 hover:border-brand-300 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  {category && (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint-50 text-mint-600">
                      <category.icon className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <p className="font-heading text-sm font-bold text-ink-900">
                      {category?.title ?? job.category ?? "Move"}
                      <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                        {job.matched_search_name}
                      </span>
                    </p>
                    <p className="text-sm text-ink-700">
                      {job.collection_area || "?"} → {job.delivery_area || "?"}
                    </p>
                    <p className="text-xs text-ink-700">
                      {formatWindow(job.collection_window_start, job.collection_window_end)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-6 sm:flex-col sm:items-end sm:gap-1">
                  <p className="font-heading text-lg font-extrabold text-ink-900">
                    {job.customer_price != null ? `£${Number(job.customer_price).toFixed(2)}` : "TBC"}
                  </p>
                  <p className="text-xs capitalize text-ink-700">
                    {job.allocation_method === "auction" ? `${job.bid_count} bids so far` : "Click & claim"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
