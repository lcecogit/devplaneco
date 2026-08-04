import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { BellIcon } from "@/components/icons";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";
import { InvitationActions, type InvitableVehicle } from "@/components/partner/work/InvitationActions";

export const metadata: Metadata = { title: "Invitations" };

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-brand-50 text-brand-700",
  accepted: "bg-mint-50 text-mint-700",
  declined: "bg-ink-50 text-ink-700",
  expired: "bg-coral-50 text-coral-700",
};

function formatWindow(start: string | null, end: string | null) {
  if (!start) return "Date TBC";
  const startDate = new Date(start);
  const datePart = startDate.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  if (!end) return datePart;
  const timePart = `${startDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}–${new Date(
    end
  ).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  return `${datePart}, ${timePart}`;
}

function formatTimeRemaining(expiresAt: string) {
  const msRemaining = new Date(expiresAt).getTime() - Date.now();
  if (msRemaining <= 0) return "Expiring soon";
  const minutes = Math.floor(msRemaining / (1000 * 60));
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m to respond`;
  return `${minutes}m to respond`;
}

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

  // my_job_invitations() is a SECURITY DEFINER RPC — see migration 0035 —
  // returning the address-free shape until a partner actually accepts, same
  // privacy boundary Find Work and Bidding already use.
  const [{ data: invitations, error }, { data: vehicles }] = await Promise.all([
    supabase.rpc("my_job_invitations"),
    supabase
      .from("vehicles")
      .select("id, registration_number, vehicle_type, make, model, can_transport_motorbikes")
      .eq("transport_partner_id", partner!.id)
      .eq("approval_status", "approved"),
  ]);

  if (error) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Invitations</h1>
        <p className="mt-4 text-sm font-medium text-coral-600">
          Couldn&apos;t load invitations right now: {error.message}
        </p>
      </div>
    );
  }

  const pending = (invitations ?? []).filter(
    (invitation) => invitation.status === "pending" && new Date(invitation.expires_at ?? 0) > new Date()
  );
  const past = (invitations ?? []).filter((invitation) => !pending.includes(invitation));

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Invitations</h1>
      <p className="mt-1 text-sm text-ink-700">
        Jobs matched to your declared availability, or invited to you directly.
      </p>

      <h2 className="mt-8 font-heading text-lg font-bold text-ink-900">Awaiting your response</h2>
      {!pending.length ? (
        <EmptyState
          icon={BellIcon}
          title="No invitations right now"
          description="A job that matches one of your reservations will show up here for you to accept or decline."
        />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {pending.map((invitation) => {
            const category = SERVICE_CATEGORIES.find((s) => s.slug === invitation.category);
            const compatibleVehicles: InvitableVehicle[] = (vehicles ?? [])
              .filter((v) => invitation.category !== "motorbike-transport" || v.can_transport_motorbikes)
              .map((v) => ({
                id: v.id,
                label: [v.registration_number, [v.make, v.model].filter(Boolean).join(" ") || v.vehicle_type]
                  .filter(Boolean)
                  .join(" — "),
              }));

            return (
              <div key={invitation.invitation_id} className="rounded-2xl border border-brand-100 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    {category && (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint-50 text-mint-600">
                        <category.icon className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <p className="font-heading text-sm font-bold text-ink-900">
                        {category?.title ?? invitation.category ?? "Move"}
                        {invitation.via_reservation && (
                          <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                            Matches your reservation
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-ink-700">
                        {invitation.collection_area || "?"} → {invitation.delivery_area || "?"}
                      </p>
                      <p className="text-xs text-ink-700">
                        {formatWindow(invitation.collection_window_start, invitation.collection_window_end)}
                      </p>
                      {invitation.payout_amount != null && (
                        <p className="mt-1 text-sm font-bold text-ink-900">
                          £{Number(invitation.payout_amount).toFixed(2)} payout
                        </p>
                      )}
                    </div>
                  </div>
                  {invitation.expires_at && (
                    <p className="shrink-0 text-sm font-semibold text-ink-900">
                      {formatTimeRemaining(invitation.expires_at)}
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <InvitationActions invitationId={invitation.invitation_id} vehicles={compatibleVehicles} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mt-10 font-heading text-lg font-bold text-ink-900">Past invitations</h2>
      {!past.length ? (
        <p className="mt-2 text-sm text-ink-700">Nothing here yet.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {past.map((invitation) => {
            const category = SERVICE_CATEGORIES.find((s) => s.slug === invitation.category);
            return (
              <div
                key={invitation.invitation_id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-brand-100 bg-white p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {category?.title ?? invitation.category ?? "Move"} — {invitation.collection_area || "?"} →{" "}
                    {invitation.delivery_area || "?"}
                  </p>
                  <p className="text-xs text-ink-700">
                    {new Date(invitation.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    STATUS_STYLES[invitation.status] ?? "bg-ink-50 text-ink-700"
                  }`}
                >
                  {invitation.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
