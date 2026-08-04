import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { MessageIcon } from "@/components/icons";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";

export const metadata: Metadata = { title: "Messages" };

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CustomerMessagesPage() {
  const supabase = await createClient();

  // my_message_threads() resolves to the caller's own threads — customer
  // side here, since it branches on current_customer_id() vs
  // current_partner_id() server-side. See migration 0034.
  const { data: threads, error } = await supabase.rpc("my_message_threads");

  if (error) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Messages</h1>
        <p className="mt-4 text-sm font-medium text-coral-600">
          Couldn&apos;t load messages right now: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Messages</h1>
      <p className="mt-1 text-sm text-ink-700">
        Message the transport partner handling your booking once you&apos;ve been matched.
      </p>

      {!threads?.length ? (
        <EmptyState
          icon={MessageIcon}
          title="No conversations yet"
          description="Once a booking is matched with a transport partner, you can message them about it here."
        />
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {threads.map((thread) => {
            const category = SERVICE_CATEGORIES.find((s) => s.slug === thread.category);
            return (
              <Link
                key={thread.job_id}
                href={`/customer/messages/${thread.job_id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-brand-100 bg-white p-5 hover:border-brand-300"
              >
                <div className="min-w-0">
                  <p className="font-heading text-sm font-bold text-ink-900">
                    {thread.counterpart_name} · {category?.title ?? thread.category ?? "Move"}
                  </p>
                  <p className="mt-1 truncate text-sm text-ink-700">
                    {thread.last_message_body ?? "No messages yet — say hello."}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {thread.last_message_at && (
                    <p className="text-xs text-ink-700">{formatTimestamp(thread.last_message_at)}</p>
                  )}
                  {thread.unread_count > 0 && (
                    <span className="rounded-full bg-coral-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {thread.unread_count}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
