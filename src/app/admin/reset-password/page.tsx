import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth/AuthCard";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";

export const metadata: Metadata = { title: "Set Your Password" };

// Reached after clicking an admin invite email link (via /auth/callback,
// which establishes the session before redirecting here).
export default async function AdminResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <AuthCard title="Set your password" subtitle="You've been invited as a Movers Now admin.">
      <UpdatePasswordForm redirectTo="/admin" />
    </AuthCard>
  );
}
