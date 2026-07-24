import { createClient } from "@/lib/supabase/server";
import { DashboardChrome } from "@/components/customer/DashboardChrome";
import { ClientRedirect } from "@/components/ClientRedirect";

// Role gate for everything under /customer/(dashboard)/* — middleware
// already guarantees a session exists for these paths; this checks the
// specific role and the customers row, same pattern as the partner
// dashboard layout.
export default async function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ClientRedirect to="/customer/login" />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "customer") {
    return <ClientRedirect to="/customer/login" />;
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!customer) {
    return <ClientRedirect to="/customer/post-auth" />;
  }

  return (
    <DashboardChrome displayName={profile.full_name || profile.email || "Your account"}>
      {children}
    </DashboardChrome>
  );
}
