import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SampleLead } from "@/lib/sample-data";

/** Real lead rows, shaped exactly like the sample rows so a screen renders the
 *  same way whichever it is handed.
 *
 *  Every read here goes through the session client, so RLS decides what comes
 *  back — a sales user sees their brand, a crew user sees nothing. That is the
 *  point: the filtering is not in this file and must never be, or the two would
 *  drift and the weaker one would win. */
export async function getLeads(): Promise<SampleLead[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      `id, reference, status, score, move_date, origin_postcode, destination_postcode, created_at,
       brands ( name ),
       services ( name ),
       lead_sources ( name ),
       staff ( full_name ),
       customers ( first_name, last_name, organisations ( name ) ),
       quotes ( gross_minor, version )`,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  // A failed read is not an empty list. Returning [] here would render "no
  // leads yet" over a permissions or network fault, which is the kind of quiet
  // wrong answer this whole system exists to avoid.
  if (error) throw new Error(`Could not load leads: ${error.message}`);

  return (data ?? []).map(toLead);
}

export async function getLead(id: string): Promise<SampleLead | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      `id, reference, status, score, move_date, origin_postcode, destination_postcode, created_at,
       brands ( name ),
       services ( name ),
       lead_sources ( name ),
       staff ( full_name ),
       customers ( first_name, last_name, organisations ( name ) ),
       quotes ( gross_minor, version )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load lead: ${error.message}`);
  return data ? toLead(data) : null;
}

function toLead(row: any): SampleLead {
  const customer = row.customers ?? null;
  const name = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ");

  // Highest version wins: a superseded quote must never be the headline value.
  const latestQuote = (row.quotes ?? []).reduce(
    (best: any, q: any) => (best === null || q.version > best.version ? q : best),
    null,
  );

  return {
    id: row.id,
    reference: row.reference,
    brand: row.brands?.name ?? "—",
    customer: name || "Unnamed enquiry",
    organisation: customer?.organisations?.name ?? null,
    service: row.services?.name ?? "—",
    origin: row.origin_postcode ?? "—",
    destination: row.destination_postcode ?? "—",
    moveDate: row.move_date,
    status: row.status,
    owner: row.staff?.full_name ?? null,
    score: row.score ?? 0,
    valueMinor: latestQuote?.gross_minor ?? null,
    createdAt: row.created_at,
    source: row.lead_sources?.name ?? "—",
  };
}
