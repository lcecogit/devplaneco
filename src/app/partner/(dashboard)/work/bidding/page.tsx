import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { HandshakeIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Bidding" };

export default async function BiddingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: bids } = await supabase
    .from("bids")
    .select("id, amount, status, submitted_at")
    .eq("transport_partner_id", partner!.id)
    .order("submitted_at", { ascending: false });

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Bidding</h1>
      <p className="mt-1 text-sm text-ink-700">Jobs you&apos;ve placed a bid on.</p>

      {!bids?.length ? (
        <EmptyState
          icon={HandshakeIcon}
          title="No active bids"
          description="Jobs open for bidding will appear here once the marketplace has live listings."
        />
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {bids.map((bid) => (
            <div key={bid.id} className="rounded-2xl border border-brand-100 bg-white p-5">
              <p className="text-sm text-ink-800">
                £{bid.amount} · {bid.status}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
