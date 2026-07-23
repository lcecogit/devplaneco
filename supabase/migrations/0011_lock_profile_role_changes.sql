-- Closes the self-service role-escalation gap flagged at the end of Phase 2:
-- until now, profiles_insert/profiles_update let any user set/change their
-- own `role` to anything, including 'admin'. Phase 3 starts writing to this
-- column from real signup flows, so this is fixed before that code exists.

-- INSERT: self-signup may only create a customer or partner profile. Driver
-- profiles are created by a partner inviting them (later phase); admin
-- profiles are never self-created (see admin bootstrap script).
alter policy profiles_insert on profiles
  with check (
    is_admin()
    or (id = (select auth.uid()) and role in ('customer', 'partner'))
  );

-- UPDATE: block role changes outright for non-admins, regardless of what
-- else the update touches. Raises rather than silently discards, so a bug
-- or attack attempt fails loudly instead of quietly doing nothing.
create or replace function prevent_self_role_change()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'Changing your own role is not permitted.';
  end if;
  return new;
end;
$$;

create trigger prevent_self_role_change before update on profiles
  for each row execute function prevent_self_role_change();
