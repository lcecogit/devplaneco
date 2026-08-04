"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  { key: "punctuality_rating", label: "Punctuality" },
  { key: "communication_rating", label: "Communication" },
  { key: "care_of_goods_rating", label: "Care of Goods" },
  { key: "presentation_rating", label: "Presentation" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

function StarPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          aria-pressed={value >= n}
          className={`text-xl leading-none ${value >= n ? "text-brand-600" : "text-brand-100"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function RatingForm({
  jobId,
  customerId,
  transportPartnerId,
  partnerName,
}: {
  jobId: string;
  customerId: string;
  transportPartnerId: string;
  partnerName: string;
}) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<CategoryKey, number>>({
    punctuality_rating: 0,
    communication_rating: 0,
    care_of_goods_rating: 0,
    presentation_rating: 0,
  });
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <p className="text-sm font-medium text-mint-700">Thanks — your review has been submitted.</p>;
  }

  async function submit() {
    const missing = CATEGORIES.some((c) => scores[c.key] === 0);
    if (missing) {
      setError("Rate all four categories before submitting.");
      return;
    }

    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    // ratings_insert (migration 0040) verifies job_id/transport_partner_id
    // actually belong together server-side — this isn't just a UI gate.
    // `rating` (overall) is computed by a DB trigger from the four category
    // scores, not sent here.
    const { error: insertError } = await supabase.from("ratings").insert({
      job_id: jobId,
      customer_id: customerId,
      transport_partner_id: transportPartnerId,
      rating: Math.round((scores.punctuality_rating + scores.communication_rating + scores.care_of_goods_rating + scores.presentation_rating) / 4),
      punctuality_rating: scores.punctuality_rating,
      communication_rating: scores.communication_rating,
      care_of_goods_rating: scores.care_of_goods_rating,
      presentation_rating: scores.presentation_rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSubmitted(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-700">How did {partnerName} do?</p>
      {CATEGORIES.map((c) => (
        <div key={c.key} className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-ink-800">{c.label}</span>
          <StarPicker value={scores[c.key]} onChange={(v) => setScores((prev) => ({ ...prev, [c.key]: v }))} />
        </div>
      ))}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-800">
        Comment (optional)
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="rounded-lg border border-brand-100 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
        />
      </label>

      {error && (
        <p role="alert" className="text-xs font-medium text-coral-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="self-start rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}
