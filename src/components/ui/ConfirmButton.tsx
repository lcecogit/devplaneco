"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TRIGGER_STYLES = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  danger: "bg-coral-500 text-white hover:bg-coral-600",
  neutral: "border border-brand-300 text-brand-700 hover:bg-brand-50",
} as const;

const CONFIRM_STYLES = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  danger: "bg-coral-500 text-white hover:bg-coral-600",
  neutral: "bg-ink-900 text-white hover:bg-ink-800",
} as const;

export function ConfirmButton({
  label,
  confirmLabel,
  description,
  variant = "primary",
  reason = "none",
  reasonLabel = "Note",
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  description?: string;
  variant?: keyof typeof TRIGGER_STYLES;
  reason?: "none" | "optional" | "required";
  reasonLabel?: string;
  onConfirm: (reason: string) => Promise<{ error?: string } | void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setOpen(false);
    setReasonText("");
    setError(null);
  }

  async function confirm() {
    if (reason === "required" && !reasonText.trim()) {
      setError("This field is required.");
      return;
    }

    setError(null);
    setSubmitting(true);
    const result = await onConfirm(reasonText.trim());
    setSubmitting(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    setReasonText("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${TRIGGER_STYLES[variant]}`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4">
      {description && <p className="text-sm text-ink-700">{description}</p>}

      {reason !== "none" && (
        <div className="mt-3 flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-800">
            {reasonLabel}
            {reason === "optional" && (
              <span className="font-normal text-ink-700"> (optional)</span>
            )}
          </label>
          <textarea
            rows={3}
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-coral-600">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={submitting}
          className="rounded-full border border-brand-300 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-white disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={submitting}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${CONFIRM_STYLES[variant]}`}
        >
          {submitting ? "Saving…" : confirmLabel}
        </button>
      </div>
    </div>
  );
}
