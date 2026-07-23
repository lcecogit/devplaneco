import type { Metadata } from "next";
import { InviteAdminForm } from "@/components/admin/InviteAdminForm";

export const metadata: Metadata = { title: "Admin Settings" };

export default function AdminSettingsPage() {
  return (
    <div className="max-w-lg">
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Settings</h1>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">Invite an admin</h2>
        <p className="mt-1 text-sm text-ink-700">
          They&apos;ll get an email to set their own password and sign in with
          admin access already assigned.
        </p>
        <div className="mt-4">
          <InviteAdminForm />
        </div>
      </div>
    </div>
  );
}
