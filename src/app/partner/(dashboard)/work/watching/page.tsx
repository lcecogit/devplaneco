import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StarIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Watching" };

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

  const { data: watched } = await supabase
    .from("job_watchlist")
    .select("id, created_at")
    .eq("transport_partner_id", partner!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Watching</h1>
      <p className="mt-1 text-sm text-ink-700">Jobs you&apos;ve saved to keep an eye on.</p>

      {!watched?.length ? (
        <EmptyState
          icon={StarIcon}
          title="Nothing on your watchlist"
          description="Save a job while browsing to track it here — this will be available once the job marketplace goes live."
        />
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {watched.map((item) => (
            <div key={item.id} className="rounded-2xl border border-brand-100 bg-white p-5">
              <p className="text-sm text-ink-800">Watching since {item.created_at}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
