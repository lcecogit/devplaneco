import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-brand-50/40 px-4 py-16"
    >
      <div className="w-full max-w-md rounded-2xl border border-brand-100 bg-white p-8 shadow-sm">
        <Link href="/" className="font-heading text-lg font-extrabold text-ink-900">
          Movers<span className="text-coral-500">Now</span>
        </Link>

        <h1 className="mt-6 font-heading text-2xl font-extrabold text-ink-900">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-ink-700">{subtitle}</p>}

        <div className="mt-6">{children}</div>

        {footer && <div className="mt-6 text-center text-sm text-ink-700">{footer}</div>}
      </div>
    </main>
  );
}
