-- Job execution evidence (photos/signatures/status history), payments,
-- deallocation charges, partner performance, ratings, and saved searches.

create table photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  stage photo_stage not null,
  url text not null,
  has_damage boolean not null default false,
  comment text,
  taken_at timestamptz not null default now(),
  gps_lat numeric,
  gps_lng numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index photos_job_id_idx on photos (job_id);

create trigger set_updated_at before update on photos
  for each row execute function set_updated_at();

create table proof_of_collection (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references jobs (id) on delete cascade,
  signature_url text,
  signed_at timestamptz,
  gps_lat numeric,
  gps_lng numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index proof_of_collection_job_id_idx on proof_of_collection (job_id);

create trigger set_updated_at before update on proof_of_collection
  for each row execute function set_updated_at();

create table proof_of_delivery (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references jobs (id) on delete cascade,
  signature_url text,
  signed_at timestamptz,
  gps_lat numeric,
  gps_lng numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index proof_of_delivery_job_id_idx on proof_of_delivery (job_id);

create trigger set_updated_at before update on proof_of_delivery
  for each row execute function set_updated_at();

create table status_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  status job_status not null,
  occurred_at timestamptz not null default now(),
  gps_lat numeric,
  gps_lng numeric,
  source status_log_source not null default 'auto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index status_logs_job_id_idx on status_logs (job_id);
create index status_logs_status_idx on status_logs (status);

create trigger set_updated_at before update on status_logs
  for each row execute function set_updated_at();

create table payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references jobs (id) on delete cascade,
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  amount numeric not null,
  status payment_status not null default 'scheduled',
  scheduled_date date,
  transferred_date date,
  express_pay boolean not null default false,
  express_pay_fee numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_job_id_idx on payments (job_id);
create index payments_transport_partner_id_idx on payments (transport_partner_id);
create index payments_status_idx on payments (status);

create trigger set_updated_at before update on payments
  for each row execute function set_updated_at();

create table deallocation_charges (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs (id) on delete cascade,
  reservation_id uuid references reservations (id) on delete cascade,
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  amount numeric not null,
  reason text,
  dispute_status dispute_status not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deallocation_charges_source_check
    check (job_id is not null or reservation_id is not null)
);

create index deallocation_charges_job_id_idx on deallocation_charges (job_id);
create index deallocation_charges_reservation_id_idx on deallocation_charges (reservation_id);
create index deallocation_charges_transport_partner_id_idx
  on deallocation_charges (transport_partner_id);
create index deallocation_charges_dispute_status_idx on deallocation_charges (dispute_status);

create trigger set_updated_at before update on deallocation_charges
  for each row execute function set_updated_at();

create table performance_metrics (
  id uuid primary key default gen_random_uuid(),
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  period_month date not null,
  customer_feedback_rating numeric,
  app_usage_pct numeric,
  deallocation_rate_pct numeric,
  on_time_pickup_pct numeric,
  on_time_delivery_pct numeric,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (transport_partner_id, period_month)
);

create index performance_metrics_transport_partner_id_idx
  on performance_metrics (transport_partner_id);

create trigger set_updated_at before update on performance_metrics
  for each row execute function set_updated_at();

create table performance_management_plans (
  id uuid primary key default gen_random_uuid(),
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  started_at timestamptz not null default now(),
  reason text,
  status pmp_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index performance_management_plans_transport_partner_id_idx
  on performance_management_plans (transport_partner_id);
create index performance_management_plans_status_idx
  on performance_management_plans (status);

create trigger set_updated_at before update on performance_management_plans
  for each row execute function set_updated_at();

create table ratings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references jobs (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  rating numeric not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ratings_job_id_idx on ratings (job_id);
create index ratings_customer_id_idx on ratings (customer_id);
create index ratings_transport_partner_id_idx on ratings (transport_partner_id);

create trigger set_updated_at before update on ratings
  for each row execute function set_updated_at();

create table saved_searches (
  id uuid primary key default gen_random_uuid(),
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_searches_transport_partner_id_idx on saved_searches (transport_partner_id);

create trigger set_updated_at before update on saved_searches
  for each row execute function set_updated_at();
