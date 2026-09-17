"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

export interface NavItem {
  href: string;
  label: string;
}

/** Sentence case, no icons competing with the labels, one accent mark for the
 *  active item. Restraint is the point (DESIGN.md §5). */
export function Sidebar({ items, brandName }: { items: readonly NavItem[]; brandName: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-1 p-4">
      <p className="px-3 pb-4 text-label text-ink-2">{brandName}</p>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-body transition-colors duration-instant ease-standard",
              active ? "bg-accent-wash text-ink-1 font-medium" : "text-ink-2 hover:bg-surface-sunken hover:text-ink-1",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
