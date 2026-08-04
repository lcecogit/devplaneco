"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function MarkNotificationsReadButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function markRead() {
    setPending(true);
    const supabase = createClient();
    await supabase.rpc("mark_notifications_read");
    setPending(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={markRead}
      disabled={disabled || pending}
      className="rounded-full border border-brand-300 px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Marking…" : "Mark all read"}
    </button>
  );
}
