import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";
import { MessageThread } from "@/components/messages/MessageThread";

export const metadata: Metadata = { title: "Conversation" };

export default async function CustomerMessageThreadPage({ params }: { params: { jobId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  // jobs_select scopes this to jobs owned by the calling customer. Messaging
  // only opens once a job is matched (see migration 0034), confirmed below
  // via the job_assignments row rather than trusting matching_status alone.
  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, category")
    .eq("id", params.jobId)
    .eq("customer_id", customer!.id)
    .maybeSingle();

  if (!job) notFound();

  const { data: assignment } = await supabase
    .from("job_assignments")
    .select("transport_partner_id")
    .eq("job_id", job.id)
    .maybeSingle();

  if (!assignment) notFound();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("business_name")
    .eq("id", assignment.transport_partner_id)
    .maybeSingle();

  const category = SERVICE_CATEGORIES.find((s) => s.slug === job.category);
  const partnerName = partner?.business_name ?? "your transport partner";

  return (
    <div className="max-w-2xl">
      <Link href="/customer/messages" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
        ← Back to Messages
      </Link>

      <h1 className="mt-3 font-heading text-2xl font-extrabold text-ink-900">
        {partnerName} · {category?.title ?? job.category ?? "Move"}
      </h1>

      <div className="mt-6">
        <MessageThread jobId={job.id} counterpartName={partnerName} />
      </div>
    </div>
  );
}
