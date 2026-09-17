import { redirect } from "next/navigation";

import { BrandTheme } from "@/components/chrome/BrandTheme";
import { Sidebar, type NavItem } from "@/components/chrome/Sidebar";
import { createClient } from "@/lib/supabase/server";
import type { BrandRow } from "@/lib/db-types";

// Every staff screen is session-scoped, so nothing here is prerenderable.
export const dynamic = "force-dynamic";

const NAV: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/quotes", label: "Quotes" },
  { href: "/calendar", label: "Job calendar" },
  { href: "/customers", label: "Customers" },
  { href: "/messages", label: "Send queue" },
  { href: "/reports", label: "Reports" },
];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // RLS already limits this to the brands the signed-in staff member holds
  // access to, so no brand filter is needed here — and none should be added,
  // because a filter in application code would suggest the policy is optional.
  const { data: brands } = await supabase
    .from("brands")
    .select("id, slug, code, name, accent_hex, accent_dark_hex")
    .order("name")
    .returns<BrandRow[]>();

  const brand = brands?.[0];

  return (
    <BrandTheme accent={brand?.accent_hex ?? "#18794E"} accentDark={brand?.accent_dark_hex ?? "#3FBF84"}>
      <div className="flex min-h-dvh">
        <aside className="hidden w-60 shrink-0 border-r border-hairline bg-surface-sunken md:block">
          <Sidebar items={NAV} brandName={brand?.name ?? "No brand access"} />
        </aside>
        <main id="main" className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-content px-4 py-8 md:px-6">{children}</div>
        </main>
      </div>
    </BrandTheme>
  );
}
