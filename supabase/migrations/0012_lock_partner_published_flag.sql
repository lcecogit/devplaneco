-- Same pattern as 0011's profiles.role lock: transport_partners_update
-- currently lets a partner set any column on their own row, including
-- `published` — but published is meant to flip only once an admin approves
-- a vehicle, not something the partner controls directly. Phase 3 is the
-- first place a partner-facing update form exists, so this is fixed before
-- that form ships.

create or replace function prevent_self_publish_change()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.published is distinct from old.published and not is_admin() then
    raise exception 'published can only be changed by an admin.';
  end if;
  return new;
end;
$$;

create trigger prevent_self_publish_change before update on transport_partners
  for each row execute function prevent_self_publish_change();
