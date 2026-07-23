"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "./Sidebar";
import { MenuIcon, CloseIcon, LogOutIcon } from "@/components/icons";

export function DashboardChrome({
  businessName,
  children,
}: {
  businessName: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/partner/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-brand-50/30 lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-brand-100 bg-white lg:block">
        <div className="border-b border-brand-100 px-4 py-5">
          <Link href="/" className="font-heading text-lg font-extrabold text-ink-900">
            Movers<span className="text-coral-500">Now</span>
          </Link>
        </div>
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-ink-900/40"
          />
          <aside className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-brand-100 px-4 py-5">
              <Link href="/" className="font-heading text-lg font-extrabold text-ink-900">
                Movers<span className="text-coral-500">Now</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-900"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-brand-100 bg-white px-4 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-900 lg:hidden"
          >
            <MenuIcon className="h-6 w-6" />
          </button>

          <p className="truncate text-sm font-semibold text-ink-900">{businessName}</p>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-ink-700 hover:bg-brand-50"
          >
            <LogOutIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </header>

        <main id="main-content" className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
