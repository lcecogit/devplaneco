"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOutIcon } from "@/components/icons";

const NAV = [
  { label: "Home", href: "/admin" },
  { label: "Settings", href: "/admin/settings" },
];

export function AdminChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-brand-50/30">
      <header className="flex h-16 items-center justify-between border-b border-brand-100 bg-ink-900 px-6">
        <div className="flex items-center gap-8">
          <span className="font-heading text-lg font-extrabold text-white">
            Movers<span className="text-coral-400">Now</span>{" "}
            <span className="text-brand-100">Admin</span>
          </span>
          <nav aria-label="Admin" className="flex gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-white/10 text-white"
                    : "text-brand-100 hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-brand-100 hover:bg-white/10"
        >
          <LogOutIcon className="h-4 w-4" />
          Sign out
        </button>
      </header>

      <main id="main-content" className="mx-auto max-w-4xl p-6 lg:p-10">
        {children}
      </main>
    </div>
  );
}
