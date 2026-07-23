-- Fixes for the performance/security advisor findings after the initial
-- schema + RLS + storage migrations.

-- 1. Missing FK index (job_assignments.vehicle_id).
create index job_assignments_vehicle_id_idx on job_assignments (vehicle_id);

-- 2. Wrap auth.uid() as (select auth.uid()) so Postgres evaluates it once
-- per query instead of once per row (auth_rls_initplan advisory).
alter policy profiles_select on profiles
  using (id = (select auth.uid()) or is_admin());

alter policy profiles_insert on profiles
  with check (id = (select auth.uid()) or is_admin());

alter policy profiles_update on profiles
  using (id = (select auth.uid()) or is_admin())
  with check (id = (select auth.uid()) or is_admin());

alter policy customers_select on customers
  using (profile_id = (select auth.uid()) or is_admin());

alter policy customers_insert on customers
  with check (profile_id = (select auth.uid()) or is_admin());

alter policy customers_update on customers
  using (profile_id = (select auth.uid()) or is_admin())
  with check (profile_id = (select auth.uid()) or is_admin());

alter policy customers_delete on customers
  using (profile_id = (select auth.uid()) or is_admin());

alter policy transport_partners_select on transport_partners
  using (profile_id = (select auth.uid()) or is_admin());

alter policy transport_partners_insert on transport_partners
  with check (profile_id = (select auth.uid()) or is_admin());

alter policy transport_partners_update on transport_partners
  using (profile_id = (select auth.uid()) or is_admin())
  with check (profile_id = (select auth.uid()) or is_admin());

alter policy transport_partners_delete on transport_partners
  using (profile_id = (select auth.uid()) or is_admin());

alter policy drivers_select on drivers
  using (
    transport_partner_id = current_partner_id()
    or profile_id = (select auth.uid())
    or is_admin()
  );

-- 3. Public bucket listing: a public bucket doesn't need a broad SELECT
-- policy on storage.objects for object URLs to work (that path bypasses
-- RLS entirely). Replace the blanket read policy with one scoped to the
-- owning partner (for their own dashboard listing) plus admin.
drop policy vehicle_photos_read on storage.objects;

create policy vehicle_photos_select on storage.objects
  for select using (
    bucket_id = 'vehicle-photos'
    and ((storage.foldername(name))[1] = current_partner_id()::text or is_admin())
  );
