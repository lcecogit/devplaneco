import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StarIcon } from "@/components/icons";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";

export const metadata: Metadata = { title: "Customer Reviews" };

const CATEGORY_FIELDS = [
  { key: "punctuality_rating", label: "Punctuality" },
  { key: "communication_rating", label: "Communication" },
  { key: "care_of_goods_rating", label: "Care of Goods" },
  { key: "presentation_rating", label: "Presentation" },
] as const;

type Review = {
  rating_id: string;
  job_id: string;
  category: string | null;
  customer_name: string;
  punctuality_rating: number | null;
  communication_rating: number | null;
  care_of_goods_rating: number | null;
  presentation_rating: number | null;
  overall_rating: number;
  comment: string | null;
  created_at: string;
};

function average(reviews: Review[], key: (typeof CATEGORY_FIELDS)[number]["key"]) {
  const values = reviews.map((r) => r[key]).filter((v): v is number => v != null);
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function ScoreTile({ label, value, count }: { label: string; value: number | null; count: number }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">{label}</p>
      <p className="mt-1 font-heading text-2xl font-extrabold text-ink-900">
        {value != null ? value.toFixed(2) : "—"}
      </p>
      <p className="mt-1 text-xs text-ink-700">{count > 0 ? `${count} review${count === 1 ? "" : "s"}` : "No data"}</p>
    </div>
  );
}

export default async function PartnerReviewsPage() {
  const supabase = await createClient();

  // partner_reviews() is SECURITY DEFINER — a partner has no RLS path to a
  // reviewing customer's profiles row directly (same reasoning as
  // my_message_threads), so the display name comes from the RPC. See
  // migration 0040.
  const { data: reviews, error } = await supabase.rpc("partner_reviews");

  if (error) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Customer Reviews</h1>
        <p className="mt-4 text-sm font-medium text-coral-600">
          Couldn&apos;t load reviews right now: {error.message}
        </p>
      </div>
    );
  }

  const list = (reviews ?? []) as Review[];
  const overallAvg = list.length ? list.reduce((sum, r) => sum + Number(r.overall_rating), 0) / list.length : null;

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Customer Reviews</h1>
      <p className="mt-1 text-sm text-ink-700">What customers have said after a job with you.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {CATEGORY_FIELDS.map((field) => (
          <ScoreTile
            key={field.key}
            label={field.label}
            value={average(list, field.key)}
            count={list.filter((r) => r[field.key] != null).length}
          />
        ))}
        <ScoreTile label="Overall Average" value={overallAvg} count={list.length} />
      </div>

      {!list.length ? (
        <EmptyState
          icon={StarIcon}
          title="No reviews yet"
          description="Once a customer reviews a completed job, it'll show up here."
        />
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {list.map((review) => {
            const category = SERVICE_CATEGORIES.find((s) => s.slug === review.category);
            return (
              <div key={review.rating_id} className="rounded-2xl border border-brand-100 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      {category?.title ?? review.category ?? "Job"} — {review.customer_name}
                    </p>
                    <p className="text-xs text-ink-700">
                      {new Date(review.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                    {Number(review.overall_rating).toFixed(2)} overall
                  </span>
                </div>

                {review.comment && <p className="mt-3 text-sm text-ink-800">&ldquo;{review.comment}&rdquo;</p>}

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-700">
                  {CATEGORY_FIELDS.map((field) => (
                    <span key={field.key}>
                      {field.label}: {review[field.key] != null ? review[field.key] : "—"}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
