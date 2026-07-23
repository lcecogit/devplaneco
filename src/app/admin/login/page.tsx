import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { AdminSignInForm } from "@/components/auth/AdminSignInForm";

export const metadata: Metadata = { title: "Admin Sign In" };

// No "sign up" link anywhere on this page, deliberately — admins are never
// self-registered. See scripts/create-first-admin.ts and the in-app invite
// flow under /admin/settings.
export default function AdminLoginPage() {
  return (
    <AuthCard title="Admin sign in">
      <AdminSignInForm />
    </AuthCard>
  );
}
