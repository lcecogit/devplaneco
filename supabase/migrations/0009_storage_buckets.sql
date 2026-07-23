-- Storage buckets and their access policies.
--
-- Path convention (enforced by application upload code, not the database):
--   vehicle-photos:     {transport_partner_id}/{vehicle_id}/{filename}
--   vehicle-documents:  {transport_partner_id}/{vehicle_id}/{filename}
--   job-photos:         {job_id}/{filename}
--   signatures:         {job_id}/{filename}
--   partner-documents:  {transport_partner_id}/{filename}
-- Policies below assume the first path segment is a valid uuid matching the
-- pattern above — the app must never let a user control that segment.

insert into storage.buckets (id, name, public)
values
  ('vehicle-photos', 'vehicle-photos', true),
  ('vehicle-documents', 'vehicle-documents', false),
  ('job-photos', 'job-photos', false),
  ('signatures', 'signatures', false),
  ('partner-documents', 'partner-documents', false)
on conflict (id) do nothing;

-- vehicle-photos: public read (it's a public bucket), partner-scoped write.
create policy vehicle_photos_read on storage.objects
  for select using (bucket_id = 'vehicle-photos');

create policy vehicle_photos_insert on storage.objects
  for insert with check (
    bucket_id = 'vehicle-photos'
    and ((storage.foldername(name))[1] = current_partner_id()::text or is_admin())
  );

create policy vehicle_photos_update on storage.objects
  for update using (
    bucket_id = 'vehicle-photos'
    and ((storage.foldername(name))[1] = current_partner_id()::text or is_admin())
  )
  with check (
    bucket_id = 'vehicle-photos'
    and ((storage.foldername(name))[1] = current_partner_id()::text or is_admin())
  );

create policy vehicle_photos_delete on storage.objects
  for delete using (
    bucket_id = 'vehicle-photos'
    and ((storage.foldername(name))[1] = current_partner_id()::text or is_admin())
  );

-- vehicle-documents: private, partner + admin only.
create policy vehicle_documents_select on storage.objects
  for select using (
    bucket_id = 'vehicle-documents'
    and ((storage.foldername(name))[1] = current_partner_id()::text or is_admin())
  );

create policy vehicle_documents_insert on storage.objects
  for insert with check (
    bucket_id = 'vehicle-documents'
    and ((storage.foldername(name))[1] = current_partner_id()::text or is_admin())
  );

create policy vehicle_documents_update on storage.objects
  for update using (
    bucket_id = 'vehicle-documents'
    and ((storage.foldername(name))[1] = current_partner_id()::text or is_admin())
  )
  with check (
    bucket_id = 'vehicle-documents'
    and ((storage.foldername(name))[1] = current_partner_id()::text or is_admin())
  );

create policy vehicle_documents_delete on storage.objects
  for delete using (
    bucket_id = 'vehicle-documents'
    and ((storage.foldername(name))[1] = current_partner_id()::text or is_admin())
  );

-- job-photos: private. Driver assigned to the job writes; partner, customer,
-- driver and admin can read; immutable once written (no update, admin-only delete).
create policy job_photos_select on storage.objects
  for select using (
    bucket_id = 'job-photos'
    and (
      is_admin()
      or exists (
        select 1 from job_assignments ja
        where ja.job_id = ((storage.foldername(name))[1])::uuid
          and (ja.transport_partner_id = current_partner_id() or ja.driver_id = current_driver_id())
      )
      or exists (
        select 1 from jobs j
        where j.id = ((storage.foldername(name))[1])::uuid
          and j.customer_id = current_customer_id()
      )
    )
  );

create policy job_photos_insert on storage.objects
  for insert with check (
    bucket_id = 'job-photos'
    and (
      is_admin()
      or exists (
        select 1 from job_assignments ja
        where ja.job_id = ((storage.foldername(name))[1])::uuid
          and ja.driver_id = current_driver_id()
      )
    )
  );

create policy job_photos_delete on storage.objects
  for delete using (bucket_id = 'job-photos' and is_admin());

-- signatures: private, same access pattern as job-photos.
create policy signatures_select on storage.objects
  for select using (
    bucket_id = 'signatures'
    and (
      is_admin()
      or exists (
        select 1 from job_assignments ja
        where ja.job_id = ((storage.foldername(name))[1])::uuid
          and (ja.transport_partner_id = current_partner_id() or ja.driver_id = current_driver_id())
      )
      or exists (
        select 1 from jobs j
        where j.id = ((storage.foldername(name))[1])::uuid
          and j.customer_id = current_customer_id()
      )
    )
  );

create policy signatures_insert on storage.objects
  for insert with check (
    bucket_id = 'signatures'
    and (
      is_admin()
      or exists (
        select 1 from job_assignments ja
        where ja.job_id = ((storage.foldername(name))[1])::uuid
          and ja.driver_id = current_driver_id()
      )
    )
  );

create policy signatures_delete on storage.objects
  for delete using (bucket_id = 'signatures' and is_admin());

-- partner-documents: private, partner + admin only.
create policy partner_documents_select on storage.objects
  for select using (
    bucket_id = 'partner-documents'
    and ((storage.foldername(name))[1] = current_partner_id()::text or is_admin())
  );

create policy partner_documents_insert on storage.objects
  for insert with check (
    bucket_id = 'partner-documents'
    and ((storage.foldername(name))[1] = current_partner_id()::text or is_admin())
  );

create policy partner_documents_update on storage.objects
  for update using (
    bucket_id = 'partner-documents'
    and ((storage.foldername(name))[1] = current_partner_id()::text or is_admin())
  )
  with check (
    bucket_id = 'partner-documents'
    and ((storage.foldername(name))[1] = current_partner_id()::text or is_admin())
  );

create policy partner_documents_delete on storage.objects
  for delete using (
    bucket_id = 'partner-documents'
    and ((storage.foldername(name))[1] = current_partner_id()::text or is_admin())
  );
