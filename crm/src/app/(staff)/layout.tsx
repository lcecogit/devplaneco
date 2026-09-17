import { redirect } from "next/navigation";

import { BrandTheme } from "@/components/chrome/BrandTheme";
import { SampleBanner } from "@/components/chrome/SampleBanner";
import { Sidebar, type NavGroup } from "@/components/chrome/Sidebar";
import { TopBar } from "@/components/chrome/TopBar";
import { isSampleMode } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/server";
import type { BrandRow } from "@/lib/db-types";

export const dynamic = "force-dynamic";

/** Grouped by the part of the business that owns each module, which is also
 *  how the team is split. A flat list of twenty modules cannot be scanned. */
const NAV: readonly NavGroup[] = [
  {
    label: "Pipeline",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/leads", label: "Leads" },
      { href: "/quotes", label: "Quotes" },
      { href: "/customers", label: "Customers" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/calendar", label: "Job calendar" },
      { href: "/jobs", label: "Job sheets" },
      { href: "/crew", label: "Crew & vehicles" },
    ],
  },
  {
    label: "Communication",
    items: [
      { href: "/inbox", label: "Send queue" },
      { href: "/sequences", label: "Sequences" },
      { href: "/templates", label: "Templates" },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/invoices", label: "Invoices" },
      { href: "/payments", label: "Payments" },
    ],
  },
  {
    label: "Insight",
    items: [
      { href: "/reports", label: "Sales tracker" },
      { href: "/providers", label: "Lead providers" },
    ],
  },
];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  let brands: BrandRow[] = [];
  let userName = "Sample user";

  // Without a Supabase project there is nothing to authenticate against, so
  // the app opens in sample mode rather than bouncing to a login it cannot
  // complete. With one configured, the session is enforced here and by RLS.
  if (!isSampleMode) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    userName = user.email ?? "Signed in";

    const { data } = await supabase
      .from("brands")
      .select(
        "id, slug, code, name, accent_hex, accent_dark_hex, accent_text_hex, accent_text_dark_hex, accent_contrast_hex, brand_identity_confirmed",
      )
      .order("name")
      .returns<BrandRow[]>();
    brands = data ?? [];
  }

  const brand = brands[0];

  return (
    <BrandTheme
      accent={brand?.accent_hex ?? "#7DB903"}
      accentDark={brand?.accent_dark_hex ?? "#7DB903"}
      accentText={brand?.accent_text_hex ?? "#235F2A"}
      accentTextDark={brand?.accent_text_dark_hex ?? "#97DD09"}
      accentContrast={brand?.accent_contrast_hex ?? "#161A36"}
    >
      <div className="flex min-h-dvh bg-surface-canvas">
        <aside className="hidden w-56 shrink-0 border-r border-hairline bg-surface-sunken lg:block">
          <div className="sticky top-0 flex h-14 items-center px-6">
            <span className="text-body-dense font-medium tracking-[-0.01em] text-ink-1">
              EcoGreen Group
            </span>
          </div>
          <Sidebar groups={NAV} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            brandName={brand?.name ?? "EcoGreen Movers"}
            brandCount={brands.length || 6}
            userName={userName}
          />
          {isSampleMode ? <SampleBanner /> : null}
          <main id="main" className="min-w-0 flex-1 px-4 py-8 md:px-6">
            {children}
          </main>
        </div>
      </div>
    </BrandTheme>
  );
}
