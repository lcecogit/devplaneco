-- RLS for identity and partner-owned fleet tables.

-- profiles: a user reads/updates their own row; admin sees everything.
-- Role changes are not restricted at the column level here — flagged in the
-- phase summary as a follow-up (a trigger should block self-service role
-- escalation before this goes near production auth flows).
alter table profiles enable row level security;

create policy profiles_select on profiles
  for select using (id = auth.uid() or is_admin());

create policy profiles_insert on profiles
  for insert with check (id = auth.uid() or is_admin());

create policy profiles_update on profiles
  for update using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

create policy profiles_delete on profiles
  for delete using (is_admin());

-- customers: a customer only ever sees/manages their own record.
alter table customers enable row level security;

create policy customers_select on customers
  for select using (profile_id = auth.uid() or is_admin());

create policy customers_insert on customers
  for insert with check (profile_id = auth.uid() or is_admin());

create policy customers_update on customers
  for update using (profile_id = auth.uid() or is_admin())
  with check (profile_id = auth.uid() or is_admin());

create policy customers_delete on customers
  for delete using (profile_id = auth.uid() or is_admin());

-- transport_partners: owning partner manages their own business record.
-- NOTE: no public/customer-facing read policy yet (e.g. for a public partner
-- directory) — only the owning partner and admin can read it today. Add a
-- `published = true` public SELECT policy later if customers need to browse
-- partner profiles directly.
alter table transport_partners enable row level security;

create policy transport_partners_select on transport_partners
  for select using (profile_id = auth.uid() or is_admin());

create policy transport_partners_insert on transport_partners
  for insert with check (profile_id = auth.uid() or is_admin());

create policy transport_partners_update on transport_partners
  for update using (profile_id = auth.uid() or is_admin())
  with check (profile_id = auth.uid() or is_admin());

create policy transport_partners_delete on transport_partners
  for delete using (profile_id = auth.uid() or is_admin());

-- drivers: the partner manages their own driver roster; a driver may read
-- (but not edit) their own driver record.
alter table drivers enable row level security;

create policy drivers_select on drivers
  for select using (
    transport_partner_id = current_partner_id()
    or profile_id = auth.uid()
    or is_admin()
  );

create policy drivers_insert on drivers
  for insert with check (transport_partner_id = current_partner_id() or is_admin());

create policy drivers_update on drivers
  for update using (transport_partner_id = current_partner_id() or is_admin())
  with check (transport_partner_id = current_partner_id() or is_admin());

create policy drivers_delete on drivers
  for delete using (transport_partner_id = current_partner_id() or is_admin());

-- vehicles: fully partner-owned.
alter table vehicles enable row level security;

create policy vehicles_select on vehicles
  for select using (transport_partner_id = current_partner_id() or is_admin());

create policy vehicles_insert on vehicles
  for insert with check (transport_partner_id = current_partner_id() or is_admin());

create policy vehicles_update on vehicles
  for update using (transport_partner_id = current_partner_id() or is_admin())
  with check (transport_partner_id = current_partner_id() or is_admin());

create policy vehicles_delete on vehicles
  for delete using (transport_partner_id = current_partner_id() or is_admin());

-- vehicle_documents: scoped through the owning vehicle's partner.
alter table vehicle_documents enable row level security;

create policy vehicle_documents_select on vehicle_documents
  for select using (
    is_admin()
    or exists (
      select 1 from vehicles v
      where v.id = vehicle_documents.vehicle_id
        and v.transport_partner_id = current_partner_id()
    )
  );

create policy vehicle_documents_insert on vehicle_documents
  for insert with check (
    is_admin()
    or exists (
      select 1 from vehicles v
      where v.id = vehicle_documents.vehicle_id
        and v.transport_partner_id = current_partner_id()
    )
  );

create policy vehicle_documents_update on vehicle_documents
  for update using (
    is_admin()
    or exists (
      select 1 from vehicles v
      where v.id = vehicle_documents.vehicle_id
        and v.transport_partner_id = current_partner_id()
    )
  )
  with check (
    is_admin()
    or exists (
      select 1 from vehicles v
      where v.id = vehicle_documents.vehicle_id
        and v.transport_partner_id = current_partner_id()
    )
  );

create policy vehicle_documents_delete on vehicle_documents
  for delete using (
    is_admin()
    or exists (
      select 1 from vehicles v
      where v.id = vehicle_documents.vehicle_id
        and v.transport_partner_id = current_partner_id()
    )
  );

-- service_specialisations: fully partner-owned.
alter table service_specialisations enable row level security;

create policy service_specialisations_select on service_specialisations
  for select using (transport_partner_id = current_partner_id() or is_admin());

create policy service_specialisations_insert on service_specialisations
  for insert with check (transport_partner_id = current_partner_id() or is_admin());

create policy service_specialisations_update on service_specialisations
  for update using (transport_partner_id = current_partner_id() or is_admin())
  with check (transport_partner_id = current_partner_id() or is_admin());

create policy service_specialisations_delete on service_specialisations
  for delete using (transport_partner_id = current_partner_id() or is_admin());

-- routes: fully partner-owned.
alter table routes enable row level security;

create policy routes_select on routes
  for select using (transport_partner_id = current_partner_id() or is_admin());

create policy routes_insert on routes
  for insert with check (transport_partner_id = current_partner_id() or is_admin());

create policy routes_update on routes
  for update using (transport_partner_id = current_partner_id() or is_admin())
  with check (transport_partner_id = current_partner_id() or is_admin());

create policy routes_delete on routes
  for delete using (transport_partner_id = current_partner_id() or is_admin());

-- reservations: fully partner-owned.
alter table reservations enable row level security;

create policy reservations_select on reservations
  for select using (transport_partner_id = current_partner_id() or is_admin());

create policy reservations_insert on reservations
  for insert with check (transport_partner_id = current_partner_id() or is_admin());

create policy reservations_update on reservations
  for update using (transport_partner_id = current_partner_id() or is_admin())
  with check (transport_partner_id = current_partner_id() or is_admin());

create policy reservations_delete on reservations
  for delete using (transport_partner_id = current_partner_id() or is_admin());

-- saved_searches: fully partner-owned.
alter table saved_searches enable row level security;

create policy saved_searches_select on saved_searches
  for select using (transport_partner_id = current_partner_id() or is_admin());

create policy saved_searches_insert on saved_searches
  for insert with check (transport_partner_id = current_partner_id() or is_admin());

create policy saved_searches_update on saved_searches
  for update using (transport_partner_id = current_partner_id() or is_admin())
  with check (transport_partner_id = current_partner_id() or is_admin());

create policy saved_searches_delete on saved_searches
  for delete using (transport_partner_id = current_partner_id() or is_admin());
