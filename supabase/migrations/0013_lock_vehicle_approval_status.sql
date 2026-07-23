-- Same category of fix as 0011/0012: a partner should be able to move their
-- own vehicle from draft to submitted (that's "submit for review"), but not
-- fabricate under_review/approved/rejected themselves — those are admin-only
-- transitions once the Vehicles form goes live in this phase.

create or replace function restrict_vehicle_approval_status()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.approval_status is distinct from old.approval_status
     and not is_admin()
     and new.approval_status not in ('draft', 'submitted') then
    raise exception 'Only an admin can set this approval status.';
  end if;
  return new;
end;
$$;

create trigger restrict_vehicle_approval_status before update on vehicles
  for each row execute function restrict_vehicle_approval_status();
