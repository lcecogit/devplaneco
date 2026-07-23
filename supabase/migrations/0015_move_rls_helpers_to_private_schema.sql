-- The 0014 fix (SECURITY DEFINER) made current_role_name/current_partner_id/
-- current_driver_id/current_customer_id directly callable via PostgREST's
-- auto-exposed RPC endpoints (/rest/v1/rpc/*) for anon and authenticated.
-- The values they return are always scoped to the caller's own auth.uid(),
-- so this isn't a cross-user data leak — but they're internal RLS plumbing,
-- not public API, and shouldn't be reachable as an RPC call at all.
--
-- Fix: move them into a private schema that PostgREST doesn't expose.
-- Existing RLS policies keep working unchanged — Postgres resolves function
-- references in policy quals by OID at creation time, not by schema-
-- qualified name, so ALTER FUNCTION ... SET SCHEMA is transparent to them.

create schema if not exists app_private;
grant usage on schema app_private to anon, authenticated, service_role;

alter function current_role_name() set schema app_private;
alter function current_partner_id() set schema app_private;
alter function current_driver_id() set schema app_private;
alter function current_customer_id() set schema app_private;

-- is_admin() stays in public (it's fine to expose — also self-scoped, and
-- harmless either way) but its body calls current_role_name() unqualified,
-- so it needs to know where to find it now.
create or replace function is_admin()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(app_private.current_role_name() = 'admin', false);
$$;
