import type { Metadata } from "next";
import { HelpCircleIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Support" };

export default function AdminSupportPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Support</h1>

      <div className="mt-8 rounded-2xl border border-dashed border-brand-300 bg-white p-10 text-center">
        <HelpCircleIcon className="mx-auto h-8 w-8 text-brand-300" />
        <h2 className="mt-3 font-heading text-lg font-bold text-ink-900">Coming soon</h2>
        <p className="mt-1 text-sm text-ink-700">
          Admin support tooling isn&apos;t a priority yet — this is a placeholder.
        </p>
      </div>
    </div>
  );
}
