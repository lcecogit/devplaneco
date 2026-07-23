"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormField } from "@/components/ui/FormField";
import { COMPANY_TYPES } from "@/lib/constants/partner";

// Public submission — no login required. RLS on partner_leads allows
// anonymous INSERT only; this is a lightweight interest form, separate
// from the full partner signup/dashboard account flow at /partner/signup.
export function PartnerLeadForm() {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [coverageArea, setCoverageArea] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("partner_leads").insert({
      business_name: businessName,
      contact_name: contactName,
      email,
      phone: phone || null,
      coverage_area: coverageArea || null,
      company_type: companyType || null,
      message: message || null,
    });
    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p role="status" className="rounded-lg bg-mint-50 px-4 py-4 text-sm text-mint-600">
        Thanks for your interest — we&apos;ve received your details. Our partner
        team will be in touch to get you set up.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Business name"
          required
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />
        <FormField
          label="Contact name"
          required
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Email address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormField
          label="Phone number"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Coverage area"
          placeholder="e.g. Greater Manchester"
          value={coverageArea}
          onChange={(e) => setCoverageArea(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="companyType" className="text-sm font-medium text-white">
            Company type
          </label>
          <select
            id="companyType"
            value={companyType}
            onChange={(e) => setCompanyType(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/40"
          >
            <option value="" className="text-ink-900">
              Select…
            </option>
            {COMPANY_TYPES.map((type) => (
              <option key={type.value} value={type.value} className="text-ink-900">
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-medium text-white">
          Tell us about your fleet
        </label>
        <textarea
          id="message"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. number of vehicles, vehicle types, availability"
          className="rounded-lg border border-white/20 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-brand-100/60 focus:border-white/40"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-coral-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-full bg-coral-500 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Apply to become a partner"}
      </button>
    </form>
  );
}
