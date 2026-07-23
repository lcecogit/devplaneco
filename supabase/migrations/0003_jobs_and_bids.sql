-- Jobs, bids, and the allocation/assignment tables around them.

create table jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  title text not null,
  work_type work_type not null,
  category text,
  collection_address text,
  collection_postcode text not null,
  collection_window_start timestamptz,
  collection_window_end timestamptz,
  delivery_address text,
  delivery_postcode text not null,
  delivery_window_start timestamptz,
  delivery_window_end timestamptz,
  distance_miles numeric,
  estimated_duration_minutes int,
  payout_amount numeric,
  customer_price numeric,
  allocation_method allocation_method not null,
  -- Nullable: job_status only models post-assignment execution steps (see
  -- phase summary). A job with no job_assignments row yet has status = null.
  status job_status,
  listed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_customer_id_idx on jobs (customer_id);
create index jobs_status_idx on jobs (status);
create index jobs_allocation_method_idx on jobs (allocation_method);

create trigger set_updated_at before update on jobs
  for each row execute function set_updated_at();

create table bids (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  amount numeric not null,
  status bid_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bids_job_id_idx on bids (job_id);
create index bids_transport_partner_id_idx on bids (transport_partner_id);
create index bids_status_idx on bids (status);

create trigger set_updated_at before update on bids
  for each row execute function set_updated_at();

create table job_assignments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references jobs (id) on delete cascade,
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  driver_id uuid references drivers (id) on delete set null,
  vehicle_id uuid references vehicles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_assignments_job_id_idx on job_assignments (job_id);
create index job_assignments_transport_partner_id_idx on job_assignments (transport_partner_id);
create index job_assignments_driver_id_idx on job_assignments (driver_id);

create trigger set_updated_at before update on job_assignments
  for each row execute function set_updated_at();

create table job_invitations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  status invitation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_invitations_job_id_idx on job_invitations (job_id);
create index job_invitations_transport_partner_id_idx on job_invitations (transport_partner_id);
create index job_invitations_status_idx on job_invitations (status);

create trigger set_updated_at before update on job_invitations
  for each row execute function set_updated_at();

create table job_watchlist (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, transport_partner_id)
);

create index job_watchlist_job_id_idx on job_watchlist (job_id);
create index job_watchlist_transport_partner_id_idx on job_watchlist (transport_partner_id);

create trigger set_updated_at before update on job_watchlist
  for each row execute function set_updated_at();

create table job_recommendations (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  status job_recommendation_status not null default 'sent',
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_recommendations_route_id_idx on job_recommendations (route_id);
create index job_recommendations_job_id_idx on job_recommendations (job_id);
create index job_recommendations_status_idx on job_recommendations (status);

create trigger set_updated_at before update on job_recommendations
  for each row execute function set_updated_at();
