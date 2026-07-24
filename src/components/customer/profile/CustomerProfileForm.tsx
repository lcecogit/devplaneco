"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FormField } from "@/components/ui/FormField";

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

export function CustomerProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName || null, phone: phone || null })
      .eq("id", profile.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField
        label="Full name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
      <FormField label="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <FormField label="Email address" value={profile.email ?? ""} disabled hint="Contact support to change your email." />

      {error && (
        <p role="alert" className="text-sm font-medium text-coral-600">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="text-sm font-medium text-mint-600">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
