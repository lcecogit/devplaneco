"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AcceptGuidelinesButton({ transportPartnerId }: { transportPartnerId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    // transport_partners already has an update policy scoped to the
    // caller's own row (ProfileForm uses the same path) — no RPC needed.
    const { error: updateError } = await supabase
      .from("transport_partners")
      .update({ guidelines_accepted_at: new Date().toISOString() })
      .eq("id", transportPartnerId);
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/partner/work/find");
    router.refresh();
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 text-sm font-medium text-coral-600">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={accept}
        disabled={submitting}
        className="w-full rounded-full bg-coral-500 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-60 sm:w-auto"
      >
        {submitting ? "Saving…" : "I adhere to the Partner Guidelines"}
      </button>
    </div>
  );
}
