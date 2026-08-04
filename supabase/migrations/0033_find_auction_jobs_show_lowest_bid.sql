-- Matches AnyVan's real transparency model (confirmed via their live partner
-- dashboard screenshots): browsing partners see the current lowest pending
-- bid amount on an auction, not just how many bids exist. This reverses the
-- original Phase 6b brief's "never show amounts" choice — a deliberate
-- design decision made explicitly, not a bug fix. bid_count stays as-is;
-- lowest_bid_amount is the market-wide floor (may be the caller's own bid
-- if they're currently winning — that's expected, same as AnyVan's).
--
-- Return shape changes (new column), so this needs DROP + CREATE rather
-- than CREATE OR REPLACE — same reason as migration 0027.
drop function public.find_auction_jobs();

create function public.find_auction_jobs()
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
  my_bid_status public.bid_status,
  my_bid_vehicle_id uuid
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
    select 1 from vehicles v
    where v.transport_partner_id = v_partner_id and v.approval_status = 'approved'
  ) into v_has_any_approved;

  select exists (
    select 1 from vehicles v
    where v.transport_partner_id = v_partner_id
      and v.approval_status = 'approved'
      and v.can_transport_motorbikes
  ) into v_has_motorbike_approved;

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
  order by coalesce(j.bidding_closes_at, j.listed_at) asc;
end;
$$;

-- Learned the hard way across 0021/0022 and 0026/0027/0028/0029: DROP +
-- CREATE re-triggers both the implicit PUBLIC grant from plain CREATE
-- FUNCTION and this project's `alter default privileges` grant straight to
-- anon. Revoke both explicitly, verified after with has_function_privilege
-- rather than assumed.
revoke execute on function public.find_auction_jobs() from public;
revoke execute on function public.find_auction_jobs() from anon;
grant execute on function public.find_auction_jobs() to authenticated;
