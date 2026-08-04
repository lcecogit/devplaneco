-- Phase 8A: the rebuilt /quote flow.
--
-- Replaces Phase 5's sessionStorage-only quote wizard with a real,
-- persisted quote: an `quotes` row (with a human-readable reference) plus
-- its stops and its inventory. Persisting rather than holding state in the
-- browser is deliberate — the flow shows the visitor a quote reference and
-- is meant to let them come back to it later, which sessionStorage can't do.
--
-- Multi-stop routes are modelled properly here (quote_stops / job_stops),
-- but `jobs` keeps its existing single collection_*/delivery_* columns
-- populated with the first and last stop, because Phase 6/7 allocation
-- (find_work_jobs, find_auction_jobs, close_expired_auctions) reads those
-- columns directly. job_stops is the source of truth for the full route;
-- the flat columns are a backward-compatible projection of it.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Access level at a stop. Drives the pricing engine's floor surcharge and is
-- shown back to the customer in the route summary ("2nd floor to 3rd floor").
create type floor_level as enum (
  'basement',
  'ground',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'above_sixth'
);

create type item_category as enum (
  'sofas',
  'wardrobes',
  'boxes_bags',
  'beds_mattresses',
  'tables',
  'televisions',
  'appliances',
  'chairs'
);

create type quote_status as enum ('in_progress', 'converted', 'abandoned');

-- ---------------------------------------------------------------------------
-- item_catalogue — the browsable/searchable item list
-- ---------------------------------------------------------------------------
-- Dimensions here are the source of the volume figure that drives price and
-- (later) vehicle matching, so they're real-world plausible values, not
-- placeholders. `search_terms` holds synonyms so the typeahead can match
-- "settee" to "Two Seater Sofa".

create table item_catalogue (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category item_category not null,
  length_cm numeric not null check (length_cm > 0),
  width_cm numeric not null check (width_cm > 0),
  height_cm numeric not null check (height_cm > 0),
  -- Stored rather than generated so a future "this item packs down / nests"
  -- adjustment can override the raw bounding-box volume for a specific item.
  volume_m3 numeric not null check (volume_m3 > 0),
  weight_kg numeric,
  search_terms text[] not null default '{}',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index item_catalogue_category_idx on item_catalogue (category, sort_order);
create index item_catalogue_active_idx on item_catalogue (is_active);
-- Typeahead matches name + synonyms; a trigram index would be better but
-- pg_trgm isn't enabled on this project and the catalogue is ~60 rows, so a
-- plain GIN index on the synonyms array is enough.
create index item_catalogue_search_terms_idx on item_catalogue using gin (search_terms);

create trigger set_updated_at before update on item_catalogue
  for each row execute function set_updated_at();

alter table item_catalogue enable row level security;

-- The catalogue is public reference data — an anonymous visitor has to be
-- able to browse it before they have an account. Writes are admin-only.
create policy item_catalogue_select on item_catalogue
  for select using (is_active or is_admin());

create policy item_catalogue_insert on item_catalogue
  for insert with check (is_admin());

create policy item_catalogue_update on item_catalogue
  for update using (is_admin()) with check (is_admin());

create policy item_catalogue_delete on item_catalogue
  for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------------

-- 8-digit human-readable reference shown in the UI ("Quote #48210377").
-- Random rather than sequential so it doesn't leak how many quotes exist,
-- and retried on the (very unlikely) collision by the unique constraint.
create function generate_quote_reference()
returns text
language sql
volatile
set search_path = pg_catalog, pg_temp
as $$
  select lpad((floor(random() * 90000000) + 10000000)::bigint::text, 8, '0');
$$;

create table quotes (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default generate_quote_reference(),
  -- Nullable: an anonymous visitor gets a full quote before they ever have
  -- an account. Claimed at checkout (Phase 8B) once they sign up.
  customer_id uuid references customers (id) on delete set null,
  -- Optional capture only — prices are NOT gated behind giving an email.
  email text,
  marketing_opt_in boolean not null default false,
  status quote_status not null default 'in_progress',

  -- Optional hint from the homepage service cards (Phase 1). The real
  -- jobs.category is derived from the item mix at booking time; this only
  -- records where the visitor came in from.
  category_hint text,

  -- Collected across the three steps.
  crew_size int check (crew_size in (1, 2)),
  total_volume_m3 numeric,
  distance_miles numeric,
  duration_minutes int,
  collection_window_start time,
  collection_window_end time,
  delivery_window_start time,
  delivery_window_end time,
  helper_included boolean not null default false,
  selected_date date,
  -- Full structured output of the pricing engine, so any price we ever
  -- showed can be explained after the fact.
  price_breakdown jsonb,
  total_price numeric,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Quotes are priced against a specific lead time, so they can't stay valid
  -- forever. 30 days matches the point where the lead-time multiplier has
  -- long since flattened out.
  expires_at timestamptz not null default now() + interval '30 days'
);

create index quotes_customer_id_idx on quotes (customer_id);
create index quotes_status_idx on quotes (status);
create index quotes_expires_at_idx on quotes (expires_at);

create trigger set_updated_at before update on quotes
  for each row execute function set_updated_at();

create table quote_stops (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes (id) on delete cascade,
  -- 0 = pickup, highest = final delivery, anything between = an extra stop.
  sequence int not null check (sequence >= 0),
  address_text text,
  postcode text,
  outcode text,
  lat numeric,
  lng numeric,
  floor floor_level not null default 'ground',
  has_lift boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_id, sequence)
);

create index quote_stops_quote_id_idx on quote_stops (quote_id, sequence);

create trigger set_updated_at before update on quote_stops
  for each row execute function set_updated_at();

create table quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes (id) on delete cascade,
  -- Null for a custom item the visitor described themselves.
  catalogue_item_id uuid references item_catalogue (id) on delete set null,
  custom_name text,
  quantity int not null default 1 check (quantity > 0),
  -- Dimensions are SNAPSHOT at the time of adding, not read through the
  -- catalogue FK: editing a catalogue entry later must not retroactively
  -- change the volume (and therefore the price) of an existing quote.
  length_cm numeric,
  width_cm numeric,
  height_cm numeric,
  weight_kg numeric,
  volume_m3 numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Either it's a catalogue item or it's a named custom one.
  constraint quote_items_identified check (catalogue_item_id is not null or custom_name is not null)
);

create index quote_items_quote_id_idx on quote_items (quote_id);

create trigger set_updated_at before update on quote_items
  for each row execute function set_updated_at();

-- RLS: quotes belong to nobody until checkout, so there's no auth.uid() to
-- key ownership on for the anonymous case. Rather than opening a
-- `using (true)` read policy (which would let anyone enumerate every quote
-- and its addresses), anonymous access goes exclusively through the
-- server-side API routes in src/app/api/quote/*, which use the service-role
-- client and require the quote's unguessable UUID as a capability token.
-- These policies therefore only cover the signed-in-customer case.
alter table quotes enable row level security;
alter table quote_stops enable row level security;
alter table quote_items enable row level security;

create policy quotes_select on quotes
  for select using (is_admin() or (customer_id is not null and customer_id = app_private.current_customer_id()));

create policy quotes_update on quotes
  for update using (is_admin() or (customer_id is not null and customer_id = app_private.current_customer_id()))
  with check (is_admin() or (customer_id is not null and customer_id = app_private.current_customer_id()));

create policy quotes_delete on quotes
  for delete using (is_admin());

create policy quote_stops_select on quote_stops
  for select using (
    exists (select 1 from quotes q where q.id = quote_stops.quote_id)
  );

create policy quote_stops_delete on quote_stops
  for delete using (is_admin());

create policy quote_items_select on quote_items
  for select using (
    exists (select 1 from quotes q where q.id = quote_items.quote_id)
  );

create policy quote_items_delete on quote_items
  for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- jobs additions + job_stops / job_items
-- ---------------------------------------------------------------------------
-- All additive. Every existing column stays exactly as it was, because
-- Phase 6/7 allocation queries depend on them.

alter table jobs add column quote_id uuid references quotes (id) on delete set null;
alter table jobs add column crew_size int check (crew_size in (1, 2));
alter table jobs add column total_volume_m3 numeric;
alter table jobs add column helper_included boolean not null default false;
alter table jobs add column price_breakdown jsonb;

create index jobs_quote_id_idx on jobs (quote_id);

create table job_stops (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  sequence int not null check (sequence >= 0),
  address_text text,
  postcode text,
  outcode text,
  lat numeric,
  lng numeric,
  floor floor_level not null default 'ground',
  has_lift boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, sequence)
);

create index job_stops_job_id_idx on job_stops (job_id, sequence);

create trigger set_updated_at before update on job_stops
  for each row execute function set_updated_at();

create table job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  catalogue_item_id uuid references item_catalogue (id) on delete set null,
  custom_name text,
  quantity int not null default 1 check (quantity > 0),
  length_cm numeric,
  width_cm numeric,
  height_cm numeric,
  weight_kg numeric,
  volume_m3 numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_items_identified check (catalogue_item_id is not null or custom_name is not null)
);

create index job_items_job_id_idx on job_items (job_id);

create trigger set_updated_at before update on job_items
  for each row execute function set_updated_at();

alter table job_stops enable row level security;
alter table job_items enable row level security;

-- Route detail and inventory follow the same visibility as the parent job.
-- Deferring to the jobs RLS via EXISTS is safe here (and doesn't recurse the
-- way 0019's job_assignments case did) because jobs_select never queries
-- job_stops or job_items.
--
-- NOTE for Phase 6/7: job_stops leaks full addresses to anyone who can read
-- the parent job row. Today that's only the owning customer, an admin, and
-- an assigned/invited partner — browsing partners can't select `jobs`
-- directly at all (migration 0020 removed that clause; they go through
-- find_work_jobs()). If a future browse path re-opens direct job reads,
-- these two policies must be tightened at the same time.
create policy job_stops_select on job_stops
  for select using (exists (select 1 from jobs j where j.id = job_stops.job_id));

create policy job_stops_insert on job_stops
  for insert with check (
    exists (select 1 from jobs j where j.id = job_stops.job_id and j.customer_id = app_private.current_customer_id())
  );

create policy job_stops_update on job_stops
  for update using (is_admin()) with check (is_admin());

create policy job_stops_delete on job_stops
  for delete using (is_admin());

create policy job_items_select on job_items
  for select using (exists (select 1 from jobs j where j.id = job_items.job_id));

create policy job_items_insert on job_items
  for insert with check (
    exists (select 1 from jobs j where j.id = job_items.job_id and j.customer_id = app_private.current_customer_id())
  );

create policy job_items_update on job_items
  for update using (is_admin()) with check (is_admin());

create policy job_items_delete on job_items
  for delete using (is_admin());

-- This project's `alter default privileges` grants EXECUTE on every new
-- function straight to anon, separately from the implicit PUBLIC grant that
-- CREATE FUNCTION always adds (see migrations 0021/0022 and 0026/0029 — the
-- same trap has bitten two previous phases). generate_quote_reference() is
-- harmless but is internal plumbing, not public API, so revoke both.
revoke all on function generate_quote_reference() from public;
revoke all on function generate_quote_reference() from anon;
revoke all on function generate_quote_reference() from authenticated;
-- ...but it IS the default expression on quotes.reference, and Postgres
-- checks EXECUTE on default expressions against the inserting role. Quote
-- rows are only ever inserted by the service-role API routes, so that's the
-- one role that needs it back.
grant execute on function generate_quote_reference() to service_role;
