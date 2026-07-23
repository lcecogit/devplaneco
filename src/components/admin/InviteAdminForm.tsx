"use client";

import { useState, type FormEvent } from "react";
import { FormField } from "@/components/ui/FormField";

export function InviteAdminForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSent(false);
    setSubmitting(true);

    const response = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }

    setSent(true);
    setEmail("");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField
        label="Email address"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {error && (
        <p role="alert" className="text-sm font-medium text-coral-600">
          {error}
        </p>
      )}
      {sent && (
        <p role="status" className="text-sm font-medium text-mint-600">
          Invite sent.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-800 disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Send invite"}
      </button>
    </form>
  );
}
