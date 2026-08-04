-- Rating-gated access: researched AnyVan thresholds, applied as-is per the
-- project owner's explicit instruction ("threshold just same as anyvan"):
--   - Below 4.5* average -> blocked from all job discovery entirely
--     ("ratings below 4.5* risk losing access to jobs... entirely").
--   - New partners (fewer than 30 completed jobs) stay capped to
--     single-item-transport ("furniture-level") jobs until they graduate:
--     30 total jobs AND a 4.8+ average ("must complete 30 furniture-level
--     jobs at >=4.8* before being trusted with full house-removal leads").
--   - 4.5+ average also unlocks Express Pay eligibility (surfaced on
--     Insights; there's no real payout timing system yet — see the
--     Payments placeholder — so this is an honest status, not a working
--     toggle).
--
-- Deliberately scoped to the three job-BROWSING RPCs only (find_work_jobs,
-- find_auction_jobs, find_express_interest_jobs) — not Reservations or
-- Route Matcher, which are partner-initiated declarations rather than
-- browsing, and gating those raises separate UX questions this pass
-- doesn't answer. Also deliberately does NOT touch the admin Partner
-- Performance page's "4.7 intervention" flagging concept from the same
-- research — that page already reads from `performance_metrics`, a cache
-- table migration 0039 already documented as having zero rows ever
-- written to it. Wiring a new flag into an already-empty page would just
-- be more dead UI; fixing that page to compute live (the same fix
-- my_performance_summary() already got) is a separate, pre-existing gap,
-- not part of this one.
create or replace function app_private.partner_job_access(p_partner_id uuid)
returns table (avg_rating numeric, total_jobs bigint, is_blocked boolean, is_probation boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with stats as (
    select
      (select avg(r.rating) from ratings r where r.transport_partner_id = p_partner_id) as avg_rating,
      (select count(*) from job_assignments ja where ja.transport_partner_id = p_partner_id) as total_jobs
  )
  select
    stats.avg_rating,
    stats.total_jobs,
    coalesce(stats.avg_rating < 4.5, false) as is_blocked,
    not (stats.total_jobs >= 30 and coalesce(stats.avg_rating >= 4.8, false)) as is_probation
  from stats;
$$;

create or replace function public.find_work_jobs(p_job_id uuid default null)
returns table (
  id uuid,
  category text,
  collection_area text,
  delivery_area text,
  collection_outward text,
  delivery_outward text,
  collection_window_start timestamptz,
  collection_window_end timestamptz,
  delivery_window_start timestamptz,
  delivery_window_end timestamptz,
  distance_miles numeric,
  payout_amount numeric,
  customer_price numeric,
  listed_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid;
  v_has_any_approved boolean;
  v_has_motorbike_approved boolean;
  v_category_prefs text[];
  v_access record;
begin
  v_partner_id := app_private.current_partner_id();
  if v_partner_id is null then
    return;
  end if;

  select * into v_access from app_private.partner_job_access(v_partner_id);
  if v_access.is_blocked then
    return;
  end if;

  select exists (
    select 1 from vehicles v
    where v.transport_partner_id = v_partner_id and v.approval_status = 'approved'
  ) into v_has_any_approved;

  select exists (
    select 1 from vehicles v
    where v.transport_partner_id = v_partner_id
      and v.approval_status = 'approved'
      and v.can_transport_motorbikes
  ) into v_has_motorbike_approved;

  select tp.category_preferences into v_category_prefs
  from transport_partners tp where tp.id = v_partner_id;

  return query
  select
    j.id,
    j.category,
    app_private.postcode_area(j.collection_postcode),
    app_private.postcode_area(j.delivery_postcode),
    app_private.postcode_outward(j.collection_postcode),
    app_private.postcode_outward(j.delivery_postcode),
    j.collection_window_start,
    j.collection_window_end,
    j.delivery_window_start,
    j.delivery_window_end,
    j.distance_miles,
    j.payout_amount,
    j.customer_price,
    j.listed_at
  from jobs j
  where j.matching_status = 'listed'
    and (j.allocation_method = 'click_claim' or j.allocation_method is null)
    and (p_job_id is null or j.id = p_job_id)
    and (
      case when j.category = 'motorbike-transport'
        then v_has_motorbike_approved
        else v_has_any_approved
      end
    )
    and (array_length(v_category_prefs, 1) is null or j.category = any (v_category_prefs))
    and (not v_access.is_probation or j.category = 'single-item-transport')
  order by coalesce(j.collection_window_start, j.listed_at) asc;
end;
$$;

revoke execute on function public.find_work_jobs(uuid) from public;
revoke execute on function public.find_work_jobs(uuid) from anon;
grant execute on function public.find_work_jobs(uuid) to authenticated;

create or replace function public.find_auction_jobs()
returns table (
  id uuid,
  category text,
  collection_area text,
  delivery_area text,
  collection_window_start timestamptz,
  collection_window_end timestamptz,
  delivery_window_start timestamptz,
  delivery_window_end timestamptz,
  distance_miles numeric,
  customer_price numeric,
  listed_at timestamptz,
  bidding_closes_at timestamptz,
  bid_count bigint,
  lowest_bid_amount numeric,
  my_bid_amount numeric,
  my_bid_status bid_status,
  my_bid_vehicle_id uuid
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid;
  v_has_any_approved boolean;
  v_has_motorbike_approved boolean;
  v_category_prefs text[];
  v_access record;
begin
  v_partner_id := app_private.current_partner_id();
  if v_partner_id is null then
    return;
  end if;

  select * into v_access from app_private.partner_job_access(v_partner_id);
  if v_access.is_blocked then
    return;
  end if;

  select exists (
    select 1 from vehicles v
    where v.transport_partner_id = v_partner_id and v.approval_status = 'approved'
  ) into v_has_any_approved;

  select exists (
    select 1 from vehicles v
    where v.transport_partner_id = v_partner_id
      and v.approval_status = 'approved'
      and v.can_transport_motorbikes
  ) into v_has_motorbike_approved;

  select tp.category_preferences into v_category_prefs
  from transport_partners tp where tp.id = v_partner_id;

  return query
  select
    j.id,
    j.category,
    app_private.postcode_area(j.collection_postcode),
    app_private.postcode_area(j.delivery_postcode),
    j.collection_window_start,
    j.collection_window_end,
    j.delivery_window_start,
    j.delivery_window_end,
    j.distance_miles,
    j.customer_price,
    j.listed_at,
    j.bidding_closes_at,
    (select count(*) from bids b where b.job_id = j.id and b.status = 'pending'),
    (select min(b.amount) from bids b where b.job_id = j.id and b.status = 'pending'),
    mb.amount,
    mb.status,
    mb.vehicle_id
  from jobs j
  left join bids mb on mb.job_id = j.id and mb.transport_partner_id = v_partner_id
  where j.allocation_method = 'auction'
    and j.matching_status = 'listed'
    and j.bidding_closes_at is not null
    and (
      case when j.category = 'motorbike-transport'
        then v_has_motorbike_approved
        else v_has_any_approved
      end
    )
    and (array_length(v_category_prefs, 1) is null or j.category = any (v_category_prefs))
    and (not v_access.is_probation or j.category = 'single-item-transport')
  order by coalesce(j.bidding_closes_at, j.listed_at) asc;
end;
$$;

revoke execute on function public.find_auction_jobs() from public;
revoke execute on function public.find_auction_jobs() from anon;
grant execute on function public.find_auction_jobs() to authenticated;

create or replace function public.find_express_interest_jobs()
returns table (
  id uuid,
  category text,
  collection_area text,
  delivery_area text,
  collection_window_start timestamptz,
  collection_window_end timestamptz,
  distance_miles numeric,
  customer_price numeric,
  payout_amount numeric,
  listed_at timestamptz,
  interest_count bigint,
  my_interest_status text
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid;
  v_has_any_approved boolean;
  v_has_motorbike_approved boolean;
  v_access record;
begin
  v_partner_id := app_private.current_partner_id();
  if v_partner_id is null then
    return;
  end if;

  select * into v_access from app_private.partner_job_access(v_partner_id);
  if v_access.is_blocked then
    return;
  end if;

  select exists (
    select 1 from vehicles v where v.transport_partner_id = v_partner_id and v.approval_status = 'approved'
  ) into v_has_any_approved;

  select exists (
    select 1 from vehicles v
    where v.transport_partner_id = v_partner_id and v.approval_status = 'approved' and v.can_transport_motorbikes
  ) into v_has_motorbike_approved;

  return query
  select
    j.id,
    j.category,
    app_private.postcode_area(j.collection_postcode),
    app_private.postcode_area(j.delivery_postcode),
    j.collection_window_start,
    j.collection_window_end,
    j.distance_miles,
    j.customer_price,
    j.payout_amount,
    j.listed_at,
    (select count(*) from job_interests ji where ji.job_id = j.id),
    mi.status
  from jobs j
  left join job_interests mi on mi.job_id = j.id and mi.transport_partner_id = v_partner_id
  where j.allocation_method = 'express_interest'
    and j.matching_status = 'listed'
    and (
      case when j.category = 'motorbike-transport' then v_has_motorbike_approved else v_has_any_approved end
    )
    and (not v_access.is_probation or j.category = 'single-item-transport')
  order by j.listed_at asc;
end;
$$;

revoke execute on function public.find_express_interest_jobs() from public;
revoke execute on function public.find_express_interest_jobs() from anon;
grant execute on function public.find_express_interest_jobs() to authenticated;

-- Surface the partner's own access tier honestly on Insights, plus
-- Express Pay eligibility (same 4.5 threshold, named separately in case
-- the two ever diverge). Adding columns changes the RETURNS TABLE shape,
-- so DROP+CREATE (grants re-verified below).
drop function public.my_performance_summary();

create function public.my_performance_summary()
returns table (
  member_since timestamptz,
  total_jobs bigint,
  jobs_last_30_days bigint,
  average_rating numeric,
  rating_count bigint,
  deallocation_count bigint,
  deallocation_total_amount numeric,
  active_performance_plan boolean,
  booster_eligible boolean,
  job_access_blocked boolean,
  job_access_probation boolean,
  jobs_until_full_access bigint,
  express_pay_eligible boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid;
  v_access record;
begin
  v_partner_id := app_private.current_partner_id();
  if v_partner_id is null then
    return;
  end if;

  select * into v_access from app_private.partner_job_access(v_partner_id);

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
    ),
    v_access.is_blocked,
    v_access.is_probation,
    greatest(0, 30 - v_access.total_jobs),
    coalesce(v_access.avg_rating >= 4.5, false)
  from transport_partners tp
  where tp.id = v_partner_id;
end;
$$;

revoke execute on function public.my_performance_summary() from public;
revoke execute on function public.my_performance_summary() from anon;
grant execute on function public.my_performance_summary() to authenticated;
