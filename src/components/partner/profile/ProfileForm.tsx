"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COMPANY_TYPES } from "@/lib/constants/partner";
import { SERVICE_CATEGORIES } from "@/components/home/ServicesGrid";
import { CloseIcon } from "@/components/icons";

type TransportPartner = {
  id: string;
  business_name: string;
  business_description: string | null;
  company_type: string | null;
  trade_associations: string[] | null;
  allow_bid_invitations: boolean;
  published: boolean;
  category_preferences: string[];
  notify_email: boolean;
  notify_sms: boolean;
};

export function ProfileForm({ partner }: { partner: TransportPartner }) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState(partner.business_name);
  const [businessDescription, setBusinessDescription] = useState(
    partner.business_description ?? ""
  );
  const [companyType, setCompanyType] = useState<string>(
    partner.company_type ?? COMPANY_TYPES[0].value
  );
  const [tradeAssociations, setTradeAssociations] = useState<string[]>(
    partner.trade_associations ?? []
  );
  const [newAssociation, setNewAssociation] = useState("");
  const [allowBidInvitations, setAllowBidInvitations] = useState(partner.allow_bid_invitations);
  const [categoryPreferences, setCategoryPreferences] = useState<string[]>(
    partner.category_preferences
  );
  const [notifyEmail, setNotifyEmail] = useState(partner.notify_email);
  const [notifySms, setNotifySms] = useState(partner.notify_sms);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function addAssociation() {
    const value = newAssociation.trim();
    if (!value || tradeAssociations.includes(value)) return;
    setTradeAssociations((prev) => [...prev, value]);
    setNewAssociation("");
  }

  function toggleCategory(slug: string) {
    setCategoryPreferences((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("transport_partners")
      .update({
        business_name: businessName,
        business_description: businessDescription || null,
        company_type: companyType,
        trade_associations: tradeAssociations,
        allow_bid_invitations: allowBidInvitations,
        category_preferences: categoryPreferences,
        notify_email: notifyEmail,
        notify_sms: notifySms,
      })
      .eq("id", partner.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="businessName" className="text-sm font-medium text-ink-800">
          Business name
        </label>
        <input
          id="businessName"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
          className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="companyType" className="text-sm font-medium text-ink-800">
          Company type
        </label>
        <select
          id="companyType"
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
          rows={3}
          value={businessDescription}
          onChange={(e) => setBusinessDescription(e.target.value)}
          className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-800">Trade associations</span>
        <div className="flex flex-wrap gap-2">
          {tradeAssociations.map((association) => (
            <span
              key={association}
              className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm text-brand-700"
            >
              {association}
              <button
                type="button"
                onClick={() =>
                  setTradeAssociations((prev) => prev.filter((a) => a !== association))
                }
                aria-label={`Remove ${association}`}
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newAssociation}
            onChange={(e) => setNewAssociation(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAssociation();
              }
            }}
            placeholder="e.g. BAR, RHA"
            className="flex-1 rounded-lg border border-brand-100 px-3.5 py-2 text-sm text-ink-900 outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={addAssociation}
            className="rounded-full border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            Add
          </button>
        </div>
      </div>

      <label className="flex items-center justify-between rounded-lg border border-brand-100 px-4 py-3">
        <span className="text-sm font-medium text-ink-800">
          Allow other partners to invite me to bid on jobs
        </span>
        <input
          type="checkbox"
          checked={allowBidInvitations}
          onChange={(e) => setAllowBidInvitations(e.target.checked)}
          className="h-5 w-5 accent-brand-600"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-800">Job categories</span>
        <p className="text-xs text-ink-700">
          Choose which types of work to see in Find Work, Bidding, and Express Interest.
          Leave everything unchecked to see every category.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SERVICE_CATEGORIES.map((category) => (
            <label
              key={category.slug}
              className="flex items-center gap-2.5 rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-800"
            >
              <input
                type="checkbox"
                checked={categoryPreferences.includes(category.slug)}
                onChange={() => toggleCategory(category.slug)}
                className="h-4 w-4 accent-brand-600"
              />
              {category.title}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-800">Notifications</span>
        <label className="flex items-center justify-between rounded-lg border border-brand-100 px-4 py-3">
          <span className="text-sm text-ink-800">Email notifications</span>
          <input
            type="checkbox"
            checked={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.checked)}
            className="h-5 w-5 accent-brand-600"
          />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-brand-100 px-4 py-3">
          <span className="text-sm text-ink-800">SMS notifications</span>
          <input
            type="checkbox"
            checked={notifySms}
            onChange={(e) => setNotifySms(e.target.checked)}
            className="h-5 w-5 accent-brand-600"
          />
        </label>
        <p className="text-xs text-ink-700">
          Controls which channels we&apos;ll use once email and SMS delivery are switched on
          for the platform — in-app notifications work today regardless of this setting.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-brand-50/60 px-4 py-3 text-sm text-ink-800">
        <span>Profile status</span>
        <span className={partner.published ? "font-semibold text-mint-600" : "font-semibold text-coral-600"}>
          {partner.published ? "Published" : "Not published yet"}
        </span>
      </div>

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
