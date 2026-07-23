import type { ComponentType } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-brand-300 bg-white p-10 text-center">
      <Icon className="mx-auto h-8 w-8 text-brand-300" />
      <h2 className="mt-3 font-heading text-lg font-bold text-ink-900">{title}</h2>
      <p className="mt-1 text-sm text-ink-700">{description}</p>
    </div>
  );
}
