import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth/AuthCard";
import { BusinessInfoForm } from "@/components/auth/BusinessInfoForm";
import { ClientRedirect } from "@/components/ClientRedirect";

export const metadata: Metadata = {
  title: "Tell us about your business",
};

// Step 2 of 3. Requires a session (from any auth method — this guard isn't
// email/password-specific) but not yet a completed partner profile, since
// that's exactly what this step creates.
export default async function PartnerSignupBusinessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ClientRedirect to="/partner/login" />;
  }

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (partner) {
    return <ClientRedirect to="/partner/dashboard" />;
  }

  return (
    <AuthCard title="Tell us about your business" subtitle="Step 2 of 3">
      <BusinessInfoForm userId={user.id} email={user.email ?? null} />
    </AuthCard>
  );
}
