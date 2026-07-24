# Progress Log

Backfilled entries covering the phases completed so far. See `claude.md.md`
for the format and the standing rules (noindex, SEO, schema.org) every phase
must follow.

### 2026-07-22 — Phase 1: Homepage
- Built: Marketing homepage at `/` — `Header`/`Footer` layout, and
  `Hero`, `HowItWorks`, `ServicesGrid`, `TrustSignals`, `BecomePartner`,
  `Faq` sections under `src/components/home/`. Seven static `/services/[slug]`
  pages (home-removals, single-item-transport, office-relocation,
  car-transport, motorbike-transport, piano-moving, international-moves).
  `Organization`/`WebSite` JSON-LD on the homepage, `FAQPage` JSON-LD on the
  FAQ section, per-page canonical tags. Full noindex infrastructure: the
  `NEXT_PUBLIC_ALLOW_INDEXING` env toggle (`src/lib/site-config.ts`),
  `robots.ts`, `sitemap.ts` (returns empty while indexing is off), and an
  `X-Robots-Tag` header in `next.config.mjs` as a backup to the meta tag.
- Key decisions: indexing gate centralized in one place (`site-config.ts`)
  so flipping it on later is a one-line change, not a per-page hunt.
- Deferred / not done yet: `NEXT_PUBLIC_ALLOW_INDEXING` is still `false` —
  the "go live" flip has not happened. No `BreadcrumbList` or
  `AggregateRating` schema yet (no multi-level pages or real ratings exist
  to attach them to).

### 2026-07-23 — Phase 2: Database schema + Supabase connection
- Built: Core Postgres schema across `supabase/migrations/0001`–`0009` —
  enums + shared `updated_at` trigger (0001); identity and fleet tables:
  `profiles`, `customers`, `transport_partners`, `drivers`, `vehicles`,
  `vehicle_documents`, `service_specialisations`, `routes`, `reservations`
  (0002); `jobs`/`bids`/assignment/invitation/watchlist/recommendation
  tables (0003); job-execution evidence, `payments`,
  `deallocation_charges`, `performance_metrics`,
  `performance_management_plans`, `ratings`, `saved_searches` (0004); RLS
  helper functions (`is_admin()`, `current_partner_id()`, etc.) and RLS
  policies for every table (0005–0007); a `search_path` lint fix (0008);
  storage buckets (`vehicle-photos` public, `vehicle-documents`,
  `job-photos`, `signatures`, `partner-documents` private) with matching
  storage policies (0009). Supabase client helpers for all three contexts
  (`lib/supabase/client.ts`, `server.ts`, `admin.ts`), session-refresh
  middleware, and `types/database.ts` generated from the live schema.
- Key decisions: RLS helper functions are `security invoker`/`stable` so
  they're scoped to the calling user and can't leak cross-user data even
  though some are exposed as callable RPCs. The `admin.ts` service-role
  client is explicitly reserved for trusted server-only operations
  (guarded by the `server-only` import) rather than being available anywhere
  a request could reach it.
- Deferred / not done yet: none at the schema level — all tables from the
  original spec exist. Two RLS bugs surfaced only once Phase 3 actually
  exercised the policies (infinite recursion; helper functions
  unintentionally exposed as public RPCs) — fixed in migrations 0014/0015,
  noted under Phase 3 since that's when they were caught.

### 2026-07-23 — Phase 3: Partner auth + admin login/invite + partner dashboard
- Built: Partner-facing auth — 3-step signup (`/partner/signup` →
  `/partner/signup/business` → `/partner/signup/complete`), login,
  forgot/reset password, and a `/partner/post-auth` router that sends a
  signed-in user to step 2 if they don't have a `transport_partners` row
  yet, or straight to the dashboard otherwise. A shared `/auth/callback`
  route handler that already supports OAuth/magic-link `code` exchange.
  Partner dashboard shell (`DashboardChrome` + collapsible `Sidebar`) with
  real-data sections: Profile, Vehicles (list/new/edit + document + photo
  upload), Reservations, Routes, Payments, Messages, and six Work
  sub-pages (My Work, Bidding, Watching, Invitations, Alerts, Book Now) as
  shells. Admin-facing auth — login, reset-password, an
  `/admin/login`-gated layout, and an "Invite an admin" flow
  (`/api/admin/invite` using the service-role client to create the auth
  user and assign `role = 'admin'` directly). A `create-first-admin` CLI
  script for bootstrapping the very first admin outside the app. Migrations
  0011–0013 lock down self-service abuse of admin-controlled fields
  (`profiles.role`, `transport_partners.published`,
  `vehicles.approval_status`) once real UI could write to them; 0014/0015
  fix an RLS recursion bug and move internal helper functions to a private
  schema.
- Key decisions: **Auth is email + password only, by explicit instruction** —
  Google OAuth, magic link, and phone OTP were deliberately deferred, but
  the callback route and post-auth redirect logic were built to support
  them so they can be dropped in later without restructuring. Redirects
  after auth use a client-side `ClientRedirect` component instead of
  Next's server-side `redirect()` — **this is a deviation from a normal
  Next.js pattern**, added as a workaround for a Hostinger/LiteSpeed
  hosting bug (`ERR_HTTP_HEADERS_SENT`) discovered after this phase first
  shipped, not part of the original design.
- Deferred / not done yet: Google OAuth, magic link, and phone OTP sign-in
  (explicitly out of scope for now). The `driver` role exists in the
  `user_role` enum and has RLS policies, but **no driver-facing routes or
  mobile app exist at all** — driver auth hasn't been started. Several Work
  sub-pages and Messages/Support are UI shells without real backing data
  yet. Session-refresh middleware is currently **disabled**
  (`src/middleware.ts.disabled`) as an interim fix for the Hostinger
  crash — a Netlify-ready config (middleware re-enabled) exists on an
  unmerged `netlify` branch, not yet on `main`.

### 2026-07-23 — Phase 4: Admin backend (vehicle approvals, partner performance, disputes)
- Built: Admin dashboard rebuilt from a settings-only page into a full
  sidebar app (`src/components/admin/{Sidebar,AdminChrome,navItems}`)
  covering Overview, Vehicle Approvals, Partner Performance, Disputes &
  Charges, Admin Settings, and a Support stub. Vehicle Approval Queue
  (`/admin/vehicles`, `/admin/vehicles/[id]`) — pending/approved/rejected
  tabs, full vehicle detail with signed document links and photos, and
  Approve / Reject (reason required) / Request-more-info (note required)
  actions. Partner Performance (`/admin/performance`, `/admin/performance/[id]`)
  — sortable/filterable metrics table with a "flagged" indicator
  (thresholds as named constants), a metric-history bar chart, and
  Start/Resolve/Terminate performance-management-plan actions. Disputes &
  Charges (`/admin/disputes`, `/admin/disputes/[id]`) — submitted
  (oldest-first) / resolved tabs and Uphold/Waive actions. Admin Settings
  now also lists current admin accounts. Migration 0017 adds
  `vehicles.rejection_reason`/`admin_note`/`admin_reviewed_by`/
  `admin_reviewed_at` and `deallocation_charges.waived`/`resolution`.
- Key decisions: A single reusable `ConfirmButton` component drives every
  status-changing action (optionally with a required/optional reason) —
  built once instead of one-off confirm dialogs per action, since this is
  a hard requirement ("every destructive or status-changing action needs
  confirmation") that applies identically across vehicles, performance
  plans, and disputes. No new RLS policies were needed for any of this —
  the existing `is_admin()`-gated policies from Phase 2 already covered
  every write these actions make, since admins act through their own
  authenticated session rather than a service-role bypass.
- Deferred / not done yet: Performance and disputes views are built
  against the real schema but will show mostly-empty states until Phase 5+
  actually generates job/rating/deallocation data — this is expected, not
  a bug. **Not fixed, flagged for a future pass:** the public marketing
  header/footer currently wrap every `/admin/*` and `/partner/*` page too
  (pre-existing from Phase 1's root layout, not introduced here) — it's
  visually inconsistent with the dashboard chrome but touching it means
  changing the root layout for both dashboard areas, out of scope for this
  phase.

### 2026-07-24 — Hosting: switched to Netlify (dropped Hostinger workarounds)
- Built: Re-enabled `src/middleware.ts` (was `.disabled`), added `netlify.toml`
  (`@netlify/plugin-nextjs`), removed `output: "standalone"` from
  `next.config.mjs`, reverted `build`/`start` scripts in `package.json`, and
  deleted `scripts/copy-standalone-assets.js`. This is the same change that
  already existed, unapplied, on the stale `netlify` branch (which had
  diverged before Phase 4 and was missing the whole admin panel) — I
  cherry-picked just the hosting-config delta onto `main` instead of merging
  that branch.
- Key decisions: Left the `ClientRedirect` client-side-redirect workaround
  and its usages in Phase 3/4 code untouched — it's no longer strictly
  necessary on Netlify, but ripping it out of already-shipped auth flows
  wasn't asked for and wasn't worth the risk in this pass. New Phase 5 auth
  pages (`/customer/post-auth` etc.) use the same `ClientRedirect` pattern
  for consistency with the rest of the app, not because Netlify needs it.
- Deferred / not done yet: Removing `ClientRedirect` in favor of normal
  Next.js `redirect()` now that the Hostinger/LiteSpeed bug it worked around
  no longer applies — flagged, not done.

### 2026-07-24 — Phase 5: Customer quote flow, auth, and booking dashboard
- Built: `/quote` rebuilt as a 5-step wizard (`QuoteWizard` +
  `components/quote/steps/*`) — category → route/date → item details →
  estimate → confirm — usable while logged out, state held in
  `sessionStorage` (`lib/quote/quote-state.ts`) until a real booking is
  confirmed. Pricing isolated in `lib/pricing/estimate-quote.ts` (pure
  function, named constants) fed by `lib/pricing/postcode-distance.ts`
  (postcodes.io geocoding + haversine, with a flat-distance fallback if a
  postcode won't resolve). Customer auth — `/customer/signup`,
  `/customer/login`, `/customer/post-auth` — reusing the Phase 3
  `EmailPasswordSignUpForm`/`EmailPasswordSignInForm`/`AuthCard` components
  as-is (generalized `EmailPasswordSignUpForm` to take a `postAuthPath` prop
  instead of a hardcoded partner path). Unlike partner signup, there's no
  step-2 form — `/customer/post-auth` upserts `profiles`+`customers`
  directly, since a customer needs nothing beyond the account. A `next`
  query param round-trips a visitor through signup/login and back to
  `/quote`, where the wizard resumes at the booking-confirmation step using
  the sessionStorage state instead of restarting. Customer dashboard —
  `/customer/(dashboard)/{dashboard,bookings,bookings/[id],profile}` — with
  its own `DashboardChrome`/`Sidebar` mirroring the partner ones. Cancel
  (pre-match only) reuses `ConfirmButton`, moved from
  `components/admin/ConfirmButton.tsx` to `components/ui/ConfirmButton.tsx`
  since it's now shared across admin and customer. Migration 0018 adds the
  `matching_status` enum/column (`draft`/`listed`/`matched`/`cancelled`,
  default `draft`) and drops the `not null` on `jobs.allocation_method`.
  Migration 0019 fixes an RLS bug found while testing this phase (below).
- Key decisions: **Found and fixed a real RLS recursion bug**, not
  introduced by this phase but only ever exercised by it: `jobs_select`'s
  `EXISTS` subqueries against `job_assignments`/`job_invitations` invoked
  those tables' own RLS, which query back into `jobs`
  (`job_assignments_select`, and transitively the execution-evidence
  tables) — Postgres detects the cycle and throws 42P17. This never fired
  before because `jobs` had zero rows and no code had queried it with a
  non-admin, non-owning caller until this phase's first real booking.
  Fixed the same way migration 0014 fixed the equivalent `is_admin()`
  recursion: moved the cross-table checks into `SECURITY DEFINER` helpers
  (`app_private.job_assigned_to_current_user`,
  `app_private.job_invited_to_current_partner`) so they bypass the other
  table's RLS instead of re-triggering it. While rewriting `jobs_select`,
  also replaced the old `status is null` "let any partner browse
  unassigned work" clause with `matching_status = 'listed' and
  current_partner_id() is not null` — the old clause had no role check at
  all, so once real bookings exist with `status` staying null through
  "listed", any authenticated user (including other customers) could have
  read every unmatched booking's full details. Booking confirmation writes
  `work_type = 'single'` and uses one collection/delivery time window for
  both ends (same-visit assumption for a first booking flow — no multi-day
  journey modelling yet). The whole flow was verified end-to-end in a
  browser against the real Supabase project: quote → forced signup →
  resume at confirm step → booking created → visible in My Bookings →
  cancel → RLS-verified a partner only sees `listed` jobs, not another
  customer's `draft`/`cancelled` ones.
- Deferred / not done yet: No payment integration — booking confirmation
  shows a clearly labelled "Payment — coming soon" step and creates the
  `jobs` row with no charge, as scoped. No partner-side matching UI yet
  (Phase 6) — a "listed" job just sits there. Distance is estimated via
  postcodes.io + a straight-line/road-distance fudge factor, not a real
  routing API — fine for an estimate, would need revisiting for anything
  more precise. **Needs input:** while testing, real signups triggered
  Supabase's "confirm your email" flow instead of the immediate session the
  Phase 3 code comments assume ("Email confirmation is off for this
  project") — either that project setting has changed since Phase 3, or it
  was never actually off. Doesn't block anything (both code paths are
  handled), but worth checking the Supabase Auth dashboard if immediate
  post-signup sessions are wanted.

### 2026-07-24 — Phase 6: Find Work (click-claim allocation)
- Built: `/partner/work/find` (list) and `/partner/work/find/[id]` (detail +
  claim), the first real job-allocation method. Both read through a new
  `find_work_jobs(p_job_id uuid default null)` Postgres RPC (migration
  0020) rather than a direct `jobs` select — it's `SECURITY DEFINER`,
  filters to `matching_status = 'listed'`, and only returns jobs compatible
  with the calling partner's *approved* fleet. Claiming goes through a
  second RPC, `claim_job(p_job_id, p_vehicle_id)` — a single
  `UPDATE jobs SET matching_status = 'matched' ... WHERE matching_status =
  'listed' RETURNING *`, with the `job_assignments` insert only happening if
  that update actually touched a row. `ClaimJobButton`
  (`src/components/partner/work/ClaimJobButton.tsx`) requires picking a
  vehicle first, then shows "this job was just claimed by another partner"
  if the RPC comes back `{claimed: false}`. My Work
  (`/partner/work/my-work`) got a light upgrade from its Phase 3 placeholder
  to actually join and show the claimed job's details, now that an
  assignment exists to unlock full-address access. The customer booking
  detail page now shows the matched partner's `business_name`.
- Key decisions: **jobs.category is one of 7 fixed quote-flow slugs and
  vehicles carry no matching structured requirement fields yet** (the quote
  flow never asks for payload/volume/length; `vehicle_type`/
  `vehicle_category` are partner-typed free text) — `can_transport_motorbikes`
  is the one flag that actually corresponds to a job category
  (`motorbike-transport`), so that's the only hard compatibility check;
  every other category falls back to "partner has at least one approved
  vehicle," per the brief's explicit instruction not to hide jobs over an
  unpopulated spec field. **Address privacy is enforced at the RLS layer,
  not just the UI**: `jobs_select`'s old "any partner can browse `listed`
  jobs" clause was removed outright (migration 0020) — browsing is now only
  possible through `find_work_jobs()`, which never selects
  `collection_address`/`delivery_address` and reduces postcode down to just
  its 1–2 letter area code (`app_private.postcode_area()`) for jobs the
  caller hasn't claimed. A direct `supabase.from('jobs').select(...)` call
  for an unclaimed listed job now returns nothing to a browsing partner —
  verified by hand. A new `transport_partners_select_matched` policy
  (SECURITY DEFINER helper, same pattern as 0019's
  `job_assigned_to_current_user`) was needed too: `transport_partners` had
  *no* customer-facing read policy at all before this, so showing the
  matched partner's business name would otherwise have silently returned
  null. Two follow-up migrations (0021, 0022) were needed to fully lock
  `find_work_jobs`/`claim_job` down to `authenticated` — this Supabase
  project grants new functions' `EXECUTE` directly to `anon` via `alter
  default privileges` rather than through the `PUBLIC` pseudo-role, so
  `revoke ... from public` alone didn't work; had to revoke from `anon` by
  name. `job_assignments.driver_id` was checked against both the migration
  file and the live schema and was **already nullable** (no `not null` was
  ever added in 0003) — no migration needed for that part of the brief.
  **The atomic claim was tested for real, not just reasoned about**: a
  throwaway script created two partner accounts with one approved vehicle
  each, one listed job, then fired two genuinely concurrent `claim_job`
  calls via `Promise.all` from two independently authenticated sessions —
  exactly one returned `{claimed: true}`, the other `{claimed: false}`, and
  exactly one `job_assignments` row existed afterward. Full flow (empty
  state → list → detail → claim → My Work → customer booking page) was also
  walked through by hand in a browser against the live project. Real
  signups were hitting Supabase's email-send rate limit during testing, so
  the throwaway test partner/customer accounts were created via
  `auth.admin.createUser({ email_confirm: true })` instead — kept afterward
  as documented test accounts (see `TEST_ACCOUNTS.md`) rather than deleted,
  matching this project's existing convention. `.claude/launch.json` picked
  up `"autoPort": true` since another session already held port 3000 —
  unrelated to this phase's feature work but needed to get a preview
  running at all.
- Deferred / not done yet: **"Payout amount" has no real value to show
  yet** — the Phase 5 quote flow only ever sets `customer_price`, never
  `payout_amount` (no commission/payout calculation exists anywhere), so
  Find Work falls back to displaying `customer_price` labelled "Estimated —
  final payout isn't calculated yet." rather than inventing a commission
  rate; flagging this as a real gap for whoever builds payout logic, not
  silently faking a number. The list's "distance" is the job's own
  collection→delivery `distance_miles` (already computed at quote time), not
  partner-to-job proximity — real proximity-based sorting would need
  geocoding partners' base postcodes per job and reads more like Phase 7's
  Route Matcher than this phase. Express Interest, Auction, Reservations,
  Route Matcher, and the Watching/Alerts/Invitations/Book Now shells are all
  still Phase 7+ as scoped. Driver assignment remains out of scope (no
  driver app) — `claim_job` always inserts `job_assignments.driver_id` as
  `null`.

### 2026-07-24 — Phase 6b: automatic allocation + real auction
- Built: Booking confirmation (`ConfirmStep.tsx`) now decides
  `allocation_method`/`bidding_closes_at` itself via a pure rule function,
  `lib/allocation/assign-method.ts` — `office-relocation`/
  `international-moves` always go to auction, `single-item-transport` always
  goes to click_claim, everything else falls back to a £150
  (`AUCTION_PRICE_THRESHOLD_GBP`) price threshold; an auction's window is a
  flat 24h (`AUCTION_BIDDING_WINDOW_HOURS`) from booking time. The customer
  sees no new step — same wizard, same "Payment — coming soon" copy, same
  post-booking "Awaiting match" state either way. Migrations 0023–0029:
  `bidding_closes_at` on `jobs`, `vehicle_id` + a `(job_id,
  transport_partner_id)` unique constraint on `bids`; `find_auction_jobs()`
  (browse open auctions, fleet-compatibility-filtered like Find Work, plus
  bid count and the caller's own pending bid — never other partners'
  amounts); `my_bids()` (a partner's full bid history, including jobs no
  longer listed once resolved); `submit_bid()` (atomic upsert, rejects past
  `bidding_closes_at` at the DB level); `close_expired_auctions()`, scheduled
  via `pg_cron` every 5 minutes, which awards the lowest pending bid, settles
  all bids won/lost, and creates `job_assignments` — same
  atomic-single-statement spirit as Phase 6's `claim_job`, extended with an
  explicit `for update` row lock on the `jobs` row (held by both the closer
  and `submit_bid()`) since awarding an auction can't be one UPDATE the way
  a first-come-first-served claim can. `find_work_jobs()` was also updated
  to exclude `allocation_method = 'auction'` jobs (it previously showed
  every listed job regardless of method, which was harmless until this phase
  actually started setting the column). New partner UI: `/partner/work/bidding`
  — "Open for bidding" (browse, place/update a bid, live time-remaining and
  bid-count) and "Your bid history" (pending/won/lost/expired, color-coded).
- Key decisions: **The zero-bids edge case is explicitly handled, not just
  assumed**: `close_expired_auctions()` leaves a bidless job's
  `matching_status = 'listed'` but clears `bidding_closes_at` so the 5-minute
  cron stops re-selecting it forever — verified live by inserting a
  zero-bid auction job, backdating its deadline, running the function by
  hand, and confirming that exact end state. **This surfaced a real
  follow-up bug**, also caught live: `find_auction_jobs()` didn't filter out
  jobs with a cleared `bidding_closes_at`, so a bidless-and-abandoned job
  would have kept showing as "open for bidding" with a nonsensical deadline
  forever — fixed in 0028 by requiring `bidding_closes_at is not null`.
  There's currently no fallback allocation path for a job stuck in that
  state (e.g. auto-relist as click_claim) — flagging this as a real gap for
  a future phase, not a silent catch. **Grant-hygiene bug, caught by
  `get_advisors` and fixed twice**: this project's `alter default
  privileges` grants `EXECUTE` on every newly-created function straight to
  `anon`, separately from the implicit `PUBLIC` grant that plain `CREATE
  FUNCTION` always adds — the exact issue Phase 6 already hit once
  (migrations 0021/0022). It bit this phase too: 0024's `revoke ... from
  anon` alone left three functions still reachable via the `PUBLIC` entry
  (fixed in 0026), and then 0027 — which had to `DROP`+`CREATE` (not `CREATE
  OR REPLACE`) `find_auction_jobs()` to add a column to its `returns table`
  — re-triggered a fresh direct `anon` grant that a plain `CREATE OR REPLACE`
  wouldn't have (fixed in 0029). Both fixes were verified with
  `has_function_privilege('anon', ...)`, not just re-reading the SQL.
  **Full end-to-end verification was done for real, not just reasoned
  about**: booked an Office Relocation as `phase6-customer`, confirmed it
  landed as `auction` with a live 24h deadline, had `phase6-partner-a` bid
  £450 and `phase6-partner-b` bid £380 through the actual UI, backdated
  `bidding_closes_at` and ran `close_expired_auctions()` by hand, and
  confirmed Partner B (lowest bid) won with the correct `payout_amount`,
  `job_assignments.vehicle_id`, full-address access on My Work, "lost" on
  Partner A's bid history, and an unchanged-looking "Matched" booking on the
  customer side. Also confirmed a below-category-force, above-threshold
  Home Removals (£161) correctly fell into auction via the price-threshold
  branch (not category-forced), and that neither auction job ever appeared
  in Find Work. Test data and accounts documented in `TEST_ACCOUNTS.md`
  rather than deleted, matching this project's existing convention.
- Deferred / not done yet: No fallback allocation path for a zero-bid
  auction once its window clears (flagged above) — it just sits `listed`
  with no active deadline until a human or a future phase does something
  with it. `pg_cron` needed `create extension if not exists pg_cron;` in
  0025, which requires it to be enabled on the Supabase project — confirmed
  live (the schedule shows up in `cron.job` and the manual-run test above
  used the same function the cron job calls), so nothing further needed
  there. Bid amounts are still just numbers a partner types in — no minimum-
  decrement, reserve price, or anti-sniping rule exists, matching what the
  phase brief scoped. Manual admin override of an auction outcome is still
  out of scope, per the brief, pending Phase 4's dispute tools once real
  disputed-auction data exists to act on.
