-- Partner-facing Insights/reliability dashboard. Admin already has a
-- performance view (Phase 4, /admin/performance) backed by
-- performance_metrics — a period_month batch-computed cache table — but
-- nothing in this codebase has ever computed a row into it (confirmed:
-- 0 rows live). Rather than build a partner view on top of a table nothing
-- populates (which would just show blank forever regardless of real
-- activity), this computes live from the actual source tables the partner
-- can already read under RLS: job_assignments, ratings,
-- deallocation_charges, performance_management_plans. That's a real,
-- flagged inconsistency with the admin side's data source, not something
-- hidden — see the phase summary.
--
-- Two metrics AnyVan shows (on-time pickup/delivery %, app usage %) are
-- deliberately NOT computed here: there's no driver app and no recorded
-- actual-arrival timestamps anywhere in this schema to compute them from
-- (status_logs exists but nothing writes to it, since driver-facing routes
-- don't exist — a pre-existing, already-documented gap). Showing a
-- fabricated percentage would be worse than showing nothing; the UI shows
-- "No data yet" for those instead.
--
-- booster_eligible is an interpretation, not a spec: eligible whenever the
-- partner has no *active* performance_management_plan. Simple, defensible,
-- reuses real data — flagged as a chosen rule, changeable later, same as
-- Book Now's category-filter interpretation.
create or replace function public.my_performance_summary()
returns table (
  member_since timestamptz,
  total_jobs bigint,
  jobs_last_30_days bigint,
  average_rating numeric,
  rating_count bigint,
  deallocation_count bigint,
  deallocation_total_amount numeric,
  active_performance_plan boolean,
  booster_eligible boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid;
begin
  v_partner_id := app_private.current_partner_id();
  if v_partner_id is null then
    return;
  end if;

  return query
  select
    tp.created_at,
    (select count(*) from job_assignments ja where ja.transport_partner_id = v_partner_id),
    (
      select count(*) from job_assignments ja
      where ja.transport_partner_id = v_partner_id and ja.assigned_at >= now() - interval '30 days'
    ),
    (select avg(r.rating) from ratings r where r.transport_partner_id = v_partner_id),
    (select count(*) from ratings r where r.transport_partner_id = v_partner_id),
    (select count(*) from deallocation_charges dc where dc.transport_partner_id = v_partner_id),
    (select coalesce(sum(dc.amount), 0) from deallocation_charges dc where dc.transport_partner_id = v_partner_id),
    exists (
      select 1 from performance_management_plans pmp
      where pmp.transport_partner_id = v_partner_id and pmp.status = 'active'
    ),
    not exists (
      select 1 from performance_management_plans pmp
      where pmp.transport_partner_id = v_partner_id and pmp.status = 'active'
    )
  from transport_partners tp
  where tp.id = v_partner_id;
end;
$$;

revoke execute on function public.my_performance_summary() from public;
revoke execute on function public.my_performance_summary() from anon;
grant execute on function public.my_performance_summary() to authenticated;
