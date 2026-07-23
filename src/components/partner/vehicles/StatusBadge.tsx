const STATUS_STYLES: Record<string, string> = {
  draft: "bg-ink-700/10 text-ink-700",
  submitted: "bg-brand-100 text-brand-700",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-mint-100 text-mint-600",
  rejected: "bg-coral-100 text-coral-600",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        STATUS_STYLES[status] ?? "bg-ink-700/10 text-ink-700"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
