-- find_auction_jobs previously omitted the calling partner's own
-- my_bid_vehicle_id. Without it, the "Update bid" form in the Bidding tab
-- had no way to preselect the vehicle a partner already committed to, so
-- reopening the form to tweak just the amount could silently swap the
-- vehicle to whatever sorted first instead. Add the column so the UI can
-- preselect correctly. Return shape changes, so this needs DROP + CREATE
-- rather than CREATE OR REPLACE (Postgres won't let OR REPLACE add a column
-- to a `returns table` function).
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
    mb.amount,
    mb.status,
    mb.vehicle_id
  from jobs j
  left join bids mb on mb.job_id = j.id and mb.transport_partner_id = v_partner_id
  where j.allocation_method = 'auction'
    and j.matching_status = 'listed'
    and (
      case when j.category = 'motorbike-transport'
        then v_has_motorbike_approved
        else v_has_any_approved
      end
    )
  order by coalesce(j.bidding_closes_at, j.listed_at) asc;
end;
$$;

revoke execute on function public.find_auction_jobs() from public;
grant execute on function public.find_auction_jobs() to authenticated;
