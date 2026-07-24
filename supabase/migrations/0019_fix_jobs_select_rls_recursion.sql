-- Bug found while testing Phase 5's customer bookings list (the first real
-- query ever run against `jobs` with a non-admin, non-owning caller and an
-- actual row present): jobs_select's EXISTS subqueries against
-- job_assignments and job_invitations invoke those tables' own RLS
-- policies. job_assignments_select in turn queries back into `jobs`
-- (`exists (select 1 from jobs j where ... j.customer_id =
-- current_customer_id())`), and several execution-evidence tables
-- (photos/status_logs/proof_of_collection/proof_of_delivery) chain through
-- job_assignments the same way. Postgres's RLS query rewriter detects the
-- resulting cycle and raises 42P17 ("infinite recursion detected in policy
-- for relation jobs"). This is the exact same class of bug fixed in
-- migration 0014 (is_admin()/current_role_name() recursing through
-- profiles) — same fix: move the cross-table lookup into a SECURITY
-- DEFINER helper so it bypasses the other table's RLS entirely instead of
-- re-triggering it, rather than embedding a direct correlated subquery
-- against an RLS-protected table inside another table's policy.

create or replace function app_private.job_assigned_to_current_user(target_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from job_assignments ja
    where ja.job_id = target_job_id
      and (
        ja.transport_partner_id = app_private.current_partner_id()
        or ja.driver_id = app_private.current_driver_id()
      )
  );
$$;

create or replace function app_private.job_invited_to_current_partner(target_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from job_invitations ji
    where ji.job_id = target_job_id and ji.transport_partner_id = app_private.current_partner_id()
  );
$$;

grant execute on function app_private.job_assigned_to_current_user(uuid) to authenticated;
grant execute on function app_private.job_invited_to_current_partner(uuid) to authenticated;

drop policy jobs_select on jobs;

create policy jobs_select on jobs
  for select using (
    is_admin()
    or customer_id = app_private.current_customer_id()
    or (matching_status = 'listed' and app_private.current_partner_id() is not null)
    or app_private.job_assigned_to_current_user(jobs.id)
    or app_private.job_invited_to_current_partner(jobs.id)
  );
