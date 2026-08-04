-- Phase 8B: checkout, account creation, and real booking creation.
--
-- Three things happen here:
--   1. `customer_payments` — what the CUSTOMER owes us. This is deliberately
--      a new table and NOT the existing `payments` table, which models what we
--      owe a transport PARTNER (payout amount, scheduled/transferred dates,
--      express-pay fee). The two sides of a marketplace transaction have
--      different lifecycles, different counterparties and different statuses;
--      overloading one table for both would make every query ambiguous.
--   2. Checkout fields on `quotes` — contact details, access notes, the
--      per-stop street address line, and the terms-acceptance timestamp.
--      They live on the quote (not just in the request) so that the booking
--      can be created later, from a Stripe webhook, without the browser being
--      in the loop at all. See lib/booking/confirm-booking.ts.
--   3. `jobs.quote_id` becomes unique, which is what actually makes
--      confirmBookingAndCreateJob() idempotent — a second call loses the race
--      at the database rather than creating a duplicate booking.

-- ---------------------------------------------------------------------------
-- customer_payments
-- ---------------------------------------------------------------------------

-- Separate from the partner-payout `payment_status` enum ('scheduled',
-- 'pending', 'transferred'), which describes a bank transfer we initiate.
-- This one describes a card charge the customer makes.
--
-- 'unpaid' is the state every booking starts in for now: no payment is
-- collected online yet (Phase 8B ships with a "Payment — coming soon"
-- placeholder), so the row exists as an outstanding obligation waiting to be
-- fulfilled once Stripe is wired up. 'refunded' is included from the start so
-- a future cancellation/refund flow has a state to move an existing row into
-- rather than needing a migration or, worse, deleting the record.
create type customer_payment_status as enum (
  'unpaid',
  'pending',
  'succeeded',
  'failed',
  'refunded'
);

create table customer_payments (
  id uuid primary key default gen_random_uuid(),
  -- Every customer payment originates from a quote. Kept even if the job is
  -- later removed, so the financial record survives.
  quote_id uuid not null references quotes (id) on delete restrict,
  -- Nullable so a payment can, in a later phase, be taken BEFORE the job row
  -- exists (Stripe's payment_intent.succeeded webhook is what would create
  -- the job). Today it's always populated at creation time.
  job_id uuid references jobs (id) on delete set null,
  customer_id uuid not null references customers (id) on delete restrict,
  -- In pounds, matching jobs.customer_price and quotes.total_price. Stripe
  -- works in minor units (pence); that conversion belongs at the Stripe
  -- boundary, not in our stored data, so nothing else has to know about it.
  amount numeric not null check (amount >= 0),
  currency text not null default 'gbp',
  status customer_payment_status not null default 'unpaid',
  -- Null until a real processor is attached. 'stripe' will be the first.
  provider text,
  provider_payment_id text,
  -- e.g. 'card', 'bacs_debit' — whatever the provider reports back.
  payment_method_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_payments_quote_id_idx on customer_payments (quote_id);
create index customer_payments_job_id_idx on customer_payments (job_id);
create index customer_payments_customer_id_idx on customer_payments (customer_id);
create index customer_payments_status_idx on customer_payments (status);

-- Unique only when present, so the many rows that legitimately have no
-- provider id yet don't collide with each other. Once Stripe is attached this
-- is the idempotency key that stops a redelivered webhook double-recording a
-- charge.
create unique index customer_payments_provider_payment_id_key
  on customer_payments (provider_payment_id)
  where provider_payment_id is not null;

create trigger set_updated_at before update on customer_payments
  for each row execute function set_updated_at();

alter table customer_payments enable row level security;

-- A customer may read their own payment records. Nobody writes through RLS:
-- rows are created by the server-side booking function with the service-role
-- client (and later by the Stripe webhook, which has no user session at all),
-- so there is deliberately no insert/update policy for `authenticated`.
create policy customer_payments_select on customer_payments
  for select using (
    is_admin()
    or (customer_id is not null and customer_id = app_private.current_customer_id())
  );

create policy customer_payments_update on customer_payments
  for update using (is_admin()) with check (is_admin());

create policy customer_payments_delete on customer_payments
  for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- Checkout fields
-- ---------------------------------------------------------------------------

-- Collected on /quote/checkout and persisted on the quote before the booking
-- is confirmed, so confirmBookingAndCreateJob(quoteId) needs no other input.
alter table quotes add column contact_name text;
alter table quotes add column contact_phone text;
alter table quotes add column access_notes text;
-- When the customer ticked the terms box. A timestamp rather than a boolean
-- because "which version of the terms, and when" is the thing that actually
-- matters if it's ever disputed.
alter table quotes add column terms_accepted_at timestamptz;

-- Step 1 of the quote flow only ever asks for a postcode, and address_text
-- holds the postcodes.io label ("M1, Bushey, UK") that drives the map and the
-- route name. The street address is collected separately at checkout so that
-- label isn't overwritten — a partner needs a door to knock on.
alter table quote_stops add column address_line text;
alter table job_stops add column address_line text;

-- Free-text access instructions from checkout ("gate code 1234, park on the
-- left"). Shown to the assigned partner, not to browsing ones.
alter table jobs add column access_notes text;

-- ---------------------------------------------------------------------------
-- Idempotent booking creation
-- ---------------------------------------------------------------------------

-- THE guard that makes confirmBookingAndCreateJob() safe to call twice: a
-- double-submit, a retried webhook, or two concurrent requests all race on
-- this index and exactly one wins. The application-level check on
-- quotes.status is a fast path, not the real protection.
create unique index jobs_quote_id_key on jobs (quote_id) where quote_id is not null;
