import Link from "next/link";

import { StatusBadge } from "@/components/crm/StatusBadge";
import { formatMoneyMinor, formatRelative } from "@/lib/format";
import { sampleJobs, sampleLeads, sampleOutbox, sampleTargets } from "@/lib/sample-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

const NOW = new Date("2026-09-17T09:00:00Z");

export default function DashboardPage() {
  const open = sampleLeads.filter((l) => ["new", "qualifying", "quoted", "chasing"].includes(l.status));
  const unassigned = open.filter((l) => !l.owner);
  const chasing = sampleLeads.filter((l) => l.status === "chasing");
  const bookedValue = sampleLeads
    .filter((l) => l.status === "booked")
    .reduce((total, l) => total + (l.valueMinor ?? 0), 0);

  return (
    <div className="mx-auto w-full max-w-content">
      <header className="mb-8">
        <h1 className="text-title-1 text-ink-1">Wednesday, 17 September</h1>
        <p className="mt-1 text-body text-ink-2">
          {open.length} open leads · {sampleJobs.filter((j) => j.status !== "completed").length} jobs
          on the board this week
        </p>
      </header>

      {/* Figures first, and every one of them a link to the rows behind it. */}
      <section className="grid min-w-0 grid-cols-1 gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
        <Figure label="Open leads" value={String(open.length)} note="Across all brands" href="/leads?status=open" />
        <Figure
          label="Unassigned"
          value={String(unassigned.length)}
          note={unassigned.length > 0 ? "Oldest waiting 3 hours" : "Everything has an owner"}
          tone={unassigned.length > 0 ? "critical" : "neutral"}
          href="/leads?owner=none"
        />
        <Figure label="Being chased" value={String(chasing.length)} note="48-hour rule active" href="/leads?status=chasing" />
        <Figure label="Booked, not yet moved" value={formatMoneyMinor(bookedValue)} note="4 jobs" href="/leads?status=booked" />
      </section>

      <div className="mt-8 grid min-w-0 gap-8 xl:grid-cols-[1.6fr_1fr]">
        <section className="min-w-0">
          <SectionHead title="Needs attention" action={{ href: "/leads", label: "All leads" }} />
          <div className="min-w-0 overflow-x-auto border border-hairline">
            <table className="w-full min-w-[40rem] border-collapse text-body-dense">
              <caption className="sr-only">Open leads needing attention, unassigned first</caption>
              <thead>
                <tr className="border-b border-hairline">
                  {["Reference", "Customer", "Route", "Owner", "Status"].map((h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className={`whitespace-nowrap px-3 py-2 text-caption font-normal text-ink-3 ${i >= 5 ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...open]
                  .sort((a, b) => Number(Boolean(a.owner)) - Number(Boolean(b.owner)))
                  .slice(0, 7)
                  .map((lead) => (
                    <tr key={lead.id} className="border-b border-hairline last:border-0 hover:bg-surface-sunken">
                      <td className="h-9 whitespace-nowrap px-3">
                        <Link href={`/leads/${lead.id}`} className="font-mono text-ink-1 underline-offset-4 hover:underline" data-numeric>
                          {lead.reference}
                        </Link>
                      </td>
                      <td className="h-9 px-3 text-ink-1">
                        <span className="block max-w-[20ch] truncate">{lead.organisation ?? lead.customer}</span>
                      </td>
                      <td className="h-9 whitespace-nowrap px-3 text-ink-2" data-numeric>
                        {lead.origin} → {lead.destination}
                      </td>
                      <td className="h-9 whitespace-nowrap px-3">
                        {lead.owner ?? <span className="text-status-critical-text">Unassigned</span>}
                      </td>
                      <td className="h-9 whitespace-nowrap px-3">
                        <StatusBadge status={lead.status} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex flex-col gap-8">
          <section>
            <SectionHead title="Today on the road" action={{ href: "/calendar", label: "Calendar" }} />
            <ul className="flex flex-col gap-px border border-hairline bg-hairline">
              {sampleJobs.slice(0, 3).map((job) => (
                <li key={job.id} className="bg-surface-canvas p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-body-dense font-medium text-ink-1">{job.customer}</span>
                    <span data-numeric className="text-caption text-ink-3">
                      {new Date(job.start).toUTCString().slice(17, 22)} · {job.durationHours}h
                    </span>
                  </div>
                  <p className="mt-1 text-caption text-ink-2">
                    {job.crew.join(", ")} · {job.vehicle}
                  </p>
                  <p className="mt-2 border-l-2 border-accent pl-2 text-caption text-ink-2">
                    {job.accessNotes}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <SectionHead title="Waiting to send" action={{ href: "/inbox", label: "Send queue" }} />
            <ul className="flex flex-col gap-px border border-hairline bg-hairline">
              {sampleOutbox.map((message) => (
                <li key={message.id} className="bg-surface-canvas p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-body-dense text-ink-1">{message.customer}</span>
                    <span className="text-caption text-ink-3">{message.channel}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-caption text-ink-2">{message.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-caption text-ink-3">
              Drafted because no WhatsApp provider is connected yet. Send and mark them off here.
            </p>
          </section>
        </div>
      </div>

      <section className="mt-8">
        <SectionHead title="This month against target" action={{ href: "/reports", label: "Sales tracker" }} />
        <div className="grid min-w-0 gap-px border border-hairline bg-hairline sm:grid-cols-3 lg:grid-cols-5">
          {sampleTargets.map((target) => {
            const pct = Math.round((target.bookedMinor / target.targetMinor) * 100);
            return (
              <div key={target.size} className="bg-surface-canvas p-4">
                <p className="text-caption text-ink-3">{target.size}</p>
                <p data-numeric className="mt-2 text-title-3 text-ink-1">
                  {formatMoneyMinor(target.bookedMinor)}
                </p>
                <div className="mt-3 h-1 w-full bg-hairline" aria-hidden>
                  <div
                    className={pct >= 100 ? "h-1 bg-accent" : "h-1 bg-ink-3"}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <p data-numeric className="mt-2 text-caption text-ink-2">
                  {pct}% of {formatMoneyMinor(target.targetMinor)} · {target.count} booked
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <p className="mt-8 text-caption text-ink-3">
        Updated {formatRelative(new Date(NOW.getTime() - 240_000).toISOString(), NOW)}
      </p>
    </div>
  );
}

function SectionHead({ title, action }: { title: string; action?: { href: string; label: string } }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-title-3 text-ink-1">{title}</h2>
      {action ? (
        <Link href={action.href} className="text-body-dense text-ink-2 underline-offset-4 hover:text-ink-1 hover:underline">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

function Figure({
  label,
  value,
  note,
  href,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  href: string;
  tone?: "neutral" | "critical";
}) {
  return (
    <Link
      href={href}
      className="bg-surface-canvas p-5 transition-colors duration-instant ease-standard hover:bg-surface-sunken"
    >
      <p className="text-caption text-ink-3">{label}</p>
      <p
        data-numeric
        className={`mt-2 text-title-1 ${tone === "critical" ? "text-status-critical-text" : "text-ink-1"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-caption text-ink-2">{note}</p>
    </Link>
  );
}
