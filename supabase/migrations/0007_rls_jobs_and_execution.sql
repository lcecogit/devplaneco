-- RLS for jobs, allocation, execution evidence, payments, and performance.

-- jobs: owning customer always sees their own job. A partner can see any
-- unassigned job (status is null) to browse/bid/claim it — this is an
-- interpretation beyond the literal spec, added because Phase 3 (Find Work,
-- Route Matcher) needs partners to discover open marketplace work. A partner
-- also sees jobs they're assigned to or invited to; a driver sees jobs
-- they're assigned to.
alter table jobs enable row level security;

create policy jobs_select on jobs
  for select using (
    is_admin()
    or customer_id = current_customer_id()
    or status is null
    or exists (
      select 1 from job_assignments ja
      where ja.job_id = jobs.id
        and (ja.transport_partner_id = current_partner_id() or ja.driver_id = current_driver_id())
    )
    or exists (
      select 1 from job_invitations ji
      where ji.job_id = jobs.id and ji.transport_partner_id = current_partner_id()
    )
  );

create policy jobs_insert on jobs
  for insert with check (customer_id = current_customer_id() or is_admin());

create policy jobs_update on jobs
  for update using (
    is_admin()
    or customer_id = current_customer_id()
    or exists (
      select 1 from job_assignments ja
      where ja.job_id = jobs.id
        and (ja.transport_partner_id = current_partner_id() or ja.driver_id = current_driver_id())
    )
  )
  with check (
    is_admin()
    or customer_id = current_customer_id()
    or exists (
      select 1 from job_assignments ja
      where ja.job_id = jobs.id
        and (ja.transport_partner_id = current_partner_id() or ja.driver_id = current_driver_id())
    )
  );

create policy jobs_delete on jobs
  for delete using (customer_id = current_customer_id() or is_admin());

-- bids: partner manages their own bids; the job's owning customer can read
-- bids on their job to compare providers (needed for the "choose your
-- provider" flow) — also an interpretation beyond the literal spec text.
alter table bids enable row level security;

create policy bids_select on bids
  for select using (
    is_admin()
    or transport_partner_id = current_partner_id()
    or exists (select 1 from jobs j where j.id = bids.job_id and j.customer_id = current_customer_id())
  );

create policy bids_insert on bids
  for insert with check (transport_partner_id = current_partner_id() or is_admin());

create policy bids_update on bids
  for update using (transport_partner_id = current_partner_id() or is_admin())
  with check (transport_partner_id = current_partner_id() or is_admin());

create policy bids_delete on bids
  for delete using (transport_partner_id = current_partner_id() or is_admin());

-- job_assignments: partner manages assignments for their own jobs; the
-- assigned driver and the job's customer can read (not write) it.
alter table job_assignments enable row level security;

create policy job_assignments_select on job_assignments
  for select using (
    is_admin()
    or transport_partner_id = current_partner_id()
    or driver_id = current_driver_id()
    or exists (select 1 from jobs j where j.id = job_assignments.job_id and j.customer_id = current_customer_id())
  );

create policy job_assignments_insert on job_assignments
  for insert with check (transport_partner_id = current_partner_id() or is_admin());

create policy job_assignments_update on job_assignments
  for update using (transport_partner_id = current_partner_id() or is_admin())
  with check (transport_partner_id = current_partner_id() or is_admin());

create policy job_assignments_delete on job_assignments
  for delete using (transport_partner_id = current_partner_id() or is_admin());

-- job_invitations: system/admin sends invitations; the invited partner can
-- read and respond (update) to their own, but not create or remove them.
alter table job_invitations enable row level security;

create policy job_invitations_select on job_invitations
  for select using (transport_partner_id = current_partner_id() or is_admin());

create policy job_invitations_insert on job_invitations
  for insert with check (is_admin());

create policy job_invitations_update on job_invitations
  for update using (transport_partner_id = current_partner_id() or is_admin())
  with check (transport_partner_id = current_partner_id() or is_admin());

create policy job_invitations_delete on job_invitations
  for delete using (is_admin());

-- job_watchlist: fully partner-owned.
alter table job_watchlist enable row level security;

create policy job_watchlist_select on job_watchlist
  for select using (transport_partner_id = current_partner_id() or is_admin());

create policy job_watchlist_insert on job_watchlist
  for insert with check (transport_partner_id = current_partner_id() or is_admin());

create policy job_watchlist_update on job_watchlist
  for update using (transport_partner_id = current_partner_id() or is_admin())
  with check (transport_partner_id = current_partner_id() or is_admin());

create policy job_watchlist_delete on job_watchlist
  for delete using (transport_partner_id = current_partner_id() or is_admin());

-- job_recommendations: generated by the system (route matcher) for a
-- specific route; only the owning partner can read/respond to it.
alter table job_recommendations enable row level security;

create policy job_recommendations_select on job_recommendations
  for select using (
    is_admin()
    or exists (
      select 1 from routes r
      where r.id = job_recommendations.route_id and r.transport_partner_id = current_partner_id()
    )
  );

create policy job_recommendations_insert on job_recommendations
  for insert with check (is_admin());

create policy job_recommendations_update on job_recommendations
  for update using (
    is_admin()
    or exists (
      select 1 from routes r
      where r.id = job_recommendations.route_id and r.transport_partner_id = current_partner_id()
    )
  )
  with check (
    is_admin()
    or exists (
      select 1 from routes r
      where r.id = job_recommendations.route_id and r.transport_partner_id = current_partner_id()
    )
  );

create policy job_recommendations_delete on job_recommendations
  for delete using (is_admin());

-- photos / status_logs: only the assigned driver may record evidence for a
-- job they're actually assigned to; partner/customer/driver may read it;
-- immutable once written (update/delete restricted to admin) to protect
-- audit integrity of collection/delivery evidence.
alter table photos enable row level security;

create policy photos_select on photos
  for select using (
    is_admin()
    or exists (
      select 1 from job_assignments ja
      where ja.job_id = photos.job_id
        and (ja.transport_partner_id = current_partner_id() or ja.driver_id = current_driver_id())
    )
    or exists (select 1 from jobs j where j.id = photos.job_id and j.customer_id = current_customer_id())
  );

create policy photos_insert on photos
  for insert with check (
    is_admin()
    or exists (
      select 1 from job_assignments ja
      where ja.job_id = photos.job_id and ja.driver_id = current_driver_id()
    )
  );

create policy photos_update on photos
  for update using (is_admin()) with check (is_admin());

create policy photos_delete on photos
  for delete using (is_admin());

alter table status_logs enable row level security;

create policy status_logs_select on status_logs
  for select using (
    is_admin()
    or exists (
      select 1 from job_assignments ja
      where ja.job_id = status_logs.job_id
        and (ja.transport_partner_id = current_partner_id() or ja.driver_id = current_driver_id())
    )
    or exists (select 1 from jobs j where j.id = status_logs.job_id and j.customer_id = current_customer_id())
  );

create policy status_logs_insert on status_logs
  for insert with check (
    is_admin()
    or exists (
      select 1 from job_assignments ja
      where ja.job_id = status_logs.job_id and ja.driver_id = current_driver_id()
    )
  );

create policy status_logs_update on status_logs
  for update using (is_admin()) with check (is_admin());

create policy status_logs_delete on status_logs
  for delete using (is_admin());

-- proof_of_collection / proof_of_delivery: same evidence pattern as photos.
alter table proof_of_collection enable row level security;

create policy proof_of_collection_select on proof_of_collection
  for select using (
    is_admin()
    or exists (
      select 1 from job_assignments ja
      where ja.job_id = proof_of_collection.job_id
        and (ja.transport_partner_id = current_partner_id() or ja.driver_id = current_driver_id())
    )
    or exists (select 1 from jobs j where j.id = proof_of_collection.job_id and j.customer_id = current_customer_id())
  );

create policy proof_of_collection_insert on proof_of_collection
  for insert with check (
    is_admin()
    or exists (
      select 1 from job_assignments ja
      where ja.job_id = proof_of_collection.job_id and ja.driver_id = current_driver_id()
    )
  );

create policy proof_of_collection_update on proof_of_collection
  for update using (is_admin()) with check (is_admin());

create policy proof_of_collection_delete on proof_of_collection
  for delete using (is_admin());

alter table proof_of_delivery enable row level security;

create policy proof_of_delivery_select on proof_of_delivery
  for select using (
    is_admin()
    or exists (
      select 1 from job_assignments ja
      where ja.job_id = proof_of_delivery.job_id
        and (ja.transport_partner_id = current_partner_id() or ja.driver_id = current_driver_id())
    )
    or exists (select 1 from jobs j where j.id = proof_of_delivery.job_id and j.customer_id = current_customer_id())
  );

create policy proof_of_delivery_insert on proof_of_delivery
  for insert with check (
    is_admin()
    or exists (
      select 1 from job_assignments ja
      where ja.job_id = proof_of_delivery.job_id and ja.driver_id = current_driver_id()
    )
  );

create policy proof_of_delivery_update on proof_of_delivery
  for update using (is_admin()) with check (is_admin());

create policy proof_of_delivery_delete on proof_of_delivery
  for delete using (is_admin());

-- payments: system/admin-managed. Partner and the job's customer can read;
-- only admin writes.
alter table payments enable row level security;

create policy payments_select on payments
  for select using (
    is_admin()
    or transport_partner_id = current_partner_id()
    or exists (select 1 from jobs j where j.id = payments.job_id and j.customer_id = current_customer_id())
  );

create policy payments_insert on payments
  for insert with check (is_admin());

create policy payments_update on payments
  for update using (is_admin()) with check (is_admin());

create policy payments_delete on payments
  for delete using (is_admin());

-- deallocation_charges: system/admin-generated; partner can read their own
-- and update it only to submit a dispute.
alter table deallocation_charges enable row level security;

create policy deallocation_charges_select on deallocation_charges
  for select using (transport_partner_id = current_partner_id() or is_admin());

create policy deallocation_charges_insert on deallocation_charges
  for insert with check (is_admin());

create policy deallocation_charges_update on deallocation_charges
  for update using (transport_partner_id = current_partner_id() or is_admin())
  with check (transport_partner_id = current_partner_id() or is_admin());

create policy deallocation_charges_delete on deallocation_charges
  for delete using (is_admin());

-- performance_metrics / performance_management_plans: computed by the
-- system; partner has read-only access to their own.
alter table performance_metrics enable row level security;

create policy performance_metrics_select on performance_metrics
  for select using (transport_partner_id = current_partner_id() or is_admin());

create policy performance_metrics_insert on performance_metrics
  for insert with check (is_admin());

create policy performance_metrics_update on performance_metrics
  for update using (is_admin()) with check (is_admin());

create policy performance_metrics_delete on performance_metrics
  for delete using (is_admin());

alter table performance_management_plans enable row level security;

create policy performance_management_plans_select on performance_management_plans
  for select using (transport_partner_id = current_partner_id() or is_admin());

create policy performance_management_plans_insert on performance_management_plans
  for insert with check (is_admin());

create policy performance_management_plans_update on performance_management_plans
  for update using (is_admin()) with check (is_admin());

create policy performance_management_plans_delete on performance_management_plans
  for delete using (is_admin());

-- ratings: the customer who did the job submits it; both sides can read;
-- immutable after submission (update/delete restricted to admin).
alter table ratings enable row level security;

create policy ratings_select on ratings
  for select using (
    customer_id = current_customer_id()
    or transport_partner_id = current_partner_id()
    or is_admin()
  );

create policy ratings_insert on ratings
  for insert with check (customer_id = current_customer_id() or is_admin());

create policy ratings_update on ratings
  for update using (is_admin()) with check (is_admin());

create policy ratings_delete on ratings
  for delete using (is_admin());
