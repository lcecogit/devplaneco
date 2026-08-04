-- Reservation-matching: a partner's declared availability (reservations)
-- now actually gets first refusal on compatible jobs, instead of sitting as
-- a calendar note nobody reads. Fires as a BEFORE INSERT trigger on jobs —
-- deliberately not wired into the booking flow's application code (Phase 5's
-- ConfirmStep or Phase 8B's confirm-booking.ts) — so it applies uniformly no
-- matter which code path creates a job row, and neither of those files
-- needs to know this exists.
--
-- Flow: a matching reservation intercepts the job before click_claim/auction
-- ever see it (allocation_method is overridden to 'reservation'), the
-- matched partner gets a job_invitations row to accept/decline, and only on
-- decline or timeout does the job fall back into the normal click_claim/
-- auction pool via the same rule lib/allocation/assign-method.ts uses at
-- booking time (duplicated in SQL as app_private.fallback_allocation_method
-- — there's no shared source of truth across the language boundary, so if
-- AUCTION_PRICE_THRESHOLD_GBP or the forced-category lists ever change in
-- assign-method.ts, this function needs updating by hand to match).

-- ---------------------------------------------------------------------------
-- Schema: job_invitations needs to know which reservation raised it (so
-- accept/decline/expiry can credit or free up the right one) and when it
-- times out.
-- ---------------------------------------------------------------------------

alter table job_invitations add column reservation_id uuid references reservations (id) on delete set null;
alter table job_invitations add column expires_at timestamptz;

create index reservations_status_date_idx on reservations (status, date);
create index job_invitations_status_expires_at_idx on job_invitations (status, expires_at);

-- ---------------------------------------------------------------------------
-- Privacy fix, surfaced by actually using job_invitations for the first
-- time: jobs_select's job_invited_to_current_partner clause (migration
-- 0019) grants a merely-invited partner the FULL row — exact address
-- included — the moment an invitation exists, with no check that they've
-- accepted it. That was latent and harmless while job_invitations was never
-- written to by anything; it's a real leak now that this migration makes it
-- real. Fixed the same way migration 0020 fixed the equivalent "any partner
-- can browse listed jobs" gap: remove the blanket clause from jobs_select
-- entirely. An invited partner sees only the curated, address-free shape via
-- my_job_invitations() below until they accept — accepting creates a
-- job_assignments row, which already grants full access through the
-- existing job_assigned_to_current_user clause. The helper function itself
-- is left in place (harmless, tiny) but nothing references it anymore.
-- ---------------------------------------------------------------------------

drop policy jobs_select on jobs;

create policy jobs_select on jobs
  for select using (
    is_admin()
    or customer_id = app_private.current_customer_id()
    or app_private.job_assigned_to_current_user(jobs.id)
  );

-- ---------------------------------------------------------------------------
-- SQL mirror of lib/allocation/assign-method.ts's pure rule — used when a
-- reservation-matched job needs to fall back into the normal pool (decline
-- or timeout), where there's no browser/server-action in the loop to call
-- the TypeScript version. Keep in sync by hand.
-- ---------------------------------------------------------------------------

create or replace function app_private.fallback_allocation_method(p_category text, p_price numeric)
returns allocation_method
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_category = 'single-item-transport' then 'click_claim'::allocation_method
    when p_category in ('office-relocation', 'international-moves') then 'auction'::allocation_method
    when p_price is not null and p_price >= 150 then 'auction'::allocation_method
    else 'click_claim'::allocation_method
  end;
$$;

-- Re-derives allocation_method/bidding_closes_at for a job that was sent to
-- 'reservation' allocation but the reservation fell through (declined or
-- timed out). No-ops if the job isn't 'listed' any more (e.g. the customer
-- cancelled it while the invitation was pending, or — extremely unlikely,
-- since a 'reservation' job is invisible to find_work_jobs/find_auction_jobs
-- — it was matched some other way already).
create or replace function app_private.fallback_reservation_job(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job jobs;
begin
  select * into v_job from jobs where id = p_job_id and matching_status = 'listed' for update;
  if v_job.id is null then
    return;
  end if;

  update jobs
  set allocation_method = app_private.fallback_allocation_method(v_job.category, v_job.customer_price),
      bidding_closes_at = case
        when app_private.fallback_allocation_method(v_job.category, v_job.customer_price) = 'auction'
          then now() + interval '24 hours'
        else null
      end
  where id = p_job_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- The matcher itself. BEFORE INSERT so it can override NEW directly — the
-- row gets written once, with the final allocation_method, rather than
-- insert-then-update. `for update skip locked` on the reservation candidate
-- is what makes this safe if two jobs land concurrently: first-come-
-- first-served among matching reservations (earliest declared first),
-- skipping any a concurrent insert already grabbed instead of blocking on
-- it.
--
-- Matching is deliberately permissive on any dimension the job doesn't have
-- data for (crew size, volume) — same "don't hide/skip a job over an
-- unpopulated spec field" principle Phase 6 used for vehicle compatibility.
-- Route matching is postcode-*area* level (via the same postcode_area() used
-- for pre-claim privacy elsewhere), not exact postcode — a reservation's
-- start/end postcode is a stated intent ("I'll be around SW postcodes that
-- day"), not a precise pickup point.
--
-- RESPONSE_WINDOW: 2 hours, hardcoded below (no shared constant across the
-- SQL/TypeScript boundary) — long enough a partner doesn't need to be
-- watching the app, short enough a job doesn't sit in limbo. Adjust the
-- `interval '2 hours'` literals here and in expire_job_invitations() below
-- if that ever needs tuning.
-- ---------------------------------------------------------------------------

create or replace function app_private.match_job_to_reservation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation reservations;
begin
  if new.matching_status <> 'listed' then
    return new;
  end if;

  select r.* into v_reservation
  from reservations r
  where r.status = 'pending'
    and r.date = new.collection_window_start::date
    and (
      r.start_postcode is null
      or app_private.postcode_area(r.start_postcode) = app_private.postcode_area(new.collection_postcode)
    )
    and (
      r.end_postcode is null
      or app_private.postcode_area(r.end_postcode) = app_private.postcode_area(new.delivery_postcode)
    )
    and (r.team_size is null or new.crew_size is null or new.crew_size <= r.team_size)
    and (r.van_space_m3 is null or new.total_volume_m3 is null or new.total_volume_m3 <= r.van_space_m3)
    and (r.min_price is null or new.customer_price is null or new.customer_price >= r.min_price)
    and (r.max_price is null or new.customer_price is null or new.customer_price <= r.max_price)
  order by r.created_at asc
  limit 1
  for update skip locked;

  if v_reservation.id is null then
    return new;
  end if;

  insert into job_invitations (job_id, transport_partner_id, reservation_id, status, expires_at)
  values (new.id, v_reservation.transport_partner_id, v_reservation.id, 'pending', now() + interval '2 hours');

  update reservations set status = 'partially_matched' where id = v_reservation.id;

  new.allocation_method := 'reservation';
  new.bidding_closes_at := null;

  return new;
end;
$$;

create trigger jobs_match_reservation_trigger
  before insert on jobs
  for each row execute function app_private.match_job_to_reservation();

-- ---------------------------------------------------------------------------
-- Partner-facing: browse own invitations (address-free until accepted, same
-- shape as find_work_jobs/find_auction_jobs), and accept/decline.
-- ---------------------------------------------------------------------------

create or replace function public.my_job_invitations()
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

-- Atomic accept/decline. Re-checks expiry itself rather than trusting the
-- client's clock — a partner clicking Accept a moment after the window
-- closed (but before the cron sweep has run) must still be rejected.
create or replace function public.respond_to_job_invitation(
  p_invitation_id uuid,
  p_accept boolean,
  p_vehicle_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid;
  v_invitation job_invitations;
  v_job jobs;
begin
  v_partner_id := app_private.current_partner_id();
  if v_partner_id is null then
    raise exception 'only a transport partner can respond to an invitation';
  end if;

  select * into v_invitation
  from job_invitations
  where id = p_invitation_id and transport_partner_id = v_partner_id
  for update;

  if v_invitation.id is null then
    raise exception 'invitation not found';
  end if;

  if v_invitation.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'This invitation is no longer pending.');
  end if;

  if v_invitation.expires_at is not null and v_invitation.expires_at <= now() then
    update job_invitations set status = 'expired' where id = v_invitation.id;
    if v_invitation.reservation_id is not null then
      update reservations set status = 'pending'
      where id = v_invitation.reservation_id and status = 'partially_matched';
    end if;
    perform app_private.fallback_reservation_job(v_invitation.job_id);
    return jsonb_build_object('ok', false, 'reason', 'This invitation has expired.');
  end if;

  select * into v_job from jobs where id = v_invitation.job_id;

  if not p_accept then
    update job_invitations set status = 'declined' where id = v_invitation.id;
    if v_invitation.reservation_id is not null then
      update reservations set status = 'pending'
      where id = v_invitation.reservation_id and status = 'partially_matched';
    end if;
    perform app_private.fallback_reservation_job(v_invitation.job_id);
    return jsonb_build_object('ok', true, 'accepted', false);
  end if;

  if p_vehicle_id is null or not exists (
    select 1 from vehicles
    where id = p_vehicle_id
      and transport_partner_id = v_partner_id
      and approval_status = 'approved'
      and (v_job.category is distinct from 'motorbike-transport' or can_transport_motorbikes)
  ) then
    raise exception 'select an approved, compatible vehicle to accept this job';
  end if;

  update jobs
  set matching_status = 'matched', status = 'assigned'
  where id = v_job.id and matching_status = 'listed'
  returning * into v_job;

  if v_job.id is null then
    update job_invitations set status = 'expired' where id = v_invitation.id;
    return jsonb_build_object('ok', false, 'reason', 'This job is no longer available.');
  end if;

  update job_invitations set status = 'accepted' where id = v_invitation.id;

  if v_invitation.reservation_id is not null then
    update reservations set status = 'fully_booked' where id = v_invitation.reservation_id;
  end if;

  insert into job_assignments (job_id, transport_partner_id, vehicle_id, driver_id)
  values (v_job.id, v_partner_id, p_vehicle_id, null);

  return jsonb_build_object('ok', true, 'accepted', true, 'job_id', v_job.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Scheduled expiry sweep, same shape and cadence as close_expired_auctions
-- (migration 0025): every 5 minutes, expire anything unanswered past its
-- window and fall it back into the normal pool.
-- ---------------------------------------------------------------------------

create or replace function public.expire_job_invitations()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invitation record;
begin
  for v_invitation in
    select id, job_id, reservation_id from job_invitations
    where status = 'pending' and expires_at is not null and expires_at <= now()
    for update skip locked
  loop
    update job_invitations set status = 'expired' where id = v_invitation.id;

    if v_invitation.reservation_id is not null then
      update reservations set status = 'pending'
      where id = v_invitation.reservation_id and status = 'partially_matched';
    end if;

    perform app_private.fallback_reservation_job(v_invitation.job_id);
  end loop;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-job-invitations') then
    perform cron.unschedule('expire-job-invitations');
  end if;
end;
$$;

select cron.schedule(
  'expire-job-invitations',
  '*/5 * * * *',
  $$select public.expire_job_invitations();$$
);

-- ---------------------------------------------------------------------------
-- Grants. This project defaults new public-schema functions to EXECUTE for
-- anon/PUBLIC (migrations 0021/0022/0026-0029's recurring lesson) — revoke
-- both explicitly up front rather than discovering a leak via the advisor.
-- expire_job_invitations is cron/internal-only: no client ever calls it.
-- ---------------------------------------------------------------------------

revoke execute on function public.my_job_invitations() from public;
revoke execute on function public.my_job_invitations() from anon;
grant execute on function public.my_job_invitations() to authenticated;

revoke execute on function public.respond_to_job_invitation(uuid, boolean, uuid) from public;
revoke execute on function public.respond_to_job_invitation(uuid, boolean, uuid) from anon;
grant execute on function public.respond_to_job_invitation(uuid, boolean, uuid) to authenticated;

revoke execute on function public.expire_job_invitations() from public, anon, authenticated;
