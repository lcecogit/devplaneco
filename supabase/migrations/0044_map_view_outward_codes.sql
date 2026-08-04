-- Map view: the earlier privacy/precision question (paused, never
-- resumed) is resolved here the same way Book Now's category-filter
-- interpretation was — a judgment call, flagged clearly, changeable later.
-- Decision: outward-code precision (e.g. "SW1A" instead of just "SW") for
-- map pins specifically. Still nowhere near a full address or exact
-- postcode — an outward code covers a real neighbourhood, not one
-- building — but precise enough that pins actually spread out instead of
-- stacking on one huge area-wide point. Added as NEW columns alongside the
-- existing area-level ones (find_work_jobs' collection_area/delivery_area
-- stay exactly as they were) rather than replacing anything, so this is
-- additive and non-breaking for every existing caller.
create or replace function app_private.postcode_outward(postcode text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select upper(trim(regexp_replace(coalesce(postcode, ''), '\s*[A-Za-z0-9]{3}$', '')));
$$;

drop function public.find_work_jobs(uuid);

create function public.find_work_jobs(p_job_id uuid default null)
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
  order by coalesce(j.collection_window_start, j.listed_at) asc;
end;
$$;

revoke execute on function public.find_work_jobs(uuid) from public;
revoke execute on function public.find_work_jobs(uuid) from anon;
grant execute on function public.find_work_jobs(uuid) to authenticated;
