-- Alerts: saved_searches and its RLS already existed fully (Phase 2, fully
-- partner-owned CRUD via saved_searches_select/insert/update/delete), with
-- a flexible `filters jsonb` column — no schema change needed for CRUD.
-- Only new piece is the matching read path: which currently-listed jobs
-- (compatible with this partner's fleet, same rule as find_work_jobs) match
-- ANY of the partner's saved searches. filters keys used by the app:
-- {categories: string[], postcodeArea: string, minPrice: number,
-- maxPrice: number} — every key optional, absence means "no filter on that
-- dimension" (same "don't hide over an unpopulated field" principle used
-- throughout this project).
create or replace function public.alert_matches()
returns table (
  job_id uuid,
  category text,
  collection_area text,
  delivery_area text,
  collection_window_start timestamptz,
  collection_window_end timestamptz,
  distance_miles numeric,
  customer_price numeric,
  allocation_method allocation_method,
  bidding_closes_at timestamptz,
  bid_count bigint,
  listed_at timestamptz,
  matched_search_name text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid;
  v_has_any_approved boolean;
  v_has_motorbike_approved boolean;
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

  if not v_has_any_approved then
    return;
  end if;

  return query
  select distinct on (j.id)
    j.id,
    j.category,
    app_private.postcode_area(j.collection_postcode),
    app_private.postcode_area(j.delivery_postcode),
    j.collection_window_start,
    j.collection_window_end,
    j.distance_miles,
    j.customer_price,
    j.allocation_method,
    j.bidding_closes_at,
    (select count(*) from bids b where b.job_id = j.id and b.status = 'pending'),
    j.listed_at,
    s.name
  from jobs j
  join saved_searches s on s.transport_partner_id = v_partner_id
  where j.matching_status = 'listed'
    and j.allocation_method in ('click_claim', 'auction')
    and (
      case when j.category = 'motorbike-transport' then v_has_motorbike_approved else v_has_any_approved end
    )
    and (
      not (s.filters ? 'categories')
      or jsonb_array_length(s.filters -> 'categories') = 0
      or s.filters -> 'categories' ? j.category
    )
    and (
      not (s.filters ? 'postcodeArea')
      or s.filters ->> 'postcodeArea' = ''
      or app_private.postcode_area(j.collection_postcode) = upper(s.filters ->> 'postcodeArea')
      or app_private.postcode_area(j.delivery_postcode) = upper(s.filters ->> 'postcodeArea')
    )
    and (
      not (s.filters ? 'minPrice') or j.customer_price is null
      or j.customer_price >= (s.filters ->> 'minPrice')::numeric
    )
    and (
      not (s.filters ? 'maxPrice') or j.customer_price is null
      or j.customer_price <= (s.filters ->> 'maxPrice')::numeric
    )
  order by j.id, j.listed_at desc;
end;
$$;

revoke execute on function public.alert_matches() from public;
revoke execute on function public.alert_matches() from anon;
grant execute on function public.alert_matches() to authenticated;
