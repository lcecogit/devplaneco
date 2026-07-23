-- Identity (profiles/customers/transport_partners/drivers) and fleet
-- (vehicles/documents/specialisations/routes/reservations) tables.

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null,
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on profiles
  for each row execute function set_updated_at();

create table transport_partners (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles (id) on delete cascade,
  business_name text not null,
  business_description text,
  company_type text,
  trade_associations text[],
  goods_in_transit_insurance_doc_url text,
  cmr_insurance_doc_url text,
  profile_photo_url text,
  allow_bid_invitations boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transport_partners_profile_id_idx on transport_partners (profile_id);

create trigger set_updated_at before update on transport_partners
  for each row execute function set_updated_at();

create table customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_profile_id_idx on customers (profile_id);

create trigger set_updated_at before update on customers
  for each row execute function set_updated_at();

create table drivers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles (id) on delete cascade,
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  status driver_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index drivers_profile_id_idx on drivers (profile_id);
create index drivers_transport_partner_id_idx on drivers (transport_partner_id);
create index drivers_status_idx on drivers (status);

create trigger set_updated_at before update on drivers
  for each row execute function set_updated_at();

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  registration_number text not null,
  vehicle_type text,
  vehicle_category text,
  make text,
  model text,
  crew_capacity int,
  base_postcode text,
  base_lat numeric,
  base_lng numeric,
  payload_kg numeric,
  cargo_volume_m3 numeric,
  max_load_length_m numeric,
  has_tail_lift boolean not null default false,
  can_transport_motorbikes boolean not null default false,
  uses_trailer boolean not null default false,
  fuel_type fuel_type,
  approval_status vehicle_approval_status not null default 'draft',
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicles_transport_partner_id_idx on vehicles (transport_partner_id);
create index vehicles_approval_status_idx on vehicles (approval_status);

create trigger set_updated_at before update on vehicles
  for each row execute function set_updated_at();

create table vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  doc_type vehicle_doc_type not null,
  file_url text not null,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicle_documents_vehicle_id_idx on vehicle_documents (vehicle_id);

create trigger set_updated_at before update on vehicle_documents
  for each row execute function set_updated_at();

create table service_specialisations (
  id uuid primary key default gen_random_uuid(),
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  category text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_specialisations_transport_partner_id_idx
  on service_specialisations (transport_partner_id);

create trigger set_updated_at before update on service_specialisations
  for each row execute function set_updated_at();

create table routes (
  id uuid primary key default gen_random_uuid(),
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  vehicle_id uuid references vehicles (id) on delete set null,
  date date not null,
  start_postcode text not null,
  end_postcode text not null,
  direction route_direction not null default 'both',
  job_categories text[],
  team_size int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index routes_transport_partner_id_idx on routes (transport_partner_id);
create index routes_vehicle_id_idx on routes (vehicle_id);

create trigger set_updated_at before update on routes
  for each row execute function set_updated_at();

create table reservations (
  id uuid primary key default gen_random_uuid(),
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  type reservation_type not null,
  date date not null,
  start_time time,
  end_time time,
  start_postcode text,
  end_postcode text,
  team_size int,
  van_space_m3 numeric,
  min_price numeric,
  max_price numeric,
  status reservation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reservations_transport_partner_id_idx on reservations (transport_partner_id);
create index reservations_vehicle_id_idx on reservations (vehicle_id);
create index reservations_status_idx on reservations (status);

create trigger set_updated_at before update on reservations
  for each row execute function set_updated_at();
