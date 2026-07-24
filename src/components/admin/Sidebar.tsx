"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./navItems";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin dashboard" className="flex flex-col gap-1 p-4">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-brand-50 text-brand-700" : "text-ink-800 hover:bg-brand-50"
            }`}
          >
            <item.icon className="h-5 w-5 text-brand-500" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
