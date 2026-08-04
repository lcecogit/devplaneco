-- Express Interest: the third allocation_method (enum value already
-- existed, unused). AnyVan tags multi-stop "Journey" jobs with Express
-- Interest specifically (confirmed via their Find Work screenshots) —
-- non-binding interest from multiple partners, customer picks one, unlike
-- Click & Claim's first-come-first-served or Auction's price competition.
--
-- WHICH JOBS GET THIS: jobs.work_type exists for this ('single'/'journey'/
-- 'auction') but nothing live ever sets it to 'journey' — confirmed by
-- reading lib/booking/confirm-booking.ts, which always writes 'single'.
-- Rather than edit that file (Phase 8B, actively developed elsewhere, and
-- editing a shared function signature risks that work), this detects a
-- journey structurally: 3+ rows in job_stops means multiple drop/collection
-- points, i.e. a real journey, regardless of what work_type says. That
-- table is populated in a SEPARATE insert right after the jobs insert
-- (confirmed by reading confirm-booking.ts), so the trigger lives on
-- job_stops, not jobs — a jobs-insert trigger would fire before any stops
-- exist. STATEMENT-level with a transition table so a single multi-row
-- stops insert is evaluated once, not once per stop.
--
-- PRIORITY: only overrides allocation_method when it's still click_claim or
-- auction (assign-method.ts's default) — never overrides 'reservation',
-- which is decided earlier (at the jobs insert itself) and should win if
-- both would otherwise apply.
create table job_interests (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  vehicle_id uuid references vehicles (id) on delete set null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'selected', 'not_selected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, transport_partner_id)
);

create index job_interests_job_id_idx on job_interests (job_id);
create index job_interests_transport_partner_id_idx on job_interests (transport_partner_id);

create trigger set_updated_at before update on job_interests
  for each row execute function set_updated_at();

alter table job_interests enable row level security;

create policy job_interests_select on job_interests
  for select using (
    is_admin()
    or transport_partner_id = app_private.current_partner_id()
    or exists (select 1 from jobs j where j.id = job_interests.job_id and j.customer_id = app_private.current_customer_id())
  );

create policy job_interests_insert on job_interests
  for insert with check (transport_partner_id = app_private.current_partner_id());

create policy job_interests_update on job_interests
  for update using (transport_partner_id = app_private.current_partner_id())
  with check (transport_partner_id = app_private.current_partner_id());

create policy job_interests_delete on job_interests
  for delete using (transport_partner_id = app_private.current_partner_id());

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
      set allocation_method = 'express_interest', bidding_closes_at = null
      where id = v_job_id
        and matching_status = 'listed'
        and allocation_method in ('click_claim', 'auction');
    end if;
  end loop;

  return null;
end;
$$;

create trigger job_stops_mark_journey_trigger
  after insert on job_stops
  referencing new table as new_stops
  for each statement execute function app_private.mark_journey_express_interest();

-- Browse: same curated, address-free, fleet-compatible shape as
-- find_work_jobs/find_auction_jobs, scoped to allocation_method =
-- 'express_interest'. Shows how many partners have already expressed
-- interest (not who, or what they said) — same "count only" competitive
-- signal used for auction bids.
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

-- Submit/update interest. Upsert on (job_id, transport_partner_id), matching
-- submit_bid's pattern — a partner can change vehicle/note any time before
-- the customer picks someone. No price, no deadline: unlike auction, this
-- stays open until the customer acts (or the customer cancels the job via
-- the existing cancel-while-listed flow).
create or replace function public.express_interest(p_job_id uuid, p_vehicle_id uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid;
  v_job jobs;
  v_interest_id uuid;
begin
  v_partner_id := app_private.current_partner_id();
  if v_partner_id is null then
    raise exception 'only a transport partner can express interest';
  end if;

  select * into v_job from jobs where id = p_job_id;
  if not found then
    raise exception 'job not found';
  end if;

  if v_job.allocation_method is distinct from 'express_interest' or v_job.matching_status <> 'listed' then
    raise exception 'this job is not open for expressions of interest';
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

  insert into job_interests (job_id, transport_partner_id, vehicle_id, note, status)
  values (p_job_id, v_partner_id, p_vehicle_id, p_note, 'pending')
  on conflict (job_id, transport_partner_id)
  do update set vehicle_id = excluded.vehicle_id, note = excluded.note, status = 'pending'
  returning id into v_interest_id;

  return jsonb_build_object('interest_id', v_interest_id);
end;
$$;

-- Customer-facing: list interested partners (business name + note, never
-- personal contact details — same privacy boundary as everywhere else,
-- lifted only once matched via job_assignments) for a job they own.
create or replace function public.job_interested_partners(p_job_id uuid)
returns table (
  interest_id uuid,
  business_name text,
  note text,
  submitted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid;
begin
  v_customer_id := app_private.current_customer_id();
  if v_customer_id is null then
    return;
  end if;

  if not exists (select 1 from jobs j where j.id = p_job_id and j.customer_id = v_customer_id) then
    return;
  end if;

  return query
  select ji.id, tp.business_name, ji.note, ji.created_at
  from job_interests ji
  join transport_partners tp on tp.id = ji.transport_partner_id
  where ji.job_id = p_job_id and ji.status = 'pending'
  order by ji.created_at asc;
end;
$$;

-- Customer picks a partner. Atomic single UPDATE guarded by
-- matching_status = 'listed', same principle as claim_job — the RETURNING
-- clause is what actually prevents a double-pick if the customer somehow
-- fires this twice.
create or replace function public.select_interested_partner(p_job_id uuid, p_interest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid;
  v_interest job_interests;
  v_updated jobs;
begin
  v_customer_id := app_private.current_customer_id();
  if v_customer_id is null then
    raise exception 'only a customer can select a partner';
  end if;

  if not exists (select 1 from jobs j where j.id = p_job_id and j.customer_id = v_customer_id) then
    raise exception 'job not found';
  end if;

  select * into v_interest from job_interests where id = p_interest_id and job_id = p_job_id and status = 'pending';
  if not found then
    return jsonb_build_object('selected', false, 'reason', 'That partner is no longer available.');
  end if;

  update jobs
  set matching_status = 'matched', status = 'assigned'
  where id = p_job_id and matching_status = 'listed'
  returning * into v_updated;

  if v_updated.id is null then
    return jsonb_build_object('selected', false, 'reason', 'This job is no longer available.');
  end if;

  update job_interests set status = 'selected' where id = v_interest.id;
  update job_interests set status = 'not_selected' where job_id = p_job_id and id <> v_interest.id and status = 'pending';

  insert into job_assignments (job_id, transport_partner_id, vehicle_id, driver_id)
  values (p_job_id, v_interest.transport_partner_id, v_interest.vehicle_id, null);

  return jsonb_build_object('selected', true);
end;
$$;

revoke execute on function public.find_express_interest_jobs() from public;
revoke execute on function public.find_express_interest_jobs() from anon;
grant execute on function public.find_express_interest_jobs() to authenticated;

revoke execute on function public.express_interest(uuid, uuid, text) from public;
revoke execute on function public.express_interest(uuid, uuid, text) from anon;
grant execute on function public.express_interest(uuid, uuid, text) to authenticated;

revoke execute on function public.job_interested_partners(uuid) from public;
revoke execute on function public.job_interested_partners(uuid) from anon;
grant execute on function public.job_interested_partners(uuid) to authenticated;

revoke execute on function public.select_interested_partner(uuid, uuid) from public;
revoke execute on function public.select_interested_partner(uuid, uuid) from anon;
grant execute on function public.select_interested_partner(uuid, uuid) to authenticated;
