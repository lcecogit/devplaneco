-- Phase 5: customer booking flow. Separates "has this job been matched to a
-- partner yet" (matching_status) from "where is this job in its execution"
-- (the existing job_status, which only ever applied post-assignment). Also
-- makes allocation_method nullable — a freshly booked job doesn't have one
-- yet, that's decided at allocation time (Phase 6).

create type matching_status as enum ('draft', 'listed', 'matched', 'cancelled');

alter table jobs add column matching_status matching_status not null default 'draft';

create index jobs_matching_status_idx on jobs (matching_status);

alter table jobs alter column allocation_method drop not null;

-- jobs_select previously used `status is null` to let any authenticated
-- partner browse unassigned marketplace work. That clause is now wrong on
-- two counts now that real customer bookings exist: (1) job_status stays
-- null all the way through "listed", so it no longer distinguishes
-- browsable work from a job still in the customer's draft quote flow, and
-- (2) it had no role check at all — any authenticated user, including
-- another customer, could read the full row (collection address, price) of
-- every unassigned job. Replaced with matching_status = 'listed' scoped to
-- users who actually have a partner record.
drop policy jobs_select on jobs;

create policy jobs_select on jobs
  for select using (
    is_admin()
    or customer_id = app_private.current_customer_id()
    or (matching_status = 'listed' and app_private.current_partner_id() is not null)
    or exists (
      select 1 from job_assignments ja
      where ja.job_id = jobs.id
        and (ja.transport_partner_id = app_private.current_partner_id() or ja.driver_id = app_private.current_driver_id())
    )
    or exists (
      select 1 from job_invitations ji
      where ji.job_id = jobs.id and ji.transport_partner_id = app_private.current_partner_id()
    )
  );
