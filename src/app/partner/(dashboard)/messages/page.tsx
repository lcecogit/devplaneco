import type { Metadata } from "next";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { MessageIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Messages" };

// No messaging table/system yet — structural shell only, per this phase's scope.
export default function MessagesPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Messages</h1>
      <p className="mt-1 text-sm text-ink-700">
        Message customers and drivers about active jobs.
      </p>

      <EmptyState
        icon={MessageIcon}
        title="No messages yet"
        description="Messaging will be available once you have active jobs to communicate about."
      />
    </div>
  );
}
