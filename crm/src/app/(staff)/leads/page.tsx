import { Suspense } from "react";

import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState, ErrorState, FilteredEmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Surface";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRelative } from "@/lib/format";
import type { LeadRow, LeadStatus } from "@/lib/db-types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads" };

const OPEN_STATUSES: LeadStatus[] = ["new", "qualifying", "quoted", "chasing"];

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

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "new", label: "New" },
  { key: "chasing", label: "Chasing" },
  { key: "booked", label: "Booked" },
  { key: "lost", label: "Lost" },
  { key: "all", label: "All" },
] as const;

type SearchParams = { status?: string; owner?: string };

export default function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const active = searchParams.status ?? "open";

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title-1">Leads</h1>
          <p className="mt-1 text-body text-ink-2">Every enquiry, its owner and its stage.</p>
        </div>
        <Button variant="primary">Add a lead</Button>
      </header>

      {/* Filters sit in one row above the content, never inside it. */}
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((filter) => (
          <a
            key={filter.key}
            href={`/leads?status=${filter.key}`}
            aria-current={active === filter.key ? "true" : undefined}
            className={
              active === filter.key
                ? "rounded-md bg-accent-wash px-4 py-2 text-body-dense font-medium text-ink-1"
                : "rounded-md border border-hairline px-4 py-2 text-body-dense text-ink-2 transition-colors duration-instant ease-standard hover:bg-surface-sunken hover:text-ink-1"
            }
          >
            {filter.label}
          </a>
        ))}
      </div>

      <Panel padded={false}>
        <Suspense fallback={<TableSkeleton rows={10} columns={8} />}>
          <LeadsTable status={active} owner={searchParams.owner} />
        </Suspense>
      </Panel>
    </>
  );
}

const COLUMNS: readonly Column<LeadRow>[] = [
  {
    key: "reference",
    header: "Reference",
    width: "9rem",
    render: (lead) => (
      <a href={`/leads/${lead.id}`} className="font-mono text-body-dense underline-offset-4 hover:underline" data-numeric>
        {lead.reference}
      </a>
    ),
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
  { key: "owner", header: "Owner", render: (lead) => lead.staff?.full_name ?? <Badge tone="critical">Unassigned</Badge> },
  { key: "status", header: "Status", render: (lead) => <Badge tone={STATUS_TONE[lead.status]}>{lead.status}</Badge> },
  {
    key: "score",
    header: "Score",
    numeric: true,
    render: (lead) => (lead.score === null ? "—" : String(lead.score)),
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

async function LeadsTable({ status, owner }: { status: string; owner?: string }) {
  const supabase = createClient();

  let query = supabase
    .from("leads")
    .select(
      "id, reference, brand_id, status, score, move_date, origin_postcode, destination_postcode, created_at, customers(first_name, last_name, email), staff:owner_staff_id(full_name), services(name)",
    )
    .order("created_at", { ascending: false })
    // Server-side pagination past 50 rows: a list view must never ship the
    // whole table to the browser (DESIGN.md §9).
    .limit(50);

  if (status === "open") query = query.in("status", OPEN_STATUSES);
  else if (status !== "all") query = query.eq("status", status);
  if (owner === "none") query = query.is("owner_staff_id", null);

  const { data, error } = await query.returns<LeadRow[]>();

  if (error) {
    return (
      <ErrorState
        title="Couldn't load leads"
        description="Nothing was changed. Reload the page to try again — if it keeps happening, raise it on the internal ticket channel."
      />
    );
  }

  const isFiltered = status !== "all" || Boolean(owner);

  return (
    <DataTable
      caption="Leads"
      columns={COLUMNS}
      rows={data ?? []}
      getKey={(lead) => lead.id}
      empty={
        isFiltered ? (
          <FilteredEmptyState
            onClear={
              <a href="/leads?status=all" className="text-body text-ink-1 underline underline-offset-4">
                Show all leads
              </a>
            }
          />
        ) : (
          <EmptyState
            title="No leads yet"
            description="Enquiries from the brand websites, phone and WhatsApp appear here the moment they arrive. You can also add one by hand."
            action={<Button variant="primary">Add a lead</Button>}
          />
        )
      }
    />
  );
}
