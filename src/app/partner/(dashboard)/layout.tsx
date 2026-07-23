import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardChrome } from "@/components/partner/DashboardChrome";

// Role gate for everything under /partner/(dashboard)/* — middleware already
// guarantees a session exists for these paths; this checks the specific
// role, which needs a DB read best done once per navigation here.
export default async function PartnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/partner/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "partner") {
    redirect("/partner/login");
  }

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("business_name")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!partner) {
    redirect("/partner/signup/business");
  }

  return <DashboardChrome businessName={partner.business_name}>{children}</DashboardChrome>;
}
