import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MessageTemplateManager } from "@/components/messages/MessageTemplateManager";

export const metadata: Metadata = { title: "Message Templates" };

export default async function MessageTemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: templates } = await supabase
    .from("message_templates")
    .select("id, name, body")
    .eq("transport_partner_id", partner!.id)
    .order("name", { ascending: true });

  return (
    <div className="max-w-2xl">
      <Link href="/partner/messages" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
        ← Back to Messages
      </Link>

      <h1 className="mt-3 font-heading text-2xl font-extrabold text-ink-900">Message Templates</h1>
      <p className="mt-1 text-sm text-ink-700">
        Save canned replies to insert into a conversation instead of typing them out each time.
      </p>

      <div className="mt-6">
        <MessageTemplateManager transportPartnerId={partner!.id} templates={templates ?? []} />
      </div>
    </div>
  );
}
