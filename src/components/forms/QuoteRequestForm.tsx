"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormField } from "@/components/ui/FormField";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";

// Public submission — no login required. RLS on quote_requests allows
// anonymous INSERT only; nothing here can read, edit, or delete requests.
export function QuoteRequestForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [collectionPostcode, setCollectionPostcode] = useState("");
  const [deliveryPostcode, setDeliveryPostcode] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("quote_requests").insert({
      full_name: fullName,
      email,
      phone: phone || null,
      service_category: serviceCategory || null,
      collection_postcode: collectionPostcode,
      delivery_postcode: deliveryPostcode,
      preferred_date: preferredDate || null,
      details: details || null,
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
        Thanks — we&apos;ve got your details. A member of the team will be in touch
        with your quote shortly.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Full name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <FormField
          label="Email address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Phone number"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="serviceCategory" className="text-sm font-medium text-ink-800">
            What are you moving?
          </label>
          <select
            id="serviceCategory"
            value={serviceCategory}
            onChange={(e) => setServiceCategory(e.target.value)}
            className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
          >
            <option value="">Select…</option>
            {SERVICE_CATEGORIES.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.title}
              </option>
            ))}
            <option value="other">Something else</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Collection postcode"
          required
          value={collectionPostcode}
          onChange={(e) => setCollectionPostcode(e.target.value)}
        />
        <FormField
          label="Delivery postcode"
          required
          value={deliveryPostcode}
          onChange={(e) => setDeliveryPostcode(e.target.value)}
        />
      </div>

      <FormField
        label="Preferred moving date"
        type="date"
        value={preferredDate}
        onChange={(e) => setPreferredDate(e.target.value)}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="details" className="text-sm font-medium text-ink-800">
          Anything else we should know?
        </label>
        <textarea
          id="details"
          rows={3}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="e.g. items, access restrictions, number of rooms"
          className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-coral-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-full bg-coral-500 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-coral-600 disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Get my free quote"}
      </button>
    </form>
  );
}
