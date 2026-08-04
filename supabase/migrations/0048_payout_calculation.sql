-- Payout/commission calculation — flagged as a gap since Phase 6:
-- payout_amount has only ever been set for auction jobs (the winning bid,
-- in close_expired_auctions()). Every other allocation method (click_claim,
-- reservation, express_interest) has always inserted with payout_amount
-- null, so Find Work's `payout ?? customer_price` fallback has been
-- showing partners the full customer price as if it were their earnings.
--
-- COMMISSION RATE: 25% platform commission / 75% partner payout. Researched
-- against AnyVan's own public numbers before picking this, since it's a
-- real money figure, not a UI judgment call: no single authoritative
-- percentage is published for independent Transport Partners specifically.
-- A general summary describes a 60/40 (platform/driver) split for AnyVan's
-- in-house driver network; a driver-advocacy petition cites a harsher
-- 70-75/25-30 split for that same in-house group. Both describe employed-
-- style drivers, not independent partners who bid their own price the way
-- this project's auction jobs already work — so 25% commission (partner
-- keeps 75%) was chosen at the generous end of the researched range,
-- confirmed with the project owner rather than silently picked.
--
-- SCOPE: this only prices non-auction jobs. Auction jobs never get a
-- formula-derived payout_amount — the winning bid IS the payout, already
-- correct since Phase 6b, and a partner's whole point in that flow is
-- setting their own price rather than accepting a fixed cut.
create or replace function app_private.set_default_payout_amount()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.payout_amount is null
    and new.customer_price is not null
    and new.allocation_method is distinct from 'auction'
  then
    new.payout_amount := round(new.customer_price * 0.75, 2);
  end if;

  return new;
end;
$$;

-- BEFORE INSERT, named to sort after jobs_match_reservation_trigger
-- (migration 0035) alphabetically — Postgres runs same-event BEFORE
-- triggers in trigger-name order, and this one needs to see
-- NEW.allocation_method AFTER a reservation match may have overridden it
-- to 'reservation', not the value assign-method.ts originally computed.
create trigger jobs_set_payout_amount_trigger
  before insert on jobs
  for each row execute function app_private.set_default_payout_amount();

-- One-time backfill for existing rows (test data and anything created
-- before this migration) — a formula that only applies going forward would
-- leave every already-listed non-auction job showing customer_price as its
-- payout, the exact bug this migration fixes.
update jobs
set payout_amount = round(customer_price * 0.75, 2)
where payout_amount is null
  and customer_price is not null
  and allocation_method is distinct from 'auction';

-- Fix a real gap in migration 0043's journey detection: an office-
-- relocation or international-moves job (FORCE_AUCTION_CATEGORIES in
-- assign-method.ts) that turns out to be a multi-stop journey gets flipped
-- from 'auction' to 'express_interest' here — but express_interest jobs
-- never go through bidding, so without this, payout_amount would stay
-- permanently null for that job (skipped at insert for being 'auction' at
-- the time, then reassigned to a method that never sets it either).
create or replace function app_private.mark_journey_express_interest()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job_id uuid;
  v_stop_count int;
begin
  for v_job_id in select distinct job_id from new_stops loop
    select count(*) into v_stop_count from job_stops where job_id = v_job_id;

    if v_stop_count > 2 then
      update jobs
      set allocation_method = 'express_interest',
          bidding_closes_at = null,
          payout_amount = coalesce(payout_amount, round(customer_price * 0.75, 2))
      where id = v_job_id
        and matching_status = 'listed'
        and allocation_method in ('click_claim', 'auction');
    end if;
  end loop;

  return null;
end;
$$;

-- Express Interest and Invitations both told a partner "not your payout"
-- next to the customer's price, because payout_amount genuinely wasn't
-- known pre-match. It is now (flat 75% of customer_price, set at insert)
-- — DROP+CREATE since both return tables gain a column.

drop function public.find_express_interest_jobs();

create function public.find_express_interest_jobs()
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
  order by j.listed_at asc;
end;
$$;

revoke execute on function public.find_express_interest_jobs() from public;
revoke execute on function public.find_express_interest_jobs() from anon;
grant execute on function public.find_express_interest_jobs() to authenticated;

drop function public.my_job_invitations();

create function public.my_job_invitations()
returns table (
  invitation_id uuid,
  job_id uuid,
  category text,
  collection_area text,
  delivery_area text,
  collection_window_start timestamptz,
  collection_window_end timestamptz,
  distance_miles numeric,
  customer_price numeric,
  payout_amount numeric,
  status invitation_status,
  expires_at timestamptz,
  created_at timestamptz,
  via_reservation boolean
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
    ji.id,
    j.id,
    j.category,
    app_private.postcode_area(j.collection_postcode),
    app_private.postcode_area(j.delivery_postcode),
    j.collection_window_start,
    j.collection_window_end,
    j.distance_miles,
    j.customer_price,
    j.payout_amount,
    ji.status,
    ji.expires_at,
    ji.created_at,
    ji.reservation_id is not null
  from job_invitations ji
  join jobs j on j.id = ji.job_id
  where ji.transport_partner_id = v_partner_id
  order by ji.created_at desc;
end;
$$;

revoke execute on function public.my_job_invitations() from public;
revoke execute on function public.my_job_invitations() from anon;
grant execute on function public.my_job_invitations() to authenticated;
