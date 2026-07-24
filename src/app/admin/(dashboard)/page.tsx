import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CarIcon, ScaleIcon, TrendingUpIcon, RouteIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHomePage() {
  const supabase = await createClient();

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ count: pendingVehicleCount }, { count: openDisputeCount }, { data: activePlans }, { count: recentJobCount }] =
    await Promise.all([
      supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .in("approval_status", ["submitted", "under_review"]),
      supabase
        .from("deallocation_charges")
        .select("*", { count: "exact", head: true })
        .eq("dispute_status", "submitted"),
      supabase
        .from("performance_management_plans")
        .select("transport_partner_id")
        .eq("status", "active"),
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .gte("listed_at", last24h),
    ]);

  const partnersUnderPmp = new Set((activePlans ?? []).map((p) => p.transport_partner_id)).size;

  const cards = [
    {
      href: "/admin/vehicles",
      icon: CarIcon,
      value: pendingVehicleCount ?? 0,
      label: "Vehicles awaiting review",
    },
    {
      href: "/admin/disputes",
      icon: ScaleIcon,
      value: openDisputeCount ?? 0,
      label: "Open disputes",
    },
    {
      href: "/admin/performance",
      icon: TrendingUpIcon,
      value: partnersUnderPmp,
      label: "Partners under a performance plan",
    },
    {
      href: "#",
      icon: RouteIcon,
      value: recentJobCount ?? 0,
      label: "Jobs listed in the last 24h",
    },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Overview</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const content = (
            <>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-ink-900">{card.value}</p>
                <p className="mt-1 text-sm text-ink-700">{card.label}</p>
              </div>
            </>
          );

          return card.href === "#" ? (
            <div key={card.label} className="rounded-2xl border border-brand-100 bg-white p-5">
              {content}
            </div>
          ) : (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-2xl border border-brand-100 bg-white p-5 hover:border-brand-300"
            >
              {content}
            </Link>
          );
        })}
      </div>

      {(recentJobCount ?? 0) === 0 && (
        <p className="mt-6 text-sm text-ink-700">
          No jobs have been listed yet — that&apos;s expected until job flow goes
          live in a later phase.
        </p>
      )}
    </div>
  );
}
