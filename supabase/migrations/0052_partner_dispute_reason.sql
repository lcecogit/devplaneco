-- Partner-facing disputes: the admin side (migration 0017) and RLS
-- (migration 0007, "partner can read their own and update it only to
-- submit a dispute") have existed since early phases, but nothing has
-- ever let a partner actually SELECT a charge or flip dispute_status to
-- 'submitted' — confirmed by grepping the whole codebase for
-- deallocation_charges, only admin pages reference the table. The admin
-- disputes list's own empty-state copy says "Disputed deallocation
-- charges will show up here as soon as partners raise them" — this
-- migration is what finally lets that happen.
--
-- One real gap found while building the partner side: `reason` was being
-- used ambiguously — admin's DisputeActions/detail page treats it as if
-- it were the partner's dispute explanation ("Reason ... Submitted
-- {created_at}"), but semantically it should be "why this charge exists"
-- (set at charge creation), separate from "why the partner disputes it".
-- Since nothing has ever written real data here, there's no migration
-- risk in fixing this now rather than perpetuating the ambiguity: `reason`
-- stays charge-authored, a new `dispute_reason` is partner-authored.
alter table deallocation_charges
  add column if not exists dispute_reason text;
