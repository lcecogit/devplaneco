-- Phase 6b: schema for real auction allocation. bidding_closes_at marks the
-- deadline a listed auction job's bidding window closes; the closing
-- function (migration 0025) picks a winner once it's passed. vehicle_id on
-- bids commits a bid to a specific vehicle up front, since the winning bid's
-- vehicle is what gets used for job_assignments with no follow-up step for
-- the partner after winning (unlike claim_job, where the vehicle is chosen
-- at claim time instead of bid time).

alter table jobs add column bidding_closes_at timestamptz;

-- Used by close_expired_auctions() to find due auctions without a full scan;
-- partial on matching_status so it stays small (won/lost jobs drop out).
create index jobs_bidding_closes_at_idx on jobs (bidding_closes_at)
  where matching_status = 'listed';

alter table bids add column vehicle_id uuid references vehicles (id) on delete set null;

-- Required for submit_bid()'s upsert (ON CONFLICT (job_id, transport_partner_id))
-- so a partner updating their bid amount/vehicle before the window closes
-- replaces their existing bid instead of creating a second one. bids has no
-- existing rows yet (Bidding was a UI shell with nothing writing to it), so
-- this is safe to add without a backfill.
alter table bids add constraint bids_job_partner_unique unique (job_id, transport_partner_id);
