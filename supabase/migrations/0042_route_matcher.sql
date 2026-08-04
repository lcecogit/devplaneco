-- Route Matcher: routes/job_recommendations have sat unused since Phase 2.
-- Non-exclusive by design (unlike Reservations' first-refusal model) — a
-- recommendation is just a discovery aid ("this job is along a route
-- you're already driving"), not a claim or commitment. Actually winning
-- the job still goes through Find Work/Bidding's existing claim_job/
-- submit_bid — this doesn't touch allocation_method at all.
--
-- Matching is symmetric and works in both creation orders: a new job checks
-- existing routes, and a new route checks existing jobs, so declaring a
-- route today still surfaces work that was already listed yesterday.
-- Direction-aware: 'outbound' matches start->collection/end->delivery,
-- 'return' matches the reverse, 'both' matches either. Postcode-area level
-- (not exact), category/crew-size permissive when unset — same principles
-- used throughout (Find Work compatibility, Reservation matching, Alerts).
alter table job_recommendations
  add constraint job_recommendations_route_job_unique unique (route_id, job_id);

create or replace function app_private.recommend_job_for_routes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.matching_status <> 'listed' then
    return null;
  end if;

  insert into job_recommendations (route_id, job_id, status)
  select r.id, new.id, 'sent'
  from routes r
  where r.date = new.collection_window_start::date
    and (
      r.job_categories is null
      or coalesce(array_length(r.job_categories, 1), 0) = 0
      or new.category = any(r.job_categories)
    )
    and (
      (
        r.direction in ('outbound', 'both')
        and app_private.postcode_area(r.start_postcode) = app_private.postcode_area(new.collection_postcode)
        and app_private.postcode_area(r.end_postcode) = app_private.postcode_area(new.delivery_postcode)
      )
      or (
        r.direction in ('return', 'both')
        and app_private.postcode_area(r.end_postcode) = app_private.postcode_area(new.collection_postcode)
        and app_private.postcode_area(r.start_postcode) = app_private.postcode_area(new.delivery_postcode)
      )
    )
    and (r.team_size is null or new.crew_size is null or new.crew_size <= r.team_size)
  on conflict (route_id, job_id) do nothing;

  return null;
end;
$$;

create trigger jobs_recommend_routes_trigger
  after insert on jobs
  for each row execute function app_private.recommend_job_for_routes();

create or replace function app_private.recommend_routes_for_existing_jobs()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into job_recommendations (route_id, job_id, status)
  select new.id, j.id, 'sent'
  from jobs j
  where j.matching_status = 'listed'
    and j.collection_window_start::date = new.date
    and (
      new.job_categories is null
      or coalesce(array_length(new.job_categories, 1), 0) = 0
      or j.category = any(new.job_categories)
    )
    and (
      (
        new.direction in ('outbound', 'both')
        and app_private.postcode_area(new.start_postcode) = app_private.postcode_area(j.collection_postcode)
        and app_private.postcode_area(new.end_postcode) = app_private.postcode_area(j.delivery_postcode)
      )
      or (
        new.direction in ('return', 'both')
        and app_private.postcode_area(new.end_postcode) = app_private.postcode_area(j.collection_postcode)
        and app_private.postcode_area(new.start_postcode) = app_private.postcode_area(j.delivery_postcode)
      )
    )
    and (new.team_size is null or j.crew_size is null or j.crew_size <= new.team_size)
  on conflict (route_id, job_id) do nothing;

  return null;
end;
$$;

create trigger routes_recommend_jobs_trigger
  after insert on routes
  for each row execute function app_private.recommend_routes_for_existing_jobs();

-- Partner-facing read: job_recommendations_select already lets a partner
-- read rows for their own routes, but the joined job may still be 'listed'
-- and not assigned to them — jobs_select won't return it directly (same
-- reasoning as find_work_jobs since migration 0020), hence the curated,
-- address-free RPC.
create or replace function public.my_route_recommendations()
returns table (
  recommendation_id uuid,
  job_id uuid,
  route_id uuid,
  category text,
  collection_area text,
  delivery_area text,
  collection_window_start timestamptz,
  collection_window_end timestamptz,
  distance_miles numeric,
  customer_price numeric,
  allocation_method allocation_method,
  status job_recommendation_status,
  sent_at timestamptz
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
    jr.id,
    j.id,
    jr.route_id,
    j.category,
    app_private.postcode_area(j.collection_postcode),
    app_private.postcode_area(j.delivery_postcode),
    j.collection_window_start,
    j.collection_window_end,
    j.distance_miles,
    j.customer_price,
    j.allocation_method,
    jr.status,
    jr.sent_at
  from job_recommendations jr
  join routes r on r.id = jr.route_id
  join jobs j on j.id = jr.job_id
  where r.transport_partner_id = v_partner_id
    and j.matching_status = 'listed'
  order by jr.sent_at desc;
end;
$$;

revoke execute on function public.my_route_recommendations() from public;
revoke execute on function public.my_route_recommendations() from anon;
grant execute on function public.my_route_recommendations() to authenticated;
