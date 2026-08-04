import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StarIcon } from "@/components/icons";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";
import { WatchToggle } from "@/components/partner/work/WatchToggle";

export const metadata: Metadata = { title: "Watching" };

const MATCHING_STATUS_LABELS: Record<string, string> = {
  listed: "Still listed",
  matched: "Matched — no longer available",
  cancelled: "Cancelled by customer",
  draft: "Draft",
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

export default async function WatchingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  // my_watchlist() is a SECURITY DEFINER RPC (migration 0037) — a watched
  // job can still be 'listed' and not yet assigned to this partner, so a
  // plain jobs select won't return it post-migration-0035's privacy fix.
  const { data: watched, error } = await supabase.rpc("my_watchlist");

  if (error) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Watching</h1>
        <p className="mt-4 text-sm font-medium text-coral-600">
          Couldn&apos;t load your watchlist right now: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Watching</h1>
      <p className="mt-1 text-sm text-ink-700">Jobs you&apos;ve saved to keep an eye on.</p>

      {!watched?.length ? (
        <EmptyState
          icon={StarIcon}
          title="Nothing on your watchlist"
          description="Tap the star on a job in Find Work or Bidding to track it here."
        />
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {watched.map((item) => {
            const category = SERVICE_CATEGORIES.find((s) => s.slug === item.category);
            return (
              <div
                key={item.watchlist_id}
                className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  {category && (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint-50 text-mint-600">
                      <category.icon className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <p className="font-heading text-sm font-bold text-ink-900">
                      {category?.title ?? item.category ?? "Move"}
                    </p>
                    <p className="text-sm text-ink-700">
                      {item.collection_area || "?"} → {item.delivery_area || "?"}
                    </p>
                    <p className="text-xs text-ink-700">
                      {formatWindow(item.collection_window_start, item.collection_window_end)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-ink-900">
                      {MATCHING_STATUS_LABELS[item.matching_status] ?? item.matching_status}
                      {item.matching_status === "listed" && item.allocation_method === "auction" && (
                        <span className="font-normal text-ink-700"> · {item.bid_count} bids so far</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {item.customer_price != null && (
                    <p className="font-heading text-lg font-extrabold text-ink-900">
                      £{Number(item.customer_price).toFixed(2)}
                    </p>
                  )}
                  <WatchToggle jobId={item.job_id} transportPartnerId={partner!.id} initialWatched={true} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
