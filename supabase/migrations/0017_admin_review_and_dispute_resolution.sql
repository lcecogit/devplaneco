-- Phase 4: columns needed for the admin vehicle approval queue and dispute
-- resolution flows. Writes to these are already covered by the existing
-- vehicles_update / deallocation_charges_update RLS policies (both allow
-- is_admin()), and by the restrict_vehicle_approval_status trigger (which
-- only restricts non-admin callers) — no new RLS or trigger changes needed.

-- Vehicle approval queue: rejection reason and "needs more info" note kept as
-- separate columns so the UI can distinguish them clearly, plus an audit
-- trail of who reviewed the vehicle and when.
alter table vehicles
  add column if not exists rejection_reason text,
  add column if not exists admin_note text,
  add column if not exists admin_reviewed_by uuid references profiles(id),
  add column if not exists admin_reviewed_at timestamptz;

-- Dispute resolution outcome: whether the charge was waived, plus a free-text
-- note on the outcome (e.g. amount actually charged, if reduced rather than
-- a straight uphold/waive).
alter table deallocation_charges
  add column if not exists waived boolean not null default false,
  add column if not exists resolution text;
