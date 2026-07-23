-- Helper functions used inside RLS policies. These are `security invoker`
-- (the default) and `stable`, so they run as the calling user and are
-- themselves subject to RLS on profiles/transport_partners/drivers/customers.
-- That's safe (not recursive) because each of those tables grants a user
-- SELECT on their own row via policies added in the next migration.

create or replace function current_role_name()
returns user_role
language sql
stable
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(current_role_name() = 'admin', false);
$$;

create or replace function current_partner_id()
returns uuid
language sql
stable
as $$
  select id from transport_partners where profile_id = auth.uid();
$$;

create or replace function current_driver_id()
returns uuid
language sql
stable
as $$
  select id from drivers where profile_id = auth.uid();
$$;

create or replace function current_customer_id()
returns uuid
language sql
stable
as $$
  select id from customers where profile_id = auth.uid();
$$;
