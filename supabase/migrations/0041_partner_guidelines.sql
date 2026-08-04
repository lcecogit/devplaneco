-- Partner Guidelines acceptance gate: a one-time sign-off, matching
-- AnyVan's real "accept before Instant Price jobs" flow (confirmed via
-- their screenshots). transport_partners already has an update policy
-- scoped to the caller's own row (used by ProfileForm), so no new RLS is
-- needed — just the column.
alter table transport_partners add column guidelines_accepted_at timestamptz;
