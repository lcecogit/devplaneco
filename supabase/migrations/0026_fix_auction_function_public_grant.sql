-- 0024's `revoke ... from anon` alone left these three reachable by anon
-- anyway: CREATE FUNCTION implicitly grants EXECUTE to the PUBLIC
-- pseudo-role too (separate from this project's `alter default privileges`
-- grant straight to anon that 0021/0022 dealt with for find_work_jobs/
-- claim_job), and every role — including anon — inherits through PUBLIC.
-- Confirmed via pg_proc.proacl: these three still carried a bare `=X/postgres`
-- (PUBLIC) entry after 0024; find_work_jobs/claim_job don't, because 0021
-- already revoked their PUBLIC grant before 0022 revoked the direct anon
-- one. Revoke both here to match.
revoke execute on function public.find_auction_jobs() from public;
revoke execute on function public.my_bids() from public;
revoke execute on function public.submit_bid(uuid, uuid, numeric) from public;

grant execute on function public.find_auction_jobs() to authenticated;
grant execute on function public.my_bids() to authenticated;
grant execute on function public.submit_bid(uuid, uuid, numeric) to authenticated;
