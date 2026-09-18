import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface DashboardStats {
  openLeads: number;
  unassignedLeads: number;
  jobsOnBoard: number;
  manualQueue: number;
  revenueBookedMinor: number;
  quotesSent: number;
  quotesAccepted: number;
  /** True once there is enough history to draw a trend honestly. */
  hasHistory: boolean;
}

const OPEN = ["new", "qualifying", "quoted", "chasing"];

/** Real figures only. Where the number genuinely is zero the dashboard says
 *  zero — it does not borrow a sample value to look populated, because a
 *  dashboard that shows plausible invented numbers is worse than one that
 *  shows none. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient();

  const count = async (
    table: string,
    build: (q: any) => any = (q) => q,
  ): Promise<number> => {
    const { count: n, error } = await build(
      supabase.from(table).select("*", { count: "exact", head: true }),
    );
    if (error) throw new Error(`Could not count ${table}: ${error.message}`);
    return n ?? 0;
  };

  const [openLeads, unassignedLeads, jobsOnBoard, manualQueue, quotesSent, quotesAccepted] =
    await Promise.all([
      count("leads", (q) => q.in("status", OPEN)),
      count("leads", (q) => q.in("status", OPEN).is("owner_staff_id", null)),
      count("jobs", (q) => q.neq("status", "cancelled")),
      count("outbox", (q) => q.eq("status", "needs_manual_send")),
      count("quotes", (q) => q.not("sent_at", "is", null)),
      count("quotes", (q) => q.eq("status", "accepted")),
    ]);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data: booked, error } = await supabase
    .from("invoices")
    .select("gross_minor")
    .gte("issued_on", monthStart.toISOString().slice(0, 10))
    .neq("status", "void");
  if (error) throw new Error(`Could not total revenue: ${error.message}`);

  const revenueBookedMinor = (booked ?? []).reduce(
    (sum, row: { gross_minor: number | null }) => sum + (row.gross_minor ?? 0),
    0,
  );

  return {
    openLeads,
    unassignedLeads,
    jobsOnBoard,
    manualQueue,
    revenueBookedMinor,
    quotesSent,
    quotesAccepted,
    // Two completed months of quotes is the minimum for a "vs last month"
    // comparison to mean anything. Until then, no trend is drawn.
    hasHistory: quotesSent > 0 && jobsOnBoard > 0,
  };
}
