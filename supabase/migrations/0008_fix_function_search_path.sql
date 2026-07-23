-- Pin search_path on every helper function and the trigger function to
-- close the "mutable search_path" advisory (prevents search_path hijacking
-- via role/session settings).

alter function set_updated_at() set search_path = public, pg_temp;
alter function current_role_name() set search_path = public, pg_temp;
alter function is_admin() set search_path = public, pg_temp;
alter function current_partner_id() set search_path = public, pg_temp;
alter function current_driver_id() set search_path = public, pg_temp;
alter function current_customer_id() set search_path = public, pg_temp;
