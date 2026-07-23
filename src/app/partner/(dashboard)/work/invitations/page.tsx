import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { MessageIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Invitations" };

export default async function InvitationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: invitations } = await supabase
    .from("job_invitations")
    .select("id, status, created_at")
    .eq("transport_partner_id", partner!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Invitations</h1>
      <p className="mt-1 text-sm text-ink-700">
        Jobs other partners or customers have invited you to bid on directly.
      </p>

      {!invitations?.length ? (
        <EmptyState
          icon={MessageIcon}
          title="No invitations yet"
          description="Direct invitations to bid on a job will show up here."
        />
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="rounded-2xl border border-brand-100 bg-white p-5">
              <p className="text-sm text-ink-800">{invitation.status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
