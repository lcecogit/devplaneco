import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminChrome } from "@/components/admin/AdminChrome";

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
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect("/admin/login");
  }

  return <AdminChrome>{children}</AdminChrome>;
}
