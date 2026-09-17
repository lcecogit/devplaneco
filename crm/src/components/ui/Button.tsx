import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/* One primary per view (DESIGN.md §5). Separation is a hairline first; the
   secondary variant carries no fill at all. */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-contrast hover:opacity-90 active:opacity-80",
  secondary:
    "bg-transparent text-ink-1 border border-hairline hover:bg-surface-sunken active:bg-surface-sunken",
  ghost: "bg-transparent text-ink-2 hover:bg-surface-sunken hover:text-ink-1",
  destructive: "bg-transparent text-status-critical border border-hairline hover:bg-surface-sunken",
};

const SIZES: Record<Size, string> = {
  // 44px and 36px: the first clears the touch-target floor, the second is for
  // dense staff toolbars where a pointer is a given.
  md: "h-11 px-5 text-body",
  sm: "h-9 px-4 text-body-dense",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium",
        "transition-colors duration-instant ease-standard",
        "disabled:cursor-not-allowed disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});
