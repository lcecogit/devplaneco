-- Public, no-auth-required form submissions: quote requests (customer-side
-- "Get a Quote") and partner leads (partner-side "Become a Partner"
-- interest form). Deliberately NOT wired into the existing auth-gated
-- schema (profiles/customers/transport_partners) — these are simple,
-- write-only-from-the-public lead tables. Anyone (anon or authenticated)
-- can submit one; only admins can read, update, or delete them.

create type lead_status as enum ('new', 'contacted', 'converted', 'archived');

create table quote_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  service_category text,
  collection_postcode text not null,
  delivery_postcode text not null,
  preferred_date date,
  details text,
  status lead_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quote_requests_status_idx on quote_requests (status);
create index quote_requests_created_at_idx on quote_requests (created_at);

create trigger set_updated_at before update on quote_requests
  for each row execute function set_updated_at();

alter table quote_requests enable row level security;

create policy quote_requests_insert on quote_requests
  for insert with check (true);

create policy quote_requests_select on quote_requests
  for select using (is_admin());

create policy quote_requests_update on quote_requests
  for update using (is_admin()) with check (is_admin());

create policy quote_requests_delete on quote_requests
  for delete using (is_admin());

create table partner_leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  coverage_area text,
  company_type text,
  message text,
  status lead_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partner_leads_status_idx on partner_leads (status);
create index partner_leads_created_at_idx on partner_leads (created_at);

create trigger set_updated_at before update on partner_leads
  for each row execute function set_updated_at();

alter table partner_leads enable row level security;

create policy partner_leads_insert on partner_leads
  for insert with check (true);

create policy partner_leads_select on partner_leads
  for select using (is_admin());

create policy partner_leads_update on partner_leads
  for update using (is_admin()) with check (is_admin());

create policy partner_leads_delete on partner_leads
  for delete using (is_admin());
