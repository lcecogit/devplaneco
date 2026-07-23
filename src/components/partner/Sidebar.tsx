"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS } from "./navItems";
import { ChevronDownIcon } from "@/components/icons";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of NAV_ITEMS) {
      if (item.children?.some((child) => pathname.startsWith(child.href))) {
        initial[item.label] = true;
      }
    }
    return initial;
  });

  return (
    <nav aria-label="Partner dashboard" className="flex flex-col gap-1 p-4">
      {NAV_ITEMS.map((item) => {
        if (item.children) {
          const isOpen = openSections[item.label] ?? false;
          return (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => setOpenSections((s) => ({ ...s, [item.label]: !isOpen }))}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-ink-800 hover:bg-brand-50"
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-brand-500" />
                  {item.label}
                </span>
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="ml-8 mt-1 flex flex-col gap-0.5 border-l border-brand-100 pl-3">
                  {item.children.map((child) => {
                    const active = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                          active
                            ? "bg-brand-50 font-semibold text-brand-700"
                            : "text-ink-700 hover:bg-brand-50"
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href!}
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
