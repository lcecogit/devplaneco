import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { InviteAdminForm } from "@/components/admin/InviteAdminForm";

export const metadata: Metadata = { title: "Admin Settings" };

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: admins } = await supabase
    .from("profiles")
    .select("id, email, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

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

      <div className="mt-6 rounded-2xl border border-brand-100 bg-white p-6">
        <h2 className="font-heading text-base font-bold text-ink-900">Current admins</h2>
        <div className="mt-4 flex flex-col gap-3">
          {!admins?.length ? (
            <p className="text-sm text-ink-700">No admin accounts found.</p>
          ) : (
            admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-900">{admin.email}</span>
                <span className="text-xs text-ink-700">Since {formatDate(admin.created_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
