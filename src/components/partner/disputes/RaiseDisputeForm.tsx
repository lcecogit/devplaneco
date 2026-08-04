"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// deallocation_charges_update already scopes this to the calling partner's
// own rows and allows the write (migration 0007's "update it only to
// submit a dispute") — a direct table update, same shape as the admin
// side's DisputeActions, just flipping dispute_status the other direction.
export function RaiseDisputeForm({ chargeId }: { chargeId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) return;

    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("deallocation_charges")
      .update({ dispute_status: "submitted", dispute_reason: reason.trim() })
      .eq("id", chargeId)
      .eq("dispute_status", "none");

    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="disputeReason" className="text-sm font-medium text-ink-800">
          Why are you disputing this charge?
        </label>
        <textarea
          id="disputeReason"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-coral-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !reason.trim()}
        className="self-start rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit dispute"}
      </button>
    </form>
  );
}
