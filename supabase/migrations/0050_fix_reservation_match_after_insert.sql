-- Fix a real regression introduced by migration 0049, caught live testing
-- reservation matching after the notification work.
--
-- WHAT WENT WRONG: 0049's `create or replace function
-- app_private.match_job_to_reservation()` was written against the version
-- in the local file supabase/migrations/0035_reservation_matching.sql,
-- which creates the trigger as BEFORE INSERT and assigns
-- `new.allocation_method := 'reservation'` directly. But the LIVE database
-- has already been fixed once before, by a migration that was applied to
-- the remote project but never saved as a local file (the migration
-- history jumps 0035 -> 0037 with no 0036 on disk) — this session's own
-- prior notes describe it: the original BEFORE INSERT version caused a
-- foreign-key violation (job_invitations referencing new.id before the
-- row physically existed), fixed by switching the trigger to AFTER INSERT
-- and replacing `new.allocation_method := ...` with an explicit
-- `UPDATE jobs SET ... WHERE id = new.id`.
--
-- 0049 didn't know that fix existed (it wasn't in any local file to read),
-- so it silently reintroduced the NEW-assignment code. Since the live
-- trigger really is AFTER INSERT, assigning to `new` there is a no-op —
-- Postgres discards a row-level AFTER trigger's return value. The
-- job_invitations insert, reservation status update, and (new, from 0049)
-- notification all still fired correctly since those are real side-effect
-- writes, but `jobs.allocation_method` silently stayed whatever
-- assign-method.ts originally picked instead of becoming 'reservation'.
-- Caught by directly re-querying the test job after insert rather than
-- trusting the RETURNING clause's apparent success.
--
-- FIX: explicit UPDATE instead of NEW-assignment (matching the missing
-- migration's fix), AND force the trigger to AFTER INSERT via DROP+CREATE
-- rather than assuming it already is — so a from-scratch replay of local
-- migration files (which still creates it BEFORE INSERT in 0035, since
-- that file was never corrected and never will be) converges to the
-- correct state too, not just this already-patched live database.
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
    return null;
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
    return null;
  end if;

  insert into job_invitations (job_id, transport_partner_id, reservation_id, status, expires_at)
  values (new.id, v_reservation.transport_partner_id, v_reservation.id, 'pending', now() + interval '2 hours');

  update reservations set status = 'partially_matched' where id = v_reservation.id;

  -- AFTER INSERT trigger: `new` can't be mutated back into the row (already
  -- committed), so the actual match has to be an explicit UPDATE.
  update jobs
  set allocation_method = 'reservation', bidding_closes_at = null
  where id = new.id;

  insert into partner_notifications (transport_partner_id, title, body)
  values (
    v_reservation.transport_partner_id,
    'Job matched to your reservation',
    coalesce(new.title, 'A job') || ' matches your reservation for ' ||
      to_char(new.collection_window_start, 'DD Mon YYYY') || '. Check Invitations to accept.'
  );

  return null;
end;
$$;

drop trigger if exists jobs_match_reservation_trigger on jobs;

create trigger jobs_match_reservation_trigger
  after insert on jobs
  for each row execute function app_private.match_job_to_reservation();
