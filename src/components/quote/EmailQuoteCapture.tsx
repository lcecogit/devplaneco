"use client";

import { useState } from "react";

// Optional "email me this quote" — a convenience, never a gate. Prices are
// already on screen by the time this is visible.
//
// The marketing checkbox is separate, specific about what it signs the
// visitor up for, and unticked by default. A pre-ticked box is not valid
// consent under UK GDPR/PECR, and bundling marketing into a transactional
// send is exactly the pattern the ICO calls out.

export function EmailQuoteCapture({
  savedEmail,
  savedOptIn,
  onSave,
}: {
  savedEmail: string | null;
  savedOptIn: boolean;
  onSave: (email: string, marketingOptIn: boolean) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(savedEmail ?? "");
  const [optIn, setOptIn] = useState(savedOptIn);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (savedEmail && !open) {
    return (
      <div className="text-xs text-ink-700">
        Quote saved to <span className="font-semibold text-ink-900">{savedEmail}</span>.{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-semibold text-brand-600 underline underline-offset-2"
        >
          Change
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700"
      >
        Email me this quote
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setSaving(true);
        try {
          await onSave(email.trim(), optIn);
          setSaved(true);
          setOpen(false);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Couldn't save that.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <label htmlFor="quote-email" className="text-xs font-semibold text-ink-900">
        Email me this quote
      </label>
      <input
        id="quote-email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="rounded-lg border border-brand-200 px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
      />

      <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-snug text-ink-700">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(event) => setOptIn(event.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 rounded border-brand-300 text-brand-600 focus:ring-brand-400"
        />
        <span>
          Also email me moving tips and occasional offers. This is separate from your
          quote — you&apos;ll get that either way, and you can unsubscribe at any time.
        </span>
      </label>

      {error && (
        <p role="alert" className="text-xs font-medium text-coral-600">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Send it"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-brand-200 px-4 py-1.5 text-xs font-semibold text-ink-700 hover:bg-brand-50"
        >
          Cancel
        </button>
      </div>

      {saved && <p className="text-xs text-mint-600">Saved.</p>}
    </form>
  );
}
