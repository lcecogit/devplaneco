-- 0027's DROP + CREATE re-triggered this project's `alter default
-- privileges ... grant execute on functions to anon` (a fresh CREATE, unlike
-- CREATE OR REPLACE on an already-existing function, always fires default
-- privileges) — same mechanism as the 0021/0022 issue, but this time it hit
-- find_auction_jobs specifically because 0027 was the one migration that had
-- to drop and recreate it (to add a column to its `returns table`). 0028's
-- `revoke ... from public` didn't touch it since anon's grant here is
-- direct, not inherited through PUBLIC. Confirmed via
-- has_function_privilege('anon', ...) before and after this fix.
revoke execute on function public.find_auction_jobs() from anon;
