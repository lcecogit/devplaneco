import { createClient } from "@/lib/supabase/server";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { ClientRedirect } from "@/components/ClientRedirect";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ClientRedirect to="/admin/login" />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return <ClientRedirect to="/admin/login" />;
  }

  return <AdminChrome>{children}</AdminChrome>;
}
