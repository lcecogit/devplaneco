import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { BellIcon } from "@/components/icons";
import { MarkNotificationsReadButton } from "@/components/partner/notifications/MarkNotificationsReadButton";

export const metadata: Metadata = { title: "Notifications" };

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PartnerNotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: notifications } = await supabase
    .from("partner_notifications")
    .select("id, title, body, read_at, created_at")
    .eq("transport_partner_id", partner!.id)
    .order("created_at", { ascending: false });

  const hasUnread = (notifications ?? []).some((n) => !n.read_at);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink-900">Notifications</h1>
          <p className="mt-1 text-sm text-ink-700">System notices — auction wins, approvals, and other updates.</p>
        </div>
        <MarkNotificationsReadButton disabled={!hasUnread} />
      </div>

      {!notifications?.length ? (
        <EmptyState
          icon={BellIcon}
          title="No notifications yet"
          description="System notices, like winning an auction, will show up here."
        />
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-2xl border p-5 ${
                notification.read_at ? "border-brand-100 bg-white" : "border-coral-200 bg-coral-50/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-heading text-sm font-bold text-ink-900">{notification.title}</p>
                <p className="shrink-0 text-xs text-ink-700">{formatTimestamp(notification.created_at)}</p>
              </div>
              <p className="mt-1 text-sm text-ink-700">{notification.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
