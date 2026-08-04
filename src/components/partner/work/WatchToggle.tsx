"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StarIcon } from "@/components/icons";

// job_watchlist RLS already scopes reads/writes to the caller's own rows
// (transport_partner_id = current_partner_id()) — a plain insert/delete is
// enough here, no RPC needed for a toggle with no business logic beyond
// ownership.
export function WatchToggle({
  jobId,
  transportPartnerId,
  initialWatched,
}: {
  jobId: string;
  transportPartnerId: string;
  initialWatched: boolean;
}) {
  const router = useRouter();
  const [watched, setWatched] = useState(initialWatched);
  const [pending, setPending] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPending(true);
    const supabase = createClient();

    if (watched) {
      await supabase
        .from("job_watchlist")
        .delete()
        .eq("job_id", jobId)
        .eq("transport_partner_id", transportPartnerId);
    } else {
      await supabase.from("job_watchlist").insert({ job_id: jobId, transport_partner_id: transportPartnerId });
    }

    setPending(false);
    setWatched(!watched);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={watched}
      aria-label={watched ? "Stop watching this job" : "Watch this job"}
      title={watched ? "Stop watching" : "Watch"}
      className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-brand-50 disabled:opacity-60"
    >
      <StarIcon className={`h-5 w-5 ${watched ? "text-coral-500" : "text-ink-300"}`} />
    </button>
  );
}
