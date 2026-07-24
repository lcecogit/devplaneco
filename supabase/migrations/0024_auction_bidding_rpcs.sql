-- Phase 6b: auction browsing/bidding read+write paths, plus a fix to keep
-- Find Work (click-claim) and the new auction browse mutually exclusive now
-- that jobs.allocation_method is actually set at booking time.

-- find_work_jobs previously showed every 'listed' job regardless of
-- allocation_method (fine when nothing ever set it). Now that booking
-- confirmation auto-assigns 'click_claim' or 'auction' (see
-- lib/allocation/assign-method.ts), an auction job would otherwise also
-- show up here and be claimable outside its bidding process. Restrict to
-- click_claim, plus null for the one pre-existing test job booked before
-- this migration (booked with no allocation_method at all) so it doesn't
-- silently disappear.
create or replace function public.find_work_jobs(p_job_id uuid default null)
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

-- Auction browse. Same SECURITY DEFINER + fleet-compatibility shape as
-- find_work_jobs (see migration 0020's comment for why this can't just be a
-- jobs_select policy), scoped to 'auction' jobs still open for bidding.
-- Surfaces a competitive signal (how many pending bids exist) without
-- leaking amounts, and the calling partner's own pending bid so the UI can
-- show "you're in" / let them revise it, per the phase brief ("don't show
-- other partners' bid amounts, only the count").
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
  my_bid_amount numeric,
  my_bid_status public.bid_status
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
    mb.status
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

-- A partner's full bid history, including jobs no longer 'listed' (won/lost
-- once the closing function has run) — find_auction_jobs only shows still-
-- open auctions, so this is the only place a partner can see a resolved
-- won/lost outcome. Deliberately not gated by fleet compatibility: it's a
-- partner's own record of what they bid, not a browse surface.
create or replace function public.my_bids()
returns table (
  bid_id uuid,
  job_id uuid,
  category text,
  collection_area text,
  delivery_area text,
  amount numeric,
  status public.bid_status,
  submitted_at timestamptz,
  matching_status public.matching_status
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    b.id,
    j.id,
    j.category,
    app_private.postcode_area(j.collection_postcode),
    app_private.postcode_area(j.delivery_postcode),
    b.amount,
    b.status,
    b.submitted_at,
    j.matching_status
  from bids b
  join jobs j on j.id = b.job_id
  where b.transport_partner_id = app_private.current_partner_id()
  order by b.submitted_at desc;
$$;

-- Bid submission/update, atomic and enforced server-side (not just in the
-- UI): `select ... for update` locks the job row for the duration of this
-- transaction, which both serializes concurrent bid writes on the same job
-- and — critically — blocks until close_expired_auctions() (migration 0025)
-- releases its own lock on the same row if a close is in progress, so a bid
-- can never sneak in after a job has actually been resolved even if it's
-- submitted right at the edge of the window. The ON CONFLICT upsert is what
-- lets a partner revise their bid any time before the deadline.
create or replace function public.submit_bid(p_job_id uuid, p_vehicle_id uuid, p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid;
  v_job jobs;
  v_bid_id uuid;
begin
  v_partner_id := app_private.current_partner_id();
  if v_partner_id is null then
    raise exception 'only a transport partner can submit a bid';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'bid amount must be greater than zero';
  end if;

  select * into v_job from jobs where id = p_job_id for update;
  if not found then
    raise exception 'job not found';
  end if;

  if v_job.allocation_method is distinct from 'auction' or v_job.matching_status <> 'listed' then
    raise exception 'this job is not open for bidding';
  end if;

  if v_job.bidding_closes_at is null or v_job.bidding_closes_at <= now() then
    raise exception 'bidding has closed for this job';
  end if;

  if not exists (
    select 1 from vehicles
    where id = p_vehicle_id
      and transport_partner_id = v_partner_id
      and approval_status = 'approved'
      and (v_job.category is distinct from 'motorbike-transport' or can_transport_motorbikes)
  ) then
    raise exception 'selected vehicle is not an approved, compatible vehicle for this partner';
  end if;

  insert into bids (job_id, transport_partner_id, vehicle_id, amount, status, submitted_at)
  values (p_job_id, v_partner_id, p_vehicle_id, p_amount, 'pending', now())
  on conflict (job_id, transport_partner_id)
  do update set
    vehicle_id = excluded.vehicle_id,
    amount = excluded.amount,
    status = 'pending',
    submitted_at = now()
  returning id into v_bid_id;

  return jsonb_build_object('bid_id', v_bid_id);
end;
$$;

grant execute on function public.find_auction_jobs() to authenticated;
grant execute on function public.my_bids() to authenticated;
grant execute on function public.submit_bid(uuid, uuid, numeric) to authenticated;

-- This project grants EXECUTE on new functions directly to anon via `alter
-- default privileges` (see migration 0022's note) — revoke it explicitly by
-- role rather than relying on `revoke ... from public`.
revoke execute on function public.find_auction_jobs() from anon;
revoke execute on function public.my_bids() from anon;
revoke execute on function public.submit_bid(uuid, uuid, numeric) from anon;
