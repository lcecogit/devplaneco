import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface OutboxRow {
  id: string;
  channel: "email" | "sms" | "whatsapp" | "task";
  to: string;
  template: string;
  customer: string;
  reference: string;
  queuedAt: string;
  body: string;
}

/** The manual-send queue: the messages a person has to send by hand because no
 *  provider key is configured for that channel. RLS limits it to brands the
 *  viewer has sales access to. */
export async function getOutbox(): Promise<OutboxRow[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("outbox")
    .select(
      `id, channel, to_address, template_key, status, created_at, payload,
       customers ( first_name, last_name )`,
    )
    .eq("status", "needs_manual_send")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(`Could not load the send queue: ${error.message}`);

  return (data ?? []).map((row: any): OutboxRow => ({
    id: row.id,
    channel: row.channel,
    to: row.to_address ?? "—",
    template: row.template_key,
    customer:
      [row.customers?.first_name, row.customers?.last_name].filter(Boolean).join(" ") ||
      "Unknown customer",
    reference: row.payload?.reference ?? "—",
    queuedAt: row.created_at,
    body: row.payload?.body ?? "",
  }));
}
