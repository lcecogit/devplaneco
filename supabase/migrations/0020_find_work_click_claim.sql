-- Phase 6: "Find Work" click-claim allocation — the first real matching
-- method. Partners browse listed jobs compatible with their approved fleet
-- and claim one on a first-come-first-served basis.
--
-- job_assignments.driver_id is already nullable (no NOT NULL constraint was
-- ever added in 0003) — driver assignment isn't meaningful until the driver
-- app exists, so no schema change is needed there. Verified against both
-- the migration file and the live schema before writing this migration.

-- Extracts the UK postcode "area" (the leading 1-2 letters, e.g. "SW1A 1AA"
-- -> "SW") so Find Work can show a general location without ever handling
-- (or exposing) a precise postcode or full address pre-claim.
create or replace function app_private.postcode_area(postcode text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select upper(substring(regexp_replace(coalesce(postcode, ''), '\s', '', 'g') from '^[A-Za-z]{1,2}'));
$$;

-- Lets a customer read the business_name of a partner once that partner is
-- matched to one of their jobs (transport_partners otherwise has no
-- customer-facing read policy at all — see 0006's note). SECURITY DEFINER +
-- querying job_assignments/jobs directly (bypassing their RLS) follows the
-- same pattern as 0019's job_assigned_to_current_user, rather than a
-- correlated subquery embedded in the new policy, to avoid re-triggering
-- those tables' own RLS from inside this one.
create or replace function app_private.transport_partner_matched_to_current_customer(target_partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from job_assignments ja
    join jobs j on j.id = ja.job_id
    where ja.transport_partner_id = target_partner_id
      and j.customer_id = app_private.current_customer_id()
  );
$$;

grant execute on function app_private.transport_partner_matched_to_current_customer(uuid) to authenticated;

create policy transport_partners_select_matched on transport_partners
  for select using (app_private.transport_partner_matched_to_current_customer(id));

-- jobs_select previously let any partner browse the full row (including
-- collection_address/delivery_address) of every 'listed' job directly via
-- PostgREST. Browsing now happens exclusively through find_work_jobs()
-- below, which returns only a curated, address-free shape and only for
-- jobs compatible with the caller's approved fleet. Removing the blanket
-- "listed" clause here closes that off at the RLS layer — not just in the
-- UI — so a partner can no longer pull full addresses for jobs they haven't
-- claimed by querying the table directly.
drop policy jobs_select on jobs;

create policy jobs_select on jobs
  for select using (
    is_admin()
    or customer_id = app_private.current_customer_id()
    or app_private.job_assigned_to_current_user(jobs.id)
    or app_private.job_invited_to_current_partner(jobs.id)
  );

-- Find Work read path. SECURITY DEFINER so it can see 'listed' jobs across
-- all customers (no longer possible via jobs_select above) while itself
-- enforcing the two things that matter: (1) only 'listed' jobs, (2) only
-- ones compatible with a vehicle the calling partner actually has approved.
--
-- Compatibility: the Phase 5 quote flow only ever sets jobs.category to one
-- of the fixed service slugs — there's no payload/volume/length/tail-lift
-- requirement captured on the job yet, and vehicle_type/vehicle_category are
-- free text a partner typed in, so they can't be reliably matched against a
-- job category. can_transport_motorbikes is the one structured field that
-- actually corresponds to a job category (motorbike-transport), so that's
-- the one hard requirement enforced; every other category falls back to
-- "partner has at least one approved vehicle" per the phase brief ("don't
-- block jobs from showing just because a spec field is empty").
--
-- p_job_id narrows to a single job (used by the detail page) without a
-- second near-identical function.
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

grant execute on function public.find_work_jobs(uuid) to authenticated;

-- Atomic claim. The UPDATE ... WHERE matching_status = 'listed' RETURNING is
-- the whole safety mechanism: Postgres row-locks the target row for the
-- first concurrent UPDATE to reach it, the second blocks, and once the
-- first commits the second re-evaluates WHERE against the now-committed
-- 'matched' status and matches zero rows. There's no separate "check then
-- write" step for a race to land in between. SECURITY DEFINER because this
-- needs to write job_assignments/jobs directly rather than relying on
-- row-ownership RLS (there's no ownership yet at claim time) — every
-- authorization check that RLS would normally provide is done explicitly
-- inside the function instead.
create or replace function public.claim_job(p_job_id uuid, p_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid;
  v_job_category text;
  v_updated jobs;
begin
  v_partner_id := app_private.current_partner_id();
  if v_partner_id is null then
    raise exception 'only a transport partner can claim a job';
  end if;

  select category into v_job_category from jobs where id = p_job_id;
  if not found then
    raise exception 'job not found';
  end if;

  if not exists (
    select 1 from vehicles
    where id = p_vehicle_id
      and transport_partner_id = v_partner_id
      and approval_status = 'approved'
      and (v_job_category is distinct from 'motorbike-transport' or can_transport_motorbikes)
  ) then
    raise exception 'selected vehicle is not an approved, compatible vehicle for this partner';
  end if;

  update jobs
  set matching_status = 'matched',
      status = 'assigned',
      allocation_method = 'click_claim'
  where id = p_job_id
    and matching_status = 'listed'
  returning * into v_updated;

  if v_updated.id is null then
    return jsonb_build_object('claimed', false);
  end if;

  insert into job_assignments (job_id, transport_partner_id, vehicle_id, driver_id)
  values (p_job_id, v_partner_id, p_vehicle_id, null);

  return jsonb_build_object('claimed', true, 'job_id', v_updated.id);
end;
$$;

grant execute on function public.claim_job(uuid, uuid) to authenticated;
