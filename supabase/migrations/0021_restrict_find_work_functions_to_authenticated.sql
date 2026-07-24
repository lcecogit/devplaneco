-- find_work_jobs/claim_job were only explicitly GRANTed to authenticated,
-- but Postgres also grants EXECUTE on newly created functions to PUBLIC by
-- default, which includes the anon role. Both functions are safe to call as
-- anon in practice (current_partner_id() resolves to null with no session,
-- so find_work_jobs returns no rows and claim_job raises), but there's no
-- reason to leave anonymous callers a path to either RPC at all — revoke the
-- implicit PUBLIC grant so only authenticated (signed-in) users can call them.
revoke execute on function public.find_work_jobs(uuid) from public;
revoke execute on function public.claim_job(uuid, uuid) from public;

grant execute on function public.find_work_jobs(uuid) to authenticated;
grant execute on function public.claim_job(uuid, uuid) to authenticated;
