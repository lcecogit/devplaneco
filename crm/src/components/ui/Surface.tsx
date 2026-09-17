import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** A panel. Separation is a hairline; the shadow is reserved for things that
 *  genuinely float (DESIGN.md §3), so a resting card gets neither. */
export function Panel({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-hairline bg-surface-raised",
        padded && "p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-title-3 text-ink-1">{title}</h2>
        {description ? <p className="mt-1 text-body-dense text-ink-2">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}
