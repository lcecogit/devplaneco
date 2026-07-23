import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth/AuthCard";

export const metadata: Metadata = {
  title: "You're in",
};

export default async function PartnerSignupCompletePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/partner/login");
  }

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id, published")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!partner) {
    redirect("/partner/signup/business");
  }

  return (
    <AuthCard title="You're in" subtitle="Step 3 of 3">
      <div className="flex flex-col gap-4 text-sm text-ink-700">
        <p>
          Your Movers Now partner account is set up. Next, add your first vehicle so
          we know what you can carry.
        </p>
        <p className="rounded-lg bg-brand-50 px-4 py-3 text-ink-800">
          Your profile isn&apos;t visible to customers yet — that happens once your
          first vehicle is approved by our team. You can carry on setting up your
          account in the meantime.
        </p>
        <Link
          href="/partner/vehicles/new"
          className="mt-2 inline-flex items-center justify-center rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600"
        >
          Add your first vehicle
        </Link>
        <Link
          href="/partner/dashboard"
          className="text-center text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Skip for now — go to dashboard
        </Link>
      </div>
    </AuthCard>
  );
}
