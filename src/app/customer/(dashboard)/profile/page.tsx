import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CustomerProfileForm } from "@/components/customer/profile/CustomerProfileForm";

export const metadata: Metadata = { title: "Profile" };

export default async function CustomerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email")
    .eq("id", user!.id)
    .single();

  return (
    <div className="max-w-lg">
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Profile</h1>
      <p className="mt-1 text-sm text-ink-700">Your contact details.</p>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <CustomerProfileForm profile={profile!} />
      </div>
    </div>
  );
}
