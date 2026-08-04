-- Admin manual override: allocation has been 100% algorithmic since Phase
-- 6 (click_claim/auction/reservation/express_interest) with no human desk
-- behind it — flagged in the AnyVan alignment check as a real gap ("ops
-- staff allocate work... while negotiating to keep as close as possible
-- to the originally set price"). This is the assign/reassign half: an
-- admin can put a job directly into a chosen partner's hands, bypassing
-- every normal matching mechanism, for the case those mechanisms didn't
-- produce a result (a job sitting unclaimed, a customer complaint, a
-- partner who dropped out).
--
-- Deliberately does NOT respect rating-gated access (migration 0054) —
-- that gate controls what a partner discovers browsing on their own; an
-- admin directly assigning a specific job to a specific partner is
-- exactly the override case that gate isn't meant to block. Vehicle
-- compatibility is still enforced, since assigning a job to a partner
-- with no working vehicle for it would just create a broken assignment.
create or replace function public.admin_assign_job(
  p_job_id uuid,
  p_transport_partner_id uuid,
  p_vehicle_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job jobs;
  v_previous_partner_id uuid;
begin
  if not is_admin() then
    raise exception 'only an admin can manually assign a job';
  end if;

  select * into v_job from jobs where id = p_job_id for update;
  if v_job.id is null then
    raise exception 'job not found';
  end if;

  if v_job.matching_status not in ('listed', 'matched') then
    raise exception 'this job cannot be assigned in its current state (%)', v_job.matching_status;
  end if;

  if not exists (
    select 1 from vehicles
    where id = p_vehicle_id
      and transport_partner_id = p_transport_partner_id
      and approval_status = 'approved'
      and (v_job.category is distinct from 'motorbike-transport' or can_transport_motorbikes)
  ) then
    raise exception 'select an approved, compatible vehicle for the chosen partner';
  end if;

  select transport_partner_id into v_previous_partner_id
  from job_assignments where job_id = p_job_id;

  update jobs
  set matching_status = 'matched', status = 'assigned'
  where id = p_job_id;

  insert into job_assignments (job_id, transport_partner_id, vehicle_id, driver_id)
  values (p_job_id, p_transport_partner_id, p_vehicle_id, null)
  on conflict (job_id) do update
  set transport_partner_id = excluded.transport_partner_id,
      vehicle_id = excluded.vehicle_id,
      assigned_at = now();

  insert into partner_notifications (transport_partner_id, title, body)
  values (
    p_transport_partner_id,
    'Job assigned to you by admin',
    coalesce(v_job.title, 'A job') || ' has been assigned to you directly. Check My Work for details.'
  );

  if v_previous_partner_id is not null and v_previous_partner_id <> p_transport_partner_id then
    insert into partner_notifications (transport_partner_id, title, body)
    values (
      v_previous_partner_id,
      'Job reassigned',
      coalesce(v_job.title, 'A job') || ' has been reassigned by admin and is no longer on your My Work list.'
    );
  end if;

  return jsonb_build_object('assigned', true, 'reassigned', v_previous_partner_id is not null);
end;
$$;

revoke execute on function public.admin_assign_job(uuid, uuid, uuid) from public;
revoke execute on function public.admin_assign_job(uuid, uuid, uuid) from anon;
grant execute on function public.admin_assign_job(uuid, uuid, uuid) to authenticated;
