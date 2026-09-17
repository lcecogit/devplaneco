import { Suspense } from "react";

import { Panel, PanelHeader } from "@/components/ui/Surface";
import { StatTile } from "@/components/ui/StatTile";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge, type Tone } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRelative } from "@/lib/format";
import type { LeadRow, LeadStatus } from "@/lib/db-types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

const STATUS_TONE: Record<LeadStatus, Tone> = {
  new: "accent",
  qualifying: "neutral",
  quoted: "neutral",
  chasing: "warning",
  booked: "good",
  completed: "good",
  reviewed: "good",
  lost: "critical",
  duplicate: "neutral",
};

export default function DashboardPage() {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-title-1">Today</h1>
        <p className="mt-1 text-body text-ink-2">
          Open work across the brands you have access to.
        </p>
      </header>

      <Suspense fallback={<KpiSkeleton />}>
        <Kpis />
      </Suspense>

      <Panel className="mt-6" padded={false}>
        <div className="p-6 pb-0">
          <PanelHeader
            title="Needs attention"
            description="Unassigned leads first, then the oldest open enquiries."
          />
        </div>
        <Suspense fallback={<div className="px-6 pb-6"><TableSkeleton /></div>}>
          <AttentionTable />
        </Suspense>
      </Panel>
    </>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-[104px] rounded-lg border border-hairline bg-surface-raised" />
      ))}
    </div>
  );
}

async function Kpis() {
  const supabase = createClient();

  // Each figure is a filtered count that the tile links through to, so every
  // number on this page can be opened as the rows behind it (SPEC.md §12).
  const [open, unassigned, chasing, booked] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).in("status", ["new", "qualifying", "quoted", "chasing"]),
    supabase.from("leads").select("id", { count: "exact", head: true }).is("owner_staff_id", null).in("status", ["new", "qualifying"]),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "chasing"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "booked"),
  ]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile label="Open leads" value={String(open.count ?? 0)} href="/leads?status=open" />
      <StatTile
        label="Unassigned"
        value={String(unassigned.count ?? 0)}
        comparison="Anything here for over 15 minutes is a problem"
        tone={(unassigned.count ?? 0) > 0 ? "critical" : "neutral"}
        href="/leads?owner=none"
      />
      <StatTile label="Being chased" value={String(chasing.count ?? 0)} href="/leads?status=chasing" />
      <StatTile label="Booked, not yet moved" value={String(booked.count ?? 0)} href="/leads?status=booked" />
    </div>
  );
}

const COLUMNS: readonly Column<LeadRow>[] = [
  {
    key: "reference",
    header: "Reference",
    width: "9rem",
    render: (lead) => <span data-numeric className="font-mono text-body-dense">{lead.reference}</span>,
  },
  {
    key: "customer",
    header: "Customer",
    render: (lead) =>
      [lead.customers?.first_name, lead.customers?.last_name].filter(Boolean).join(" ") || "—",
  },
  { key: "service", header: "Service", render: (lead) => lead.services?.name ?? "—" },
  {
    key: "route",
    header: "Route",
    render: (lead) =>
      lead.origin_postcode || lead.destination_postcode
        ? `${lead.origin_postcode ?? "?"} → ${lead.destination_postcode ?? "?"}`
        : "—",
  },
  { key: "move_date", header: "Move date", render: (lead) => formatDate(lead.move_date) },
  {
    key: "owner",
    header: "Owner",
    render: (lead) =>
      lead.staff?.full_name ?? <Badge tone="critical">Unassigned</Badge>,
  },
  {
    key: "status",
    header: "Status",
    render: (lead) => <Badge tone={STATUS_TONE[lead.status]}>{lead.status}</Badge>,
  },
  {
    key: "age",
    header: "Received",
    numeric: true,
    render: (lead) => (
      <time dateTime={lead.created_at} title={lead.created_at}>
        {formatRelative(lead.created_at)}
      </time>
    ),
  },
];

async function AttentionTable() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, reference, brand_id, status, score, move_date, origin_postcode, destination_postcode, created_at, customers(first_name, last_name, email), staff:owner_staff_id(full_name), services(name)",
    )
    .in("status", ["new", "qualifying", "quoted", "chasing"])
    .order("owner_staff_id", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .limit(25)
    .returns<LeadRow[]>();

  if (error) {
    return (
      <ErrorState
        title="Couldn't load the queue"
        description="The leads list didn't come back. The rest of this page is unaffected — reload to try again."
      />
    );
  }

  return (
    <DataTable
      caption="Open leads needing attention"
      columns={COLUMNS}
      rows={data ?? []}
      getKey={(lead) => lead.id}
      empty={
        <EmptyState
          title="Nothing waiting"
          description="Every open lead has an owner and none are overdue. New enquiries appear here the moment they arrive."
        />
      }
    />
  );
}
