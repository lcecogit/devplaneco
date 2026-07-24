import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { BoxIcon } from "@/components/icons";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";

export const metadata: Metadata = { title: "My Bookings" };

const MATCHING_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  listed: "Awaiting match",
  matched: "Matched",
  cancelled: "Cancelled",
};

const MATCHING_STATUS_STYLES: Record<string, string> = {
  draft: "bg-brand-50 text-brand-700",
  listed: "bg-brand-50 text-brand-700",
  matched: "bg-mint-50 text-mint-600",
  cancelled: "bg-coral-50 text-coral-600",
};

function formatDate(dateString: string | null) {
  if (!dateString) return "Date TBC";
  return new Date(dateString).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CustomerBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: bookings } = await supabase
    .from("jobs")
    .select(
      "id, category, collection_postcode, delivery_postcode, collection_window_start, matching_status, status, customer_price"
    )
    .eq("customer_id", customer!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">My Bookings</h1>

      {!bookings?.length ? (
        <EmptyState
          icon={BoxIcon}
          title="No bookings yet"
          description="Once you book a move, it'll show up here."
        />
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {bookings.map((booking) => {
            const category = SERVICE_CATEGORIES.find((s) => s.slug === booking.category);
            return (
              <Link
                key={booking.id}
                href={`/customer/bookings/${booking.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-5 hover:border-brand-300"
              >
                <div>
                  <p className="font-heading text-sm font-bold text-ink-900">
                    {category?.title ?? "Move"}
                  </p>
                  <p className="mt-1 text-sm text-ink-700">
                    {booking.collection_postcode} → {booking.delivery_postcode} ·{" "}
                    {formatDate(booking.collection_window_start)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {booking.customer_price != null && (
                    <span className="text-sm font-semibold text-ink-900">
                      £{Number(booking.customer_price).toFixed(2)}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      MATCHING_STATUS_STYLES[booking.matching_status] ?? "bg-brand-50 text-brand-700"
                    }`}
                  >
                    {MATCHING_STATUS_LABELS[booking.matching_status] ?? booking.matching_status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
