import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CarIcon, CalendarIcon, BanknoteIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Dashboard" };

export default async function PartnerHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("business_name, published")
    .eq("profile_id", user!.id)
    .maybeSingle();

  const { count: vehicleCount } = await supabase
    .from("vehicles")
    .select("*", { count: "exact", head: true });

  const { count: pendingReservations } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">
        Welcome back{partner?.business_name ? `, ${partner.business_name}` : ""}
      </h1>

      {!partner?.published && (
        <p className="mt-3 rounded-lg bg-brand-50 px-4 py-3 text-sm text-ink-800">
          Your profile isn&apos;t visible to customers yet — that happens once your
          first vehicle is approved by our team.
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/partner/vehicles"
          className="flex items-center gap-4 rounded-2xl border border-brand-100 bg-white p-5 hover:border-brand-300"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <CarIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-ink-900">{vehicleCount ?? 0}</p>
            <p className="text-sm text-ink-700">Vehicles</p>
          </div>
        </Link>

        <Link
          href="/partner/reservations"
          className="flex items-center gap-4 rounded-2xl border border-brand-100 bg-white p-5 hover:border-brand-300"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-ink-900">{pendingReservations ?? 0}</p>
            <p className="text-sm text-ink-700">Pending reservations</p>
          </div>
        </Link>

        <Link
          href="/partner/payments"
          className="flex items-center gap-4 rounded-2xl border border-brand-100 bg-white p-5 hover:border-brand-300"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <BanknoteIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-ink-900">£0.00</p>
            <p className="text-sm text-ink-700">Scheduled payments</p>
          </div>
        </Link>
      </div>

      {vehicleCount === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-brand-300 bg-white p-8 text-center">
          <h2 className="font-heading text-lg font-bold text-ink-900">
            Add your first vehicle
          </h2>
          <p className="mt-2 text-sm text-ink-700">
            Once you add a vehicle and it&apos;s approved, you can start receiving jobs.
          </p>
          <Link
            href="/partner/vehicles/new"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white hover:bg-coral-600"
          >
            Add a vehicle
          </Link>
        </div>
      )}
    </div>
  );
}
