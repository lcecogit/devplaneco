"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FormField } from "@/components/ui/FormField";
import { COMPANY_TYPES } from "@/lib/constants/partner";

export function BusinessInfoForm({ userId, email }: { userId: string; email: string | null }) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [companyType, setCompanyType] = useState<string>(COMPANY_TYPES[0].value);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();

    // Both steps are idempotent (upsert on the natural unique key) so a
    // retry after a partial failure — e.g. profiles succeeds, the network
    // drops before transport_partners — doesn't error on the next attempt.
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: userId, role: "partner", email, phone }, { onConflict: "id" });

    if (profileError) {
      setSubmitting(false);
      setError(profileError.message);
      return;
    }

    const { error: partnerError } = await supabase.from("transport_partners").upsert(
      {
        profile_id: userId,
        business_name: businessName,
        business_description: businessDescription || null,
        company_type: companyType,
      },
      { onConflict: "profile_id" }
    );
    setSubmitting(false);

    if (partnerError) {
      setError(partnerError.message);
      return;
    }

    router.push("/partner/signup/complete");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField
        label="Business name"
        type="text"
        name="businessName"
        required
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="companyType" className="text-sm font-medium text-ink-800">
          Company type
        </label>
        <select
          id="companyType"
          name="companyType"
          value={companyType}
          onChange={(e) => setCompanyType(e.target.value)}
          className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
        >
          {COMPANY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="businessDescription" className="text-sm font-medium text-ink-800">
          Business description
        </label>
        <textarea
          id="businessDescription"
          name="businessDescription"
          rows={3}
          value={businessDescription}
          onChange={(e) => setBusinessDescription(e.target.value)}
          className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
          placeholder="What kind of jobs do you specialise in?"
        />
      </div>

      <FormField
        label="Contact phone number"
        type="tel"
        name="phone"
        autoComplete="tel"
        required
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      {error && (
        <p role="alert" className="text-sm font-medium text-coral-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-full bg-coral-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
