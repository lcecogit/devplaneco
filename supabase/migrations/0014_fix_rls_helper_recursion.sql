-- Bug found during Phase 3 browser testing: is_admin() calls
-- current_role_name(), which queries `profiles` — but profiles' own SELECT
-- policy is `id = auth.uid() OR is_admin()`. Because current_role_name()
-- runs security invoker, that internal query re-triggers profiles' RLS,
-- which calls is_admin() again, which calls current_role_name() again —
-- infinite recursion (confirmed via Postgres error 54001, stack depth
-- exceeded). Same problem applies to current_partner_id/current_driver_id/
-- current_customer_id, which query transport_partners/drivers/customers —
-- each of those tables' SELECT policies also embed is_admin().
--
-- Fix: mark all four lookup helpers SECURITY DEFINER. Their entire purpose
-- is to be a trusted fact used *by* RLS policies, so their own internal
-- queries must bypass RLS rather than re-trigger it. This is the standard
-- pattern for this exact situation.

alter function current_role_name() security definer;
alter function current_partner_id() security definer;
alter function current_driver_id() security definer;
alter function current_customer_id() security definer;
