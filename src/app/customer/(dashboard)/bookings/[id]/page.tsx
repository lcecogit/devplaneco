import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";
import { CancelBookingButton } from "@/components/customer/bookings/CancelBookingButton";
import { RatingForm } from "@/components/customer/bookings/RatingForm";
import { InterestedPartners } from "@/components/customer/bookings/InterestedPartners";
import {
  CLAIM_DEDUCTIBLE_GBP,
  STANDARD_COVER_MOVE_CAP_GBP,
  STANDARD_COVER_PER_BOX_GBP,
  STANDARD_COVER_PER_ITEM_GBP,
} from "@/lib/constants/liability-cover";

export const metadata: Metadata = { title: "Booking Details" };

const MATCHING_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  listed: "Awaiting match",
  matched: "Matched",
  cancelled: "Cancelled",
};

const JOB_STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  en_route_to_collection: "En route to collection",
  arrived_at_collection: "Arrived at collection",
  documentation_complete_collection: "Collection paperwork complete",
  collection_complete: "Collection complete",
  in_transit: "In transit",
  arrived_at_delivery: "Arrived at delivery",
  documentation_complete_delivery: "Delivery paperwork complete",
  delivery_complete: "Delivery complete",
};

function formatDateTime(value: string | null) {
  if (!value) return "TBC";
  return new Date(value).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CustomerBookingDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: booking } = await supabase
    .from("jobs")
    .select(
      "id, category, collection_address, collection_postcode, collection_window_start, collection_window_end, delivery_address, delivery_postcode, delivery_window_start, delivery_window_end, distance_miles, customer_price, matching_status, status, listed_at, allocation_method, cover_tier, extended_cover_declared_value"
    )
    .eq("id", params.id)
    .eq("customer_id", customer!.id)
    .maybeSingle();

  if (!booking) notFound();

  const category = SERVICE_CATEGORIES.find((s) => s.slug === booking.category);

  // Only meaningful once matched — job_assignments won't have a row before
  // that, and transport_partners has no read policy for this customer until
  // the match exists either (see migration 0020).
  const { data: assignment } =
    booking.matching_status === "matched"
      ? await supabase
          .from("job_assignments")
          .select("transport_partner_id")
          .eq("job_id", booking.id)
          .maybeSingle()
      : { data: null };

  const { data: assignedPartner } = assignment
    ? await supabase
        .from("transport_partners")
        .select("business_name")
        .eq("id", assignment.transport_partner_id)
        .maybeSingle()
    : { data: null };

  // ratings_select already lets a customer read their own ratings directly
  // — no RPC needed just to check "have I already reviewed this job."
  const { data: existingRating } = assignment
    ? await supabase.from("ratings").select("id").eq("job_id", booking.id).maybeSingle()
    : { data: null };

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink-900">
            {category?.title ?? "Move"}
          </h1>
          <p className="mt-1 text-sm text-ink-700">Booked {formatDateTime(booking.listed_at)}</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          {MATCHING_STATUS_LABELS[booking.matching_status] ?? booking.matching_status}
        </span>
      </div>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-700">Collection</dt>
            <dd className="font-semibold text-ink-900">
              {booking.collection_address ? `${booking.collection_address}, ` : ""}
              {booking.collection_postcode}
            </dd>
            <dd className="text-ink-700">{formatDateTime(booking.collection_window_start)}</dd>
          </div>
          <div>
            <dt className="text-ink-700">Delivery</dt>
            <dd className="font-semibold text-ink-900">
              {booking.delivery_address ? `${booking.delivery_address}, ` : ""}
              {booking.delivery_postcode}
            </dd>
            <dd className="text-ink-700">{formatDateTime(booking.delivery_window_start)}</dd>
          </div>
          {booking.distance_miles != null && (
            <div>
              <dt className="text-ink-700">Distance</dt>
              <dd className="font-semibold text-ink-900">{Number(booking.distance_miles).toFixed(1)} miles</dd>
            </div>
          )}
          {assignedPartner && (
            <div>
              <dt className="text-ink-700">Transport partner</dt>
              <dd className="font-semibold text-ink-900">{assignedPartner.business_name}</dd>
              <dd>
                <Link
                  href={`/customer/messages/${booking.id}`}
                  className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  Message {assignedPartner.business_name} →
                </Link>
              </dd>
            </div>
          )}
          {booking.customer_price != null && (
            <div>
              <dt className="text-ink-700">Estimated price</dt>
              <dd className="font-semibold text-ink-900">£{Number(booking.customer_price).toFixed(2)}</dd>
            </div>
          )}
          {booking.status && (
            <div>
              <dt className="text-ink-700">Job status</dt>
              <dd className="font-semibold text-ink-900">{JOB_STATUS_LABELS[booking.status]}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">Move protection</h2>
        <p className="mt-2 text-sm text-ink-700">
          Standard Cover is included on every move: up to £{STANDARD_COVER_PER_BOX_GBP} per box and
          £{STANDARD_COVER_PER_ITEM_GBP} per item, capped at £{STANDARD_COVER_MOVE_CAP_GBP} for the
          whole move. A £{CLAIM_DEDUCTIBLE_GBP} deductible applies per claim.
        </p>
        {booking.cover_tier === "extended_requested" && (
          <p className="mt-2 text-sm font-semibold text-brand-700">
            Extended Cover requested
            {booking.extended_cover_declared_value != null
              ? ` — £${Number(booking.extended_cover_declared_value).toLocaleString("en-GB")} declared value`
              : ""}
            . Our team will be in touch to confirm pricing.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">Cancellation</h2>
        {booking.matching_status === "listed" ? (
          <div className="mt-3">
            <CancelBookingButton jobId={booking.id} />
          </div>
        ) : booking.matching_status === "cancelled" ? (
          <p className="mt-2 text-sm text-ink-700">This booking has been cancelled.</p>
        ) : (
          <p className="mt-2 text-sm text-ink-700">
            This booking has already been matched with a transport partner, so it can no
            longer be cancelled here. Contact support if you need to make a change —
            cancelling after matching may involve a charge.
          </p>
        )}
      </div>

      {booking.matching_status === "listed" && booking.allocation_method === "express_interest" && (
        <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
          <h2 className="font-heading text-base font-bold text-ink-900">Choose your transport partner</h2>
          <p className="mt-1 text-sm text-ink-700">
            This is a multi-stop move, so partners put themselves forward instead of a first-come
            claim. Pick who you&apos;d like to go with.
          </p>
          <div className="mt-3">
            <InterestedPartners jobId={booking.id} />
          </div>
        </div>
      )}

      {/* Gated on 'matched' rather than a delivery-complete job status:
          nothing in this system currently progresses job status past
          'assigned' (no driver app records real progress), so gating on
          delivery completion would make this permanently unreachable.
          Revisit once real status progression exists. */}
      {booking.matching_status === "matched" && assignment && assignedPartner && (
        <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
          <h2 className="font-heading text-base font-bold text-ink-900">Rate your move</h2>
          <div className="mt-3">
            {existingRating ? (
              <p className="text-sm text-ink-700">You&apos;ve already reviewed this booking — thank you.</p>
            ) : (
              <RatingForm
                jobId={booking.id}
                customerId={customer!.id}
                transportPartnerId={assignment.transport_partner_id}
                partnerName={assignedPartner.business_name}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
