"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Interest = {
  interest_id: string;
  business_name: string;
  note: string | null;
  submitted_at: string;
};

export function InterestedPartners({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [interests, setInterests] = useState<Interest[] | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .rpc("job_interested_partners", { p_job_id: jobId })
      .then(({ data }) => setInterests(data ?? []));
  }, [jobId]);

  async function select(interestId: string) {
    setError(null);
    setSelecting(interestId);
    const supabase = createClient();
    // select_interested_partner() is an atomic single UPDATE guarded by
    // matching_status = 'listed' — see migration 0043 — so a second click
    // (or a second tab) can't double-assign the job.
    const { data, error: rpcError } = await supabase.rpc("select_interested_partner", {
      p_job_id: jobId,
      p_interest_id: interestId,
    });
    setSelecting(null);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const result = data as { selected: boolean; reason?: string } | null;
    if (!result?.selected) {
      setError(result?.reason ?? "That partner is no longer available.");
      return;
    }

    router.refresh();
  }

  if (interests === null) {
    return <p className="text-sm text-ink-700">Loading interested partners…</p>;
  }

  if (!interests.length) {
    return (
      <p className="text-sm text-ink-700">
        No partners have expressed interest yet — check back soon.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm font-medium text-coral-600">
          {error}
        </p>
      )}
      {interests.map((interest) => (
        <div
          key={interest.interest_id}
          className="flex items-center justify-between gap-4 rounded-xl border border-brand-100 p-4"
        >
          <div>
            <p className="text-sm font-semibold text-ink-900">{interest.business_name}</p>
            {interest.note && <p className="mt-1 text-sm text-ink-700">&ldquo;{interest.note}&rdquo;</p>}
          </div>
          <button
            type="button"
            onClick={() => select(interest.interest_id)}
            disabled={selecting !== null}
            className="shrink-0 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-60"
          >
            {selecting === interest.interest_id ? "Choosing…" : "Choose this partner"}
          </button>
        </div>
      ))}
    </div>
  );
}
