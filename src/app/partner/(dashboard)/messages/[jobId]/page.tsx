import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";
import { MessageThread } from "@/components/messages/MessageThread";

export const metadata: Metadata = { title: "Conversation" };

export default async function PartnerMessageThreadPage({ params }: { params: { jobId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  // job_assignments_select scopes this to jobs actually assigned to the
  // calling partner — messaging only opens once a job is matched (see
  // migration 0034), so an assignment row is the access check. No join
  // syntax, matching the rest of this codebase's convention (see My Work's
  // comment) — fetched separately and matched up here instead.
  const { data: assignment } = await supabase
    .from("job_assignments")
    .select("job_id")
    .eq("job_id", params.jobId)
    .eq("transport_partner_id", partner!.id)
    .maybeSingle();

  if (!assignment) notFound();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, category")
    .eq("id", params.jobId)
    .single();

  if (!job) notFound();

  const category = SERVICE_CATEGORIES.find((s) => s.slug === job.category);

  // profiles_select is self-only (id = auth.uid()) — a partner has no RLS
  // path to read a customer's profiles row directly, so the display name
  // comes from my_message_threads() (SECURITY DEFINER, see migration 0034)
  // instead of a raw query here.
  const { data: threads } = await supabase.rpc("my_message_threads");
  const customerName = threads?.find((t) => t.job_id === job.id)?.counterpart_name ?? "the customer";

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

      <h1 className="mt-3 font-heading text-2xl font-extrabold text-ink-900">
        {customerName} · {category?.title ?? job.category ?? "Move"}
      </h1>

      <div className="mt-6">
        <MessageThread jobId={job.id} counterpartName={customerName} templates={templates ?? []} />
      </div>
    </div>
  );
}
