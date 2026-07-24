import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BoxIcon, PlusIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Dashboard" };

export default async function CustomerHomePage({
  searchParams,
}: {
  searchParams: { justBooked?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { count: activeBookings } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customer!.id)
    .in("matching_status", ["listed", "matched"]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">
        Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
      </h1>

      {searchParams.justBooked && (
        <p className="mt-3 rounded-lg bg-mint-50 px-4 py-3 text-sm text-mint-600">
          Booking received — we&apos;ll match you with a transport partner soon.
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/customer/bookings"
          className="flex items-center gap-4 rounded-2xl border border-brand-100 bg-white p-5 hover:border-brand-300"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <BoxIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-ink-900">{activeBookings ?? 0}</p>
            <p className="text-sm text-ink-700">Active bookings</p>
          </div>
        </Link>

        <Link
          href="/quote"
          className="flex items-center gap-4 rounded-2xl border border-dashed border-brand-300 bg-white p-5 hover:border-brand-500"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-coral-50 text-coral-500">
            <PlusIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-heading text-sm font-bold text-ink-900">Book a new move</p>
            <p className="text-sm text-ink-700">Get an instant estimate</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
