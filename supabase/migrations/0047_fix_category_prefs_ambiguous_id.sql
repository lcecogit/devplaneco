-- Fix from migration 0046: all three job-browsing RPCs return an `id`
-- output column, and PL/pgSQL implicitly exposes RETURNS TABLE column names
-- as variables inside the function body — so `where id = v_partner_id`
-- against transport_partners collided with the function's own `id` OUT
-- parameter ("column reference \"id\" is ambiguous"), caught live testing
-- Find Work with a real category preference set. Same fix in all three:
-- alias the table and qualify the column.
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
begin
  v_partner_id := app_private.current_partner_id();
  if v_partner_id is null then
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
begin
  v_partner_id := app_private.current_partner_id();
  if v_partner_id is null then
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
  v_category_prefs text[];
begin
  v_partner_id := app_private.current_partner_id();
  if v_partner_id is null then
    return;
  end if;

  select exists (
    select 1 from vehicles v where v.transport_partner_id = v_partner_id and v.approval_status = 'approved'
  ) into v_has_any_approved;

  select exists (
    select 1 from vehicles v
    where v.transport_partner_id = v_partner_id and v.approval_status = 'approved' and v.can_transport_motorbikes
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
    j.distance_miles,
    j.customer_price,
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
    and (array_length(v_category_prefs, 1) is null or j.category = any (v_category_prefs))
  order by j.listed_at asc;
end;
$$;

revoke execute on function public.find_express_interest_jobs() from public;
revoke execute on function public.find_express_interest_jobs() from anon;
grant execute on function public.find_express_interest_jobs() to authenticated;
