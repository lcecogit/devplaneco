import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth/AuthCard";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";

export const metadata: Metadata = {
  title: "Set a New Password",
};

// Only reachable with a recovery session established by /auth/callback after
// the user clicks the link from resetPasswordForEmail.
export default async function PartnerResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/partner/forgot-password");
  }

  return (
    <AuthCard title="Set a new password">
      <UpdatePasswordForm />
    </AuthCard>
  );
}
