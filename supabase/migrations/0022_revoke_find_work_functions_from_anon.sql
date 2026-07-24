-- The prior migration's `revoke ... from public` didn't actually remove
-- anon's access: this project's database has `alter default privileges`
-- configured to grant EXECUTE on newly created functions directly to the
-- anon/authenticated/service_role roles (Supabase's standard setup), not to
-- the PUBLIC pseudo-role, so revoking from PUBLIC was a no-op for anon.
-- Revoke from anon by name instead.
revoke execute on function public.find_work_jobs(uuid) from anon;
revoke execute on function public.claim_job(uuid, uuid) from anon;
