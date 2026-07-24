-- Phase 6b: scheduled, atomic auction closing. For every listed auction job
-- whose bidding window has passed, picks the lowest pending bid as the
-- winner, settles all bids, and creates the assignment — mirroring
-- claim_job's atomicity principle (migration 0020), extended to a
-- multi-statement transaction since a bid comparison can't be a single
-- UPDATE like claim_job's first-come-first-served race.
--
-- Atomicity/concurrency-safety comes from `for update skip locked` on the
-- jobs row: a concurrent run of this same function skips any job another
-- invocation already has locked, so two overlapping pg_cron runs (e.g. a
-- slow run still going when the next 5-minute tick fires) can never both
-- process the same job. submit_bid() (migration 0024) takes the same job
-- row lock before writing a bid, so a bid can't land mid-close either.
create or replace function public.close_expired_auctions()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job_id uuid;
  v_winner bids;
begin
  for v_job_id in
    select id from jobs
    where allocation_method = 'auction'
      and matching_status = 'listed'
      and bidding_closes_at is not null
      and bidding_closes_at <= now()
    for update of jobs skip locked
  loop
    -- Lowest bid wins (this is a payout the partner is bidding *down* on,
    -- not a sale price) — ties break to whichever pending bid was submitted
    -- first.
    select * into v_winner
    from bids
    where job_id = v_job_id and status = 'pending'
    order by amount asc, submitted_at asc
    limit 1;

    if v_winner.id is null then
      -- Zero-bids edge case, called out explicitly per the phase brief:
      -- nothing to award, so leave matching_status = 'listed' (don't strand
      -- it as unmatched-but-invisible) but clear bidding_closes_at so this
      -- job stops being re-selected by this loop every 5 minutes. It will
      -- sit "listed" with no active bidding window until a future phase
      -- adds a fallback allocation path (e.g. re-list as click_claim) —
      -- flagging that gap rather than silently retrying forever or
      -- inventing a fallback not asked for in this phase.
      update jobs set bidding_closes_at = null where id = v_job_id;
      continue;
    end if;

    update bids set status = 'won' where id = v_winner.id;

    update bids
    set status = 'lost'
    where job_id = v_job_id and id <> v_winner.id and status = 'pending';

    update jobs
    set matching_status = 'matched',
        status = 'assigned',
        payout_amount = v_winner.amount
    where id = v_job_id;

    insert into job_assignments (job_id, transport_partner_id, vehicle_id, driver_id)
    values (v_job_id, v_winner.transport_partner_id, v_winner.vehicle_id, null);
  end loop;
end;
$$;

-- Internal/scheduled-only: no client (partner, customer, or admin UI) ever
-- calls this directly, so it gets no authenticated/anon grant at all —
-- revoked explicitly the same way as the other RPCs since this project
-- grants EXECUTE on new functions to those roles by default (migration
-- 0022's note).
revoke execute on function public.close_expired_auctions() from public, anon, authenticated;

create extension if not exists pg_cron;

-- Idempotent re-run guard: if this migration is ever re-applied against an
-- environment that already has the job scheduled, drop the old schedule
-- first rather than ending up with duplicate cron entries.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'close-expired-auctions') then
    perform cron.unschedule('close-expired-auctions');
  end if;
end;
$$;

select cron.schedule(
  'close-expired-auctions',
  '*/5 * * * *',
  $$select public.close_expired_auctions();$$
);
