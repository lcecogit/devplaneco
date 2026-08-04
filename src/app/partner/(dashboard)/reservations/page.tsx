import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlusIcon, CalendarIcon } from "@/components/icons";
import { CancelReservationButton } from "@/components/partner/reservations/CancelReservationButton";

export const metadata: Metadata = { title: "Reservations" };

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function PartnerReservationsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = searchParams.tab === "historic" ? "historic" : "current";
  const today = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  let query = supabase
    .from("reservations")
    .select(
      "id, date, start_time, end_time, type, start_postcode, end_postcode, status, min_price, max_price, team_size, van_space_m3"
    )
    .eq("transport_partner_id", partner!.id)
    .order("date", { ascending: tab === "current" });

  query = tab === "current" ? query.gte("date", today) : query.lt("date", today);

  const { data: reservations } = await query;

  // reservation_compensations is only ever written by expire_unfilled_
  // reservations() (migration 0053) — the fee owed when a reservation's
  // date passed without ever becoming fully_booked. Only historic
  // reservations can have one, but fetching unconditionally is simpler
  // than branching the query, and empty on the current tab either way.
  const expiredIds = (reservations ?? [])
    .filter((r) => r.status === "expired")
    .map((r) => r.id);
  const { data: compensations } = expiredIds.length
    ? await supabase
        .from("reservation_compensations")
        .select("reservation_id, amount")
        .in("reservation_id", expiredIds)
    : { data: [] };
  const compensationByReservationId = new Map(
    (compensations ?? []).map((c) => [c.reservation_id, c.amount])
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-ink-900">Reservations</h1>
        <Link
          href="/partner/reservations/new"
          className="flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral-600"
        >
          <PlusIcon className="h-4 w-4" />
          New reservation
        </Link>
      </div>

      <div className="mt-6 flex gap-2 border-b border-brand-100">
        <Link
          href="/partner/reservations?tab=current"
          className={`border-b-2 px-4 py-2 text-sm font-semibold ${
            tab === "current" ? "border-brand-600 text-brand-700" : "border-transparent text-ink-700"
          }`}
        >
          Current
        </Link>
        <Link
          href="/partner/reservations?tab=historic"
          className={`border-b-2 px-4 py-2 text-sm font-semibold ${
            tab === "historic" ? "border-brand-600 text-brand-700" : "border-transparent text-ink-700"
          }`}
        >
          Historic
        </Link>
      </div>

      {!reservations?.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-brand-300 bg-white p-10 text-center">
          <CalendarIcon className="mx-auto h-8 w-8 text-brand-300" />
          <h2 className="mt-3 font-heading text-lg font-bold text-ink-900">
            No {tab} reservations
          </h2>
          <p className="mt-1 text-sm text-ink-700">
            {tab === "current"
              ? "Block out availability so customers can book you directly."
              : "Past reservations will show up here."}
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {reservations.map((reservation) => (
            <div
              key={reservation.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-5"
            >
              <div>
                <p className="font-heading text-sm font-bold text-ink-900">
                  {formatDate(reservation.date)}
                  {reservation.type === "custom" && reservation.start_time
                    ? ` · ${reservation.start_time}–${reservation.end_time ?? ""}`
                    : " · Full day"}
                </p>
                <p className="text-sm text-ink-700">
                  {[reservation.start_postcode, reservation.end_postcode].filter(Boolean).join(" → ") ||
                    "No route set"}
                </p>
                <p className="text-xs text-ink-700">
                  {reservation.team_size ? `${reservation.team_size} person` : "Flexible crew"}
                  {reservation.van_space_m3 != null ? ` · ${reservation.van_space_m3}m³ free` : ""}
                  {reservation.min_price != null || reservation.max_price != null
                    ? ` · £${reservation.min_price ?? "0"}–£${reservation.max_price ?? "any"}`
                    : ""}
                </p>
                {compensationByReservationId.has(reservation.id) && (
                  <p className="mt-1 text-sm font-bold text-mint-600">
                    £{Number(compensationByReservationId.get(reservation.id)).toFixed(2)} owed to you —
                    went unfilled
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold capitalize text-brand-700">
                  {reservation.status.replace(/_/g, " ")}
                </span>
                {tab === "current" && reservation.status === "pending" && (
                  <CancelReservationButton reservationId={reservation.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
