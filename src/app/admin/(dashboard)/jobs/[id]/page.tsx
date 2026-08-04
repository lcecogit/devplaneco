import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";
import { AssignJobForm, type EligiblePartner } from "@/components/admin/jobs/AssignJobForm";

export const metadata: Metadata = { title: "Assign Job" };

function formatCurrency(amount: number | null) {
  return amount == null
    ? "—"
    : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

function formatDateTime(dateString: string | null) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminJobDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, title, category, matching_status, allocation_method, customer_price, payout_amount, collection_address, collection_postcode, collection_window_start, delivery_address, delivery_postcode, delivery_window_start, listed_at"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!job) notFound();

  const { data: assignment } = await supabase
    .from("job_assignments")
    .select("transport_partner_id, vehicle_id, assigned_at")
    .eq("job_id", job.id)
    .maybeSingle();

  const currentPartnerId = assignment?.transport_partner_id ?? null;
  const currentPartnerName = currentPartnerId
    ? (
        await supabase
          .from("transport_partners")
          .select("business_name")
          .eq("id", currentPartnerId)
          .maybeSingle()
      ).data?.business_name ?? "Unknown partner"
    : null;

  // Eligible partners: approved vehicle compatible with this job's
  // category. Deliberately not filtered by rating-gated access (migration
  // 0054) — an admin override is exactly the case that gate isn't meant
  // to block. Fetched separately and matched in JS, same convention as
  // everywhere else in this codebase.
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, transport_partner_id, registration_number, vehicle_type, make, model, can_transport_motorbikes")
    .eq("approval_status", "approved");

  const compatibleVehicles = (vehicles ?? []).filter(
    (v) => job.category !== "motorbike-transport" || v.can_transport_motorbikes
  );
  const partnerIds = Array.from(new Set(compatibleVehicles.map((v) => v.transport_partner_id)));
  const { data: partnerRows } = partnerIds.length
    ? await supabase.from("transport_partners").select("id, business_name").in("id", partnerIds)
    : { data: [] };

  const eligiblePartners: EligiblePartner[] = (partnerRows ?? [])
    .map((p) => ({
      id: p.id,
      businessName: p.business_name,
      vehicles: compatibleVehicles
        .filter((v) => v.transport_partner_id === p.id)
        .map((v) => ({
          id: v.id,
          label: [v.registration_number, [v.make, v.model].filter(Boolean).join(" ") || v.vehicle_type]
            .filter(Boolean)
            .join(" — "),
        })),
    }))
    .sort((a, b) => a.businessName.localeCompare(b.businessName));

  const category = SERVICE_CATEGORIES.find((s) => s.slug === job.category);

  return (
    <div className="max-w-2xl">
      <Link href="/admin/jobs" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
        ← Back to Jobs
      </Link>

      <h1 className="mt-3 font-heading text-2xl font-extrabold text-ink-900">
        {category?.title ?? job.category ?? job.title}
      </h1>
      <p className="mt-1 text-sm text-ink-700">
        {formatCurrency(job.customer_price)}
        {job.payout_amount != null ? ` · payout ${formatCurrency(job.payout_amount)}` : ""}
        {job.allocation_method ? ` · ${job.allocation_method.replace(/_/g, " ")}` : ""}
      </p>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">Route</h2>
        <dl className="mt-3 flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-700">Collection</dt>
            <dd className="text-ink-900">{job.collection_address || job.collection_postcode}</dd>
            <dd className="text-xs text-ink-700">{formatDateTime(job.collection_window_start)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-700">Delivery</dt>
            <dd className="text-ink-900">{job.delivery_address || job.delivery_postcode}</dd>
            <dd className="text-xs text-ink-700">{formatDateTime(job.delivery_window_start)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">
          {currentPartnerId ? "Reassign this job" : "Assign this job"}
        </h2>
        <p className="mt-1 text-sm text-ink-700">
          {currentPartnerId
            ? `Currently assigned to ${currentPartnerName}. Choosing a different partner below reassigns it and notifies both partners.`
            : "Bypasses Find Work, Bidding, Reservations, and Express Interest — the job goes straight to whichever partner you pick."}
        </p>
        <div className="mt-4">
          <AssignJobForm jobId={job.id} partners={eligiblePartners} currentPartnerId={currentPartnerId} />
        </div>
      </div>
    </div>
  );
}
