-- Customer-facing liability cover, sourced from Ecogreen's real Terms &
-- Conditions rather than invented numbers or AnyVan's marketing figures.
--
-- Every move already carries a standard liability cap under the T&Cs (£25
-- per box / £50 per item / £1,000 per move, £100 deductible per claim) with
-- no extra charge and no column needed — those figures are constants (see
-- src/lib/constants/liability-cover.ts), not per-booking data. What DOES
-- need storage is whether a customer asked for something beyond that:
-- "Extended Liability Cover" per clause 11.3 of the T&Cs, which is
-- explicitly not insurance, not FCA-regulated, and has no fixed price in
-- the document — it's bespoke, quoted case by case ("applicable pricing...
-- rate advised", "subject to our written acceptance"). So this is modelled
-- as a REQUEST captured at checkout, not a priced add-on: a declared value
-- and an optional note, for staff to follow up and agree a rate with the
-- customer directly, the same way the real business already does it.
--
-- Columns live on both `quotes` (captured at checkout, same pattern as
-- contact_name/access_notes in migration 0032) and `jobs` (copied over by
-- confirmBookingAndCreateJob so the assigned partner and admin can see the
-- request without joining back to the quote).
create type cover_tier as enum (
  'standard',
  'extended_requested'
);

alter table quotes add column cover_tier cover_tier not null default 'standard';
alter table quotes add column extended_cover_declared_value numeric check (extended_cover_declared_value >= 0);
alter table quotes add column extended_cover_notes text;

alter table jobs add column cover_tier cover_tier not null default 'standard';
alter table jobs add column extended_cover_declared_value numeric check (extended_cover_declared_value >= 0);
alter table jobs add column extended_cover_notes text;
