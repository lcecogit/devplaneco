-- Watching: job_watchlist and its RLS already existed fully (Phase 2), just
-- never had a UI. Only new piece needed is a curated read path — a watched
-- job's matching_status can be 'listed' (still click_claim/auction, not
-- assigned to this partner), so a plain `jobs` select won't work post-0020;
-- same SECURITY DEFINER pattern as find_work_jobs/my_bids.
create or replace function public.my_watchlist()
returns table (
  watchlist_id uuid,
  job_id uuid,
  category text,
  collection_area text,
  delivery_area text,
  collection_window_start timestamptz,
  collection_window_end timestamptz,
  distance_miles numeric,
  customer_price numeric,
  allocation_method allocation_method,
  matching_status matching_status,
  bidding_closes_at timestamptz,
  bid_count bigint,
  created_at timestamptz
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
    jw.id,
    j.id,
    j.category,
    app_private.postcode_area(j.collection_postcode),
    app_private.postcode_area(j.delivery_postcode),
    j.collection_window_start,
    j.collection_window_end,
    j.distance_miles,
    j.customer_price,
    j.allocation_method,
    j.matching_status,
    j.bidding_closes_at,
    (select count(*) from bids b where b.job_id = j.id and b.status = 'pending'),
    jw.created_at
  from job_watchlist jw
  join jobs j on j.id = jw.job_id
  where jw.transport_partner_id = v_partner_id
  order by jw.created_at desc;
end;
$$;

revoke execute on function public.my_watchlist() from public;
revoke execute on function public.my_watchlist() from anon;
grant execute on function public.my_watchlist() to authenticated;
