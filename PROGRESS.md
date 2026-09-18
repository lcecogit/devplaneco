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

### 2026-07-27 — Phase 8A: quote flow rebuilt (addresses → items → date & price)
- Built: `/quote` replaced with a 3-step flow (`QuoteFlow` +
  `components/quote/steps/{Address,Items,Date}Step.tsx`) plus a persistent
  sidebar (`QuoteSidebar`) from step 2 onward. Step 1: postcode typeahead via
  postcodes.io (`lib/geo/postcodes.ts` — 300ms debounce, module-level cache,
  in-flight dedupe, outcode fallback), floor dropdown, lift checkbox that
  appears/disappears with the floor, add/remove extra stops. Step 2: typeahead
  over a real 60-row `item_catalogue` (matching name +
  `search_terms` synonyms — "settee" finds the sofas), 3x3 category tiles with
  expanding panels (dimensions shown as subtext for Boxes & Bags), custom-item
  modal with CM/M/IN and KG/LB unit conversion, My Item List with quantity
  steppers, Get Prices disabled until an item exists. Step 3: crew tabs with
  per-tab "from" prices, month calendar priced per date, Best Price badge,
  date drawer with dual-handle hour-granularity window sliders, helper
  toggle, live total, `Proceed & Book` → `/quote/checkout` (8B placeholder).
  New modules: `lib/geo/distance.ts` (haversine + documented constants),
  `lib/pricing/{constants,calculate-price}.ts` (pure engine, structured
  breakdown), `lib/quote/{types,api,server,flags,derive-category}.ts`, and API
  routes `POST /api/quote` and `GET|PATCH /api/quote/[id]`. Leaflet +
  OpenStreetMap route map (`RouteMap.tsx`), added as a dependency. Migrations
  0030 (floor_level/item_category/quote_status enums; `item_catalogue`,
  `quotes`, `quote_stops`, `quote_items`, `job_stops`, `job_items`; `jobs`
  gains `quote_id`/`crew_size`/`total_volume_m3`/`helper_included`/
  `price_breakdown`; RLS throughout) and 0031 (catalogue seed).
- Key decisions: **Pricing constants chosen** (all in
  `lib/pricing/constants.ts`, first-pass values with the reasoning written
  inline, not derived from our own cost data because we have none yet):
  base £38 call-out + £14/m3 + £1.15/mile tapering to 0.75x past 100 miles,
  £45 minimum; crew 1.0x / 1.45x; day-of-week Sun 1.2 / Mon 1.0 / Tue-Wed 0.97
  / Thu 1.0 / Fri 1.08 / Sat 1.15; lead time 1.45x same-day tapering through
  1.3 / 1.2 / 1.12 / 1.05 / 1.01 to a flat 1.0 from 14 days out; floor
  surcharges £12 basement, £0 ground, £12/£24/£38/£54/£72/£92/£115 for
  1st–6th/above, charged per stop and reduced to 25% with a lift; time window
  £1.4 x hours-lost^1.6 per end of the route (full 8am–6pm free, so ~£4 for an
  8-hour window up to ~£49 for a 1-hour one); helper £45 + £3/m3.
  **Multipliers apply to the base only, never to the surcharges** — a
  third-floor carry costs the same on a Saturday as a Tuesday, and inflating
  it would make the surcharge impossible to explain to a customer.
  **jobs.category is now derived, not asked** (`lib/quote/derive-category.ts`):
  item mix + stop count decide it (<=3 lines and <=3m3 and <=6 units on a
  2-stop route => single-item-transport; >=8m3 with office items >=30% of
  units => office-relocation; otherwise home-removals), and the homepage
  service card's `?service=` slug is kept only as a hint for the four
  categories the inventory genuinely can't express (car, motorbike, piano,
  international). Thresholds are covered by `npm run check:derive-category`,
  which caught the original 15m3 office threshold being too high for compact
  office furniture. **Anonymous quotes are reached only through server-side
  API routes**: an anon visitor has no `auth.uid()` for RLS to key ownership
  on, so rather than opening a `using (true)` read policy on `quotes` (which
  would let anyone enumerate every quote and its addresses), the three quote
  tables are locked to service-role and the quote's UUID acts as a capability
  token in `?quote=<uuid>`. **Verified by hand**: an anon PostgREST client
  gets `[]` from quotes/quote_stops/quote_items while rows exist, and reads
  `item_catalogue` fine. **The server always recalculates the price** from the
  stored stops and items — a client can't post a price, and 8B must charge off
  `quotes.total_price` as stored. **Availability/scarcity badges ship
  disabled** (`SHOW_AVAILABILITY_BADGES = false`) because no real partner
  availability data exists; the flag comment spells out that inventing
  scarcity is a UK consumer-protection risk (CMA enforcement precedent), not
  just bad manners, so nobody "fixes" the empty calendar with a random number.
  **Prices are not gated behind email** (`GATE_PRICES_BEHIND_EMAIL = false`) —
  the gated variant exists for a later test but keeps an escape hatch either
  way; email capture is an optional sidebar action with a separate,
  unticked-by-default marketing checkbox. No "X% cheaper than other companies"
  claim anywhere — that's comparative advertising we can't substantiate.
  **Two real bugs found and fixed while testing in the browser**, not just
  reasoned about: (1) `AddressStep` fired two state patches in the same tick
  (clear resolved geo, then store new text) through a non-functional
  setState, so the second clobbered the first from a stale closure and a
  resolved postcode never stuck — fixed by making the prop a
  `Dispatch<SetStateAction>` and dropping the redundant second call in
  `AddressLookup.resolve`; (2) DOM `id`/`htmlFor` were built from
  `crypto.randomUUID()` stop keys, which differ between the server and client
  renders and hydration-mismatched every floor dropdown — fixed by deriving
  ids from `useId()` + index (React keys can stay random; they never reach the
  DOM). **The whole flow was walked through end to end against the live
  Supabase project**: 2-stop and 3-stop routes, synonym search, category
  tiles, quantity steppers, a custom item (1.5m x 0.6m x 1.2m / 500lb stored
  correctly as 1.08 m3 / 226.8 kg), calendar prices hand-checked against the
  constants (27 Jul = same-day 1.45x, 30 Jul = Thu 1.12x lead — both matched),
  crew-tab re-pricing, window slider (8am–12pm = +£24.61 = 1.4 x 6^1.6),
  helper toggle symmetry, live total, email capture, `Proceed & Book` →
  checkout, and reload-from-`?quote=` restoring the full quote.
- Deferred / not done yet: **Checkout is a placeholder** — `/quote/checkout`
  renders the saved quote and a "payment coming soon" note but creates no
  `jobs` row. 8B still has to collect full street addresses (we only ever ask
  for postcodes), collect contact details / create the account, claim the
  quote (`customer_id`, `status = 'converted'`), mirror `quote_stops`/
  `quote_items` into `job_stops`/`job_items` while keeping the flat
  `collection_*`/`delivery_*` columns populated with the first and last stop
  for Phase 6/7 compatibility, and **call `lib/allocation/assign-method.ts`** —
  Phase 7's automatic allocation-method assignment must still run at booking
  creation and nothing does it now. Distance is still an estimate, not a
  routed one: haversine x `ROAD_WINDING_FACTOR` (1.3) with duration from
  `AVERAGE_SPEED_MPH` (35), both documented; swapping in
  OpenRouteService/OSRM/Google Directions means replacing the body of
  `calculateRouteDistance()` and nothing else, but the route should then be
  resolved once and cached on the quote rather than re-derived per price.
  Pricing constants are first-pass guesses — the first real jobs should retune
  them — and `payout_amount` still has no commission/payout calculation
  anywhere (Phase 6's known gap, untouched here). `quotes.status` is never
  moved off `in_progress`: nothing marks a quote `abandoned`, and `expires_at`
  is set but unenforced. OSM's public tile server is fine at our traffic but
  has a usage policy; the swap point is commented in `RouteMap.tsx`. Phase 5's
  `/quote` wizard, `estimate-quote.ts`, `postcode-distance.ts` and
  `quote-state.ts` were **deleted**, not deprecated in place, so there is only
  one live quote path.

### 2026-07-27 — Phase 8B: checkout, account creation, real booking creation
- Built: `/quote/checkout` rebuilt from 8A's placeholder into a real
  three-state page (`app/quote/checkout/page.tsx` + `components/checkout/
  {OrderSummary,CheckoutForm}.tsx`) — signed out shows the full order summary
  plus sign-in/create-account CTAs that round-trip `next` through the Phase 5
  customer auth; signed in claims the quote and shows the form; already-booked
  bounces to the thank-you page. The summary shows every stop with floor/lift,
  date, both time windows, crew, helper, the item list, total volume, and the
  price **with its full breakdown** (`components/quote/PriceBreakdownList.tsx`
  renders the stored `quotes.price_breakdown` line by line, so no opaque
  number). The form collects name, phone (prefilled from `profiles`), a street
  address per stop, optional access notes, and a terms checkbox.
  `POST /api/quote/[id]/confirm` is the gate: auth, ownership, field
  validation, **server-side reprice from the stored quote**, then booking.
  `lib/booking/confirm-booking.ts` → `confirmBookingAndCreateJob(quoteId)`
  creates the `jobs` row + `job_stops` + `job_items`, runs Phase 7's
  `assignAllocationMethod`, sets `matching_status = 'listed'`, creates the
  `customer_payments` row as `unpaid`, and marks the quote `converted`.
  `/quote/confirmation/[reference]` is the thank-you page (always noindex),
  with allocation-method-accurate "what happens next" copy shared with the
  email via `lib/booking/next-steps.ts`. Migration 0032: the
  `customer_payments` table + `customer_payment_status` enum, checkout columns
  on `quotes` (`contact_name`/`contact_phone`/`access_notes`/
  `terms_accepted_at`), `address_line` on `quote_stops`/`job_stops`,
  `jobs.access_notes`, and a partial unique index on `jobs.quote_id`. New
  `lib/email/{send,booking-confirmation}.ts` and `lib/time/uk-datetime.ts`,
  plus `npm run check:uk-datetime`.
- Key decisions: **`confirmBookingAndCreateJob` takes exactly one argument, and
  that's the whole design.** Everything it needs — contact details, notes,
  terms acceptance, the price — is persisted on the quote before it runs, so it
  needs no request body, no session and no browser, which is precisely what a
  Stripe webhook has. **Where Stripe attaches is written out in full at the top
  of `lib/booking/confirm-booking.ts`**: the confirm route creates a
  PaymentIntent instead of calling this function, and a new
  `/api/webhooks/stripe` route calls
  `confirmBookingAndCreateJob(metadata.quote_id)` on
  `payment_intent.succeeded` — a one-line swap — then updates the
  `customer_payments` row this function already created.
  **`customer_payments` is deliberately NOT the existing `payments` table**,
  which models partner payouts (scheduled/transferred, express-pay fee); the
  two sides of a marketplace transaction have different counterparties and
  lifecycles. Amounts are stored in pounds like everything else — the pence
  conversion belongs at the Stripe boundary. `refunded` is in the enum from day
  one so a later cancellation flow has a state to move into rather than
  deleting a financial record. **Idempotency is enforced by the database, not
  by an application check**: the partial unique index on `jobs.quote_id` is
  what arbitrates, and the `quotes.status = 'converted'` check is only a fast
  path — **verified by firing two genuinely concurrent confirms with
  `Promise.all` plus a third sequential one, which produced exactly 1 job,
  1 payment, 2 stops and 2 items and returned the same `jobId` all three
  times.** **The price is re-established server-side before confirming and a
  mismatch is surfaced, not silently applied** — the client posts what it
  displayed purely so we can tell it changed; a mismatch returns a
  `price_changed` state that the form renders as "the price has changed, please
  review" with the new figure, which the customer must accept explicitly. This
  matters already because the lead-time multiplier is a function of
  days-until-move, so a quote left open overnight genuinely reprices.
  **8A flagged that checkout still had to collect street addresses; it wasn't
  in this phase's brief but was built anyway** — a booking a driver can't find
  isn't a booking — and it's stored in a new `address_line` column rather than
  overwriting `address_text`, which holds the postcodes.io label the route map
  and "Bushey to Theydon Bois" summary depend on. **Confirmation-email copy
  never claims delivery that didn't happen**: `emailConfigured` is exported
  from `lib/email/send.ts` and the thank-you page says "confirmation emails
  aren't switched on yet" while no provider is set.
  **Two real bugs were found and fixed by testing, not by reading:**
  (1) **Next.js's per-render fetch memoization was serving stale Supabase
  reads.** Next 14 patches global `fetch` and dedupes identical GETs within a
  single render; PostgREST selects are GETs, so /quote/checkout read the
  quote's owner (`null`), claimed it, re-read the owner — and got the memoized
  pre-claim `null` back. Every customer's first visit after signing in was told
  "this quote belongs to another account". `cache: "no-store"` alone does *not*
  fix this (that's the Data Cache, a different mechanism); passing a distinct
  `signal` per request is the documented opt-out. Fixed centrally in
  `lib/supabase/{admin,server}.ts` so no call site has to remember, and
  `claimQuoteForCustomer` now uses `.select()` on the update so the success
  path has no read-after-write at all. **This affects every server-side
  read-after-write in the app, not just this phase's.**
  (2) **A BST off-by-one wrote every summer booking an hour early.** The first
  cut of `ukWallClockToUtcIso` measured its second-pass correction against the
  running guess instead of the target, so it applied the +1h offset twice: an
  8am collection on 5 Aug landed as `06:00Z` instead of `07:00Z`. Caught by
  reading the row back out of the database after a real booking, not by
  inspecting the code. Phase 5's booking code had the same class of bug (naive
  `new Date()` + `setHours()`, resolved against the server's timezone); this
  module replaces that approach outright and is covered by
  `npm run check:uk-datetime`, which pins both DST-boundary days.
  **Verified end to end against the live project**: anonymous quote → checkout
  signed out → sign in → quote claimed → form filled → confirm → thank-you
  page, then the `jobs`/`job_stops`/`job_items`/`customer_payments` rows and
  corrected UTC windows checked by SQL, the booking confirmed visible in My
  Bookings, and the confirm gate exercised for stale price, unticked terms,
  missing address, and anonymous caller (401). `get_advisors` reports no new
  security findings from 0032.
- Deferred / not done yet: **No payment is taken** — the checkout shows a
  clearly-labelled "Payment — coming soon" panel with no card fields and no
  fake pay button, and every booking gets a `customer_payments` row with
  status `unpaid` waiting to be fulfilled. **Needs configuration: an email
  provider.** Nothing in this codebase has ever sent an application email
  (Supabase Auth uses its own SMTP), so rather than adding a dependency and an
  API key that doesn't exist, `lib/email/send.ts` is a provider-agnostic seam
  that logs the full message to the server console and returns
  `{ delivered: false, reason: 'not_configured' }`. **Resend is the
  recommendation** (one `RESEND_API_KEY`, plain HTTPS POST so no SDK, works
  from a Netlify function without Nodemailer's SMTP egress problems); Postmark
  if deliverability matters more than price. Implementing the `deliver()`
  function is the only code change, plus `EMAIL_PROVIDER`, `RESEND_API_KEY` and
  `EMAIL_FROM` env vars — and a real sending domain, since `moversnow.example`
  in `site-config.ts` is a placeholder. No refund or cancellation flow was
  built this phase, as scoped, but `customer_payments` can represent a refund
  and nothing hard-deletes. No Stripe SDK dependency was added. `payout_amount`
  still has no commission calculation anywhere (Phase 6's gap, untouched).
  Booking still assumes one collection+delivery visit on a single day. The
  terms checkbox records `terms_accepted_at` but there's no versioned terms
  document to point it at yet.

### 2026-07-29 — Auction bid transparency, to match AnyVan's real model
- Built: `find_auction_jobs()` now also returns `lowest_bid_amount` — the
  current lowest pending bid on an auction, visible to every partner
  browsing it (migration 0030). The Bidding tab shows it both on the job
  card ("Lowest: £X" next to the bid count) and inline in the bid form
  itself while a partner is typing an amount ("Current lowest bid: £X —
  you'll need to go lower to win").
- Key decisions: **This deliberately reverses the original Phase 6b brief**,
  which said not to show other partners' bid amounts, only the count. After
  reviewing screenshots of AnyVan's actual live partner dashboard (Search
  Deliveries / Alerts pages), their auctions show the current lowest bid to
  every browsing partner — asked to match that model explicitly, so this
  isn't a bug fix, it's an intentional design change on record. `bid_count`
  stays as-is. The lowest amount shown can be the viewing partner's own bid
  if they're currently winning — that's expected and matches AnyVan's
  behaviour, not a leak of someone else's number. Repeated the same
  DROP+CREATE-then-explicitly-revoke-from-both-public-and-anon dance as
  migrations 0026–0029 (changing a `returns table` shape requires DROP, and
  DROP+CREATE re-triggers this project's default grant to anon) — verified
  clean with `has_function_privilege` immediately after applying, not
  assumed. Verified live in the browser (not just via SQL): seeded a fresh
  test auction with one £300 bid from Partner B, confirmed Partner A's
  Bidding tab showed "Lowest: £300.00" on the card and the same figure
  inline in the bid form, then deleted the test job/bid afterward.
- Deferred / not done yet: `my_bids()` (the bid-history view) still doesn't
  show what the winning/losing amount was for resolved auctions — only the
  partner's own bid and its outcome. Not asked for in this pass; flagging in
  case "what did I lose by" turns out to matter later.

### 2026-07-29 — Messages (job-scoped customer↔partner chat)
- Built: a new `messages` table (migration 0034) plus two RPCs —
  `my_message_threads()` for each dashboard's Messages inbox (last message,
  timestamp, unread count, resolved counterpart name) and
  `mark_messages_read(p_job_id)`, called when a thread is opened. Replaced
  the Phase 3 `/partner/messages` shell with a real inbox + thread view, and
  added the equivalent at `/customer/messages` (new nav item — customer
  dashboard had no Messages entry at all before this). A shared client
  component, `components/messages/MessageThread.tsx`, renders the bubble UI
  and composer for both sides. Also added a "Message [counterpart] →" link
  on the customer booking detail page and partner My Work, once matched, so
  the feature is actually discoverable from where a job lives.
- Key decisions: **Scoped to matched jobs only** — a message thread only
  opens once a `job_assignments` row exists, the same privacy boundary this
  project already uses for full-address access (migration 0020). AnyVan's
  real system (reviewed via their live partner dashboard screenshots) also
  supports messaging *during* bidding, before a match, with default
  "customer asking for contact details" canned templates — deliberately
  deferred, along with their admin-broadcast inbox, since neither has an
  equivalent trigger in this project yet and building them now would be
  speculative. Messages are immutable once sent (no update/delete policy for
  regular users, matching the photos/status_logs evidence pattern) —
  `read_at` is written by a SECURITY DEFINER RPC instead of a general UPDATE
  grant, so a participant can never mark their own sent messages "read" or
  edit anything after the fact. **Caught a real RLS gap during live
  testing**: the partner-side thread page originally read the customer's
  display name via a direct `profiles` query, which silently returned
  nothing because `profiles_select` is self-only (`id = auth.uid()`) —
  same shape as the `transport_partners` gap Phase 6 hit for the reverse
  direction (migration 0020). Fixed by sourcing the name from
  `my_message_threads()` (already SECURITY DEFINER) instead of adding yet
  another cross-table RLS policy for one field. All new functions were
  explicitly revoked from `public`/`anon` up front this time and verified
  clean with `has_function_privilege` before moving on, rather than
  discovering a leak via the advisor afterward (as happened twice in the
  auction work). **This session found the working tree had substantial
  uncommitted work from a separate concurrent session** (a rebuilt
  `/quote`→checkout flow, item catalogue, `customer_payments` — migrations
  0030–0032) that this phase didn't touch, build on top of, or attempt to
  reconcile beyond confirming the tables Messages depends on
  (`jobs`/`job_assignments`/`customers`/`transport_partners`/`profiles`)
  were unaffected. Verified the full send → inbox unread badge → open →
  auto-marks-read → reply → other side sees it flow live in the browser
  with two real test accounts, not just via SQL.
- Deferred / not done yet: pre-match messaging (bidding-stage contact),
  admin-visible/broadcast messages, canned "default message" templates, and
  any live/realtime updates (a thread only refreshes on send or reload —
  no Supabase Realtime subscription yet). No unread badge on the sidebar
  nav item itself, only inside the Messages page — would need a chrome-level
  change (DashboardChrome/Sidebar) this pass didn't touch.

### 2026-07-29 — Reservations completed (partner-declared availability)
- Built: this turned out to already exist, more completely than earlier
  status summaries in this log suggested — `/partner/reservations` (Current/
  Historic tabs) and `/partner/reservations/new` were real, working,
  committed since Phase 3 (`e0362d8`), not shells. What was actually
  missing against `reservations`' own schema and AnyVan's reference UI:
  `team_size` and `van_space_m3` were columns nobody wrote to — added both
  to `ReservationForm` (crew size as 1/2/Flexible, matching AnyVan's radio
  group; van space as a plain number input) — and there was no way to
  remove a reservation once created. Added `CancelReservationButton`
  (`components/partner/reservations/`), gated to `status = 'pending'` so a
  reservation can't be pulled once something real is matched to it. No
  migration needed — the schema already had every field used here, from
  Phase 2.
- Key decisions: cancelling **deletes** the row rather than setting a status,
  because `reservation_status` has no `'cancelled'` value (`pending` /
  `accepted` / `partially_matched` / `fully_booked` / `expired`) and
  `reservations_delete`'s RLS already permits it — adding a new enum value
  for this felt like more schema churn than the feature needed. Verified
  live: created a reservation with a real vehicle/date/postcodes/crew
  size/van space, confirmed it listed correctly, cancelled it, confirmed it
  was gone.
- Deferred / not done yet, and this is the important part: **nothing
  automatically matches jobs to a reservation**. AnyVan's actual pitch is
  "we'll try to fill it with work" — a partner declares availability and
  AnyVan's system routes compatible jobs to it. That matching engine does
  not exist here at all; a reservation today is purely a partner's own
  calendar note that sits at `status = 'pending'` forever with nothing
  reading it. `allocation_method` already has a `'reservation'` enum value
  reserved for this, but no code path ever sets it. Building the actual
  matcher is a real, separate piece of work — comparable in size to the
  auction system — and needs a design decision this pass didn't make: how a
  reservation-eligible job should be prioritised against the existing
  click_claim/auction pool (does a matching reservation intercept a job
  before either of those, or run alongside them?). Flagging rather than
  guessing. **Correction to an earlier status summary in this conversation**:
  I'd told the user Reservations was "not started" — it wasn't quite right;
  the declare-availability half already existed, only the matching-engine
  half was (and still is) missing.

### 2026-07-30 — Reservation matching engine (the "we'll fill it with work" half)
- Built: the actual matcher flagged as missing in the entry above. A new
  `allocation_method = 'reservation'` job-creation path via a trigger on
  `jobs` (migration 0035, timing fixed in 0036 — see below), independent of
  which code creates the job row (Phase 5's ConfirmStep or Phase 8B's
  confirm-booking.ts both work unmodified, since neither file was touched).
  On insert, a matching pending reservation (same date, compatible
  postcode-area route, crew size, van space, and price range) intercepts the
  job before click_claim/auction ever see it, raises a `job_invitations` row
  for that partner with a 2-hour response window, and flips the reservation
  to `partially_matched`. Built out `/partner/work/invitations` (was a
  Phase 3 shell) — pending invitations with Accept/Decline
  (`InvitationActions.tsx`), plus a past-invitations history. Accepting
  (`respond_to_job_invitation()`) picks a vehicle, matches the job, creates
  `job_assignments`, and sets the reservation `fully_booked`. Declining, or
  letting it time out (`expire_job_invitations()`, pg_cron every 5 minutes —
  same shape as `close_expired_auctions`), frees the reservation back to
  `pending` and falls the job back into normal click_claim/auction using a
  SQL mirror of `assign-method.ts`'s exact rule
  (`app_private.fallback_allocation_method`).
- Key decisions: **A real bug, only found by actually inserting a matching
  test job, not by reasoning about the SQL**: the trigger was originally
  `BEFORE INSERT` so it could override `NEW.allocation_method` directly, but
  that meant `job_invitations.job_id`'s foreign key pointed at a row that
  didn't physically exist yet (BEFORE triggers fire ahead of the actual
  write) — every match hit a FK violation and the whole insert rolled back.
  Fixed by moving to `AFTER INSERT` and doing the allocation_method override
  as an explicit `UPDATE` instead of an assignment to `NEW` (migration 0036)
  — same net effect, no ordering problem, and confirmed by re-running the
  exact same test insert successfully afterward. **Also fixed a real privacy
  gap this surfaced**: `jobs_select`'s `job_invited_to_current_partner`
  clause (written in migration 0019, never exercised until this phase
  actually wrote to `job_invitations`) granted a merely-*invited* partner the
  full row — exact address included — with no check they'd accepted.
  Removed it from the policy the same way migration 0020 removed the
  equivalent "browse listed jobs" leak; an invited partner now only sees the
  address-free shape via `my_job_invitations()` until acceptance creates a
  real `job_assignments` row. **The SQL/TypeScript rule duplication is a
  known, flagged piece of debt**: `fallback_allocation_method()` hand-mirrors
  `assign-method.ts`'s thresholds because there's no shared source of truth
  across that language boundary — if the price threshold or forced
  categories ever change in the TypeScript file, this SQL function needs
  updating by hand to match, or the two will silently disagree. Verified the
  complete loop live against the real database three separate ways: a
  reservation-matched job through to accept (job_assignments created,
  reservation `fully_booked`, full address unlocked in My Work), a second
  through decline (reservation freed, job correctly re-derived to `auction`
  at £300/home-removals), and a third through the actual 5-minute expiry
  path (backdated `expires_at`, ran `expire_job_invitations()` for real, same
  correct fallback) — all cleaned up afterward.
- Deferred / not done yet: a reservation can only ever be matched to exactly
  one job (`fully_booked` on the first accept) — no partial-capacity
  accumulation across multiple smaller jobs filling one reservation, which
  is what AnyVan's `partially_matched`/`fully_booked` distinction implies
  their system actually does. Building that needs a real model for "how much
  of this reservation is left" (time and/or van space), not just a status
  flag — flagging as a deliberate simplification, not an oversight. If a
  customer cancels a job while its reservation invitation is still pending,
  the reservation doesn't free up instantly — it self-heals within 5 minutes
  via the same expiry sweep, since `fallback_reservation_job` already no-ops
  safely on a non-`listed` job. No UI change to the Reservations list to
  show "1 job pending against this" beyond the status badge already there.

### 2026-07-30 — Watching
- Built: the fastest of the remaining Phase 3 shells, on purpose — the
  `job_watchlist` table and its RLS already existed untouched from Phase 2
  (fully partner-owned CRUD), so this only needed a curated read path
  (`my_watchlist()`, migration 0037 — same SECURITY DEFINER shape as
  `find_work_jobs`/`my_bids`, needed because a watched job can still be
  `listed` and not yet assigned to the watching partner) and a save/unsave
  toggle. `WatchToggle.tsx` does a plain insert/delete against
  `job_watchlist` directly — no RPC needed, RLS alone is enough since
  there's no business logic beyond "is this my own row." Wired the toggle
  into Find Work and Bidding's job cards, and rebuilt `/partner/work/watching`
  to show each watched job's current state (still listed / matched to
  someone else / cancelled) plus a live bid count for auction jobs.
- Key decisions: the toggle calls `e.preventDefault()`/`stopPropagation()`
  since Find Work's cards are full-card `<Link>`s — verified live that
  clicking the star doesn't also navigate to the job detail page. Reused
  `StarIcon`'s existing `fill="currentColor"` mechanism (color via
  `text-*` class only) rather than introducing a separate `fill-*` utility,
  matching how every other icon in this codebase is coloured.
- Deferred / not done yet: no notification when a watched job's status
  changes (e.g. someone else claims it) — a partner has to revisit the
  Watching page to see that. Not in scope for a 40-minute pass; would fit
  naturally alongside Alerts, which is still a shell.

### 2026-07-30 — Alerts
- Built: the last of the four Phase 3 Work-tab shells. `saved_searches` and
  its RLS already existed fully from Phase 2 (fully partner-owned CRUD) with
  a flexible `filters jsonb` column, so no schema change was needed for
  create/list/delete — those go straight through RLS from
  `SavedSearchForm.tsx`/`DeleteSavedSearchButton.tsx`, no RPC. The one new
  piece is `alert_matches()` (migration 0038), a SECURITY DEFINER RPC — same
  reasoning as `find_work_jobs`/`my_watchlist` — that returns every currently
  listed, fleet-compatible job (click_claim or auction) matching *any* of the
  partner's saved searches, tagged with which search matched. `filters`
  supports `categories` (array, empty/absent = any), `postcodeArea` (matches
  either end of the job, case-insensitive), and `minPrice`/`maxPrice` —
  every key optional, same "don't hide over an unpopulated field" principle
  used throughout. `/partner/work/alerts` now shows the alert list (with
  delete) above a live matches list, reusing Find Work's card layout —
  clicking a match links to Bidding or Find Work depending on which
  allocation method it is.
- Key decisions: matches are deduplicated (`distinct on (j.id)`) when a job
  satisfies more than one saved search, rather than showing it once per
  matching search. Verified live end-to-end, and this is where a genuinely
  useful catch happened: an alert for postcode area "MH" correctly matched
  *nothing*, which looked wrong until checking the database directly — the
  one job in that area is a pre-Phase-6b legacy test row with
  `allocation_method = null`, and `alert_matches()` deliberately excludes
  null the same way `find_work_jobs` does (both intentionally scope to
  `click_claim`/`auction`, not "anything unset"). Re-tested against a "SW"
  alert against real auction jobs and got 3 correctly tagged, correctly
  priced matches — confirms the filter logic itself is right; the first
  empty result was the test data being unrepresentative, not a bug. Also hit
  one client-side hiccup, not a real bug: right after saving a second alert,
  the page's `router.refresh()` didn't immediately show it in that same
  render pass — a fresh navigation immediately after showed everything
  correctly (both alerts, and the right matches), and the database always
  had the correct row. Noting it in case it recurs elsewhere, not treating
  it as fixed or as a confirmed bug.
- Deferred / not done yet: "notified" is figurative — there's no actual
  notification (email, push, in-app badge) when a new match appears, only a
  live list a partner has to check. Editing an existing alert isn't
  supported, only create/delete. No route-based matching (a partner's
  declared route rather than a single postcode area) — `postcodeArea` here
  is a single value, unlike Reservations' separate start/end postcodes.

### 2026-07-30 — Book Now (last of the four Phase 3 Work-tab shells)
- Built: asked to make the call on what Book Now actually is in this system
  and build it, changeable later — no product brief existed for it the way
  Reservations/Auction did. Decision made: Book Now is **not** a separate
  allocation path. It's a narrower, faster-to-act-on view of the exact same
  click_claim pool Find Work already browses, filtered down to
  `single-item-transport` — the one category `assign-method.ts` always
  routes to click_claim regardless of price, so it's the natural "quick job"
  slice. Reused `find_work_jobs()` and `claim_job()` completely unchanged —
  zero new migrations, zero new backend surface. The one real UX difference
  from Find Work: claiming happens right in the list via `ClaimJobButton`
  (already existed, from Phase 6) instead of linking to a detail page first,
  since the whole point of "book it now" is one screen, no extra hop. The
  shell's own comment ("customers will be able to book a partner directly")
  didn't match AnyVan's actual model — same kind of stale placeholder
  comment already found and corrected in the Reservations and Alerts shells.
- Key decisions: no new visual treatment (AnyVan's real Book It Now used a
  denser photo/table layout) — reused Find Work's card styling to keep this
  fast and consistent rather than introducing a second list pattern for one
  page. Verified live end-to-end: inserted a real single-item-transport test
  job, claimed it straight from the Book Now list, confirmed it landed in My
  Work with the full address unlocked, then cleaned up the test row. Hit the
  same automation-only quirk noted in earlier phases where the browser
  tool's coordinate click didn't register on the first two tries on this
  particular button (confirmed via a direct DOM click that the button itself
  works fine, not an app bug — the same thing happened on the Bidding page
  earlier in this session and was equally not a real issue).
- Deferred / not done yet: this is an interpretation, explicitly flagged as
  changeable — if "Book Now" is meant to mean something else (e.g. a
  customer booking a specific partner directly, matching the old shell
  comment, or an AnyVan-style dense table view), this needs revisiting
  rather than extending. All four Phase 3 Work-tab shells (Watching, Alerts,
  Invitations, Book Now) are now real.

### 2026-07-30 — Partner Insights (reliability dashboard)
- Built: new `/partner/insights` (nav item added, right under Home —
  partner nav previously had no Insights entry at all). One RPC,
  `my_performance_summary()` (migration 0039), returns job count (all-time
  + last 30 days), average rating + count, deallocation count/total, and a
  derived booster-eligibility flag. Page also lists the partner's 10 most
  recent job assignments with their rating (or "Not yet rated"), reusing
  My Work's fetch-separately-and-match-in-JS convention rather than a join.
- Key decisions: **deliberately reads live from source tables
  (job_assignments/ratings/deallocation_charges/performance_management_plans),
  not `performance_metrics`** — admin's existing `/admin/performance` view
  (Phase 4) is built on that table, but nothing in this codebase has ever
  computed a row into it (confirmed 0 rows live). A partner view built on
  top of that would show blank forever regardless of real activity, so this
  computes fresh instead. That means partner Insights and admin Performance
  now read from two different sources for what's nominally the same
  concept — a real, flagged inconsistency, not a fix to the admin side's
  gap (that batch-computation piece still doesn't exist for anyone).
  **On-time pickup %, on-time delivery %, and app usage % are shown as "No
  data yet" rather than a computed number** — there's no driver app and
  nothing writes to `status_logs`, so there's no actual-arrival timestamp
  anywhere to compute an on-time rate from; showing a fabricated percentage
  would be worse than admitting there's no data, matching AnyVan's own
  empty-state convention (their real dashboard also just shows "—" for a
  low-activity account, confirmed from the reviewed screenshots).
  **Booster eligibility is an explicit interpretation**: eligible whenever
  the partner has no *active* `performance_management_plans` row — simple,
  reuses real data, flagged as a chosen rule rather than a spec, same as
  Book Now's category filter. Verified live against the real test account:
  job count, "not yet rated" (ratings table is genuinely empty), zero
  deallocations, and eligible booster status all matched the actual
  database state.
- Deferred / not done yet: the on-time/app-usage computation gap is
  structural — filling it needs either a driver app writing real timestamps
  or some other event source, not a UI change. No historical trend view
  (admin's `MetricHistoryChart` has no partner-facing equivalent, since
  there's no monthly time-series data to chart from live-computed numbers).

### 2026-07-31 — Customer Reviews (four-category ratings)
- Built: `ratings` gained four category columns (`punctuality_rating`,
  `communication_rating`, `care_of_goods_rating`, `presentation_rating`,
  migration 0040) alongside the existing overall `rating`, matching
  AnyVan's real four-category breakdown confirmed from their screenshots.
  A `before insert or update` trigger keeps `rating` as the average of
  whichever category scores are present, so it stays correct without every
  future caller having to compute it — and without disturbing Insights'
  `average_rating` (built last turn), which reads `rating` directly. Built
  the write side too, since a partner-facing reviews page with nothing to
  show wouldn't prove anything: `RatingForm.tsx` on the customer booking
  detail page (visible once `matching_status = 'matched'`; a completed-once
  check via the existing unique constraint on `ratings.job_id` prevents a
  second submission). Built the read side: `/partner/reviews` (new nav
  item), showing five score tiles (four categories + overall average) and
  the individual review list with comments, via a new `partner_reviews()`
  RPC.
- Key decisions: **found and fixed a real gap in the original
  `ratings_insert` policy while building the write path** — it only ever
  checked `customer_id = current_customer_id()`, never that `job_id`
  actually belonged to that customer or that `transport_partner_id` was who
  the job was really assigned to. The existing unique constraint on
  `ratings.job_id` stopped a duplicate rating on one specific job, but
  nothing stopped a customer inserting a rating row aimed at an arbitrary
  job/partner pair. Fixed at the RLS layer directly (both conditions added
  to the policy's `WITH CHECK`), the same "fix it at the database, not just
  the UI" principle established in migration 0020 — this one just hadn't
  been exercised by a real write path until now. **Gated the review form on
  `matching_status = 'matched'`, not job completion** — the same practical
  call as the on-time-tracking gap in Insights: nothing in this system
  currently advances `jobs.status` past `'assigned'` (no driver app), so
  gating on true delivery completion would make the form permanently
  unreachable. Flagged as a simplification, not a spec. `partner_reviews()`
  resolves the reviewing customer's display name the same way
  `my_message_threads()` does — a partner has no RLS path to another user's
  `profiles` row directly, so it has to go through a SECURITY DEFINER
  function rather than a client-side query. Verified the entire loop live,
  not just via SQL: submitted a real 4-category review as
  `phase6-customer` against the Office Relocation booking matched to
  Partner B (5/4/5/4 stars + a comment), confirmed the trigger computed
  `rating = 4.50` correctly in the database, then confirmed Partner B's
  `/partner/reviews` showed the right per-category averages, the right
  overall, the customer's name, and the comment — left as real
  documentation-worthy test data rather than deleted, same as the existing
  Phase 6b auction test bookings in `TEST_ACCOUNTS.md`.
- Deferred / not done yet: no way to edit or dispute a submitted review
  (matches AnyVan's own apparent behaviour — reviews looked immutable in
  their screenshots too, not a gap introduced here). No admin visibility
  into individual reviews beyond what already exists. No rating prompt/
  reminder flow — a customer only sees the form if they happen to revisit
  their booking page.

### 2026-07-31 — Partner Guidelines, Route Matcher, Express Interest
- Built three features in one pass: a one-time Partner Guidelines
  acceptance gate, Route Matcher (routes/job_recommendations, unused since
  Phase 2), and Express Interest (the third `allocation_method`, enum value
  existed, nothing implemented it).
- **Partner Guidelines** (migration 0041): `transport_partners.guidelines_accepted_at`,
  a new `/partner/guidelines` page (content sections adapted from AnyVan's
  own guidelines structure, rewritten not copied) with an accept button,
  and a redirect gate on Find Work and Book Now specifically — matching
  AnyVan's own stated scope ("required to qualify for Instant Price jobs"),
  not applied broadly to every Work tab.
- **Route Matcher** (migration 0042): non-exclusive by design, unlike
  Reservations' first-refusal model — a recommendation is a discovery aid
  ("this job is along a route you're driving"), not a claim; actually
  winning the job still goes through Find Work/Bidding unchanged. Matching
  works symmetrically in both creation orders via two triggers (`jobs`
  insert checks existing routes, `routes` insert checks existing listed
  jobs), direction-aware (`outbound`/`return`/`both`), postcode-area level.
  Surfaced as a new section on the existing (already real, not a shell)
  `/partner/routes` page via `my_route_recommendations()`.
- **Express Interest** (migration 0043): the harder design problem was
  *which* jobs get this method. AnyVan tags multi-stop "Journey" jobs with
  it specifically, and `jobs.work_type` exists for exactly this
  (`'single'`/`'journey'`/`'auction'`) — but reading `lib/booking/confirm-booking.ts`
  (Phase 8B, actively developed elsewhere) showed it always writes
  `'single'` regardless of actual stop count, so that field is currently
  dead for this purpose. Rather than edit that file — a shared function
  signature another session depends on — this detects a journey
  structurally instead: 3+ rows in `job_stops` means a real multi-stop
  route. That table is populated in a *separate* insert right after the
  `jobs` insert (also confirmed by reading confirm-booking.ts), so the
  detection trigger lives on `job_stops`, not `jobs` — a jobs-insert
  trigger would fire before any stops exist. Used a STATEMENT-level trigger
  with a transition table so one multi-row stops insert is evaluated once,
  not once per stop. Only overrides `allocation_method` when it's still
  `click_claim`/`auction` (assign-method.ts's default), so an
  already-reservation-matched job is never touched — reservation match
  (decided earlier, at the jobs insert itself) wins if both would apply.
  New table `job_interests` (non-binding, no price, no deadline — stays
  open until the customer acts). Partner side: new `/partner/work/express-interest`
  tab (`find_express_interest_jobs()`, `express_interest()` — upsert like
  submit_bid, shows interest count not amounts, same convention as
  auction's bid count). Customer side: a "Choose your transport partner"
  section on the booking detail page (`job_interested_partners()`,
  `select_interested_partner()` — atomic single UPDATE guarded by
  `matching_status = 'listed'`, same principle as claim_job) — this closes
  the loop AnyVan's own "Choose your provider" homepage copy described back
  in Phase 1 but nothing had ever implemented.
- Key decisions: none of the three touch any file outside this session's
  own additions except the two Find Work/Book Now edits (the guidelines
  gate) and the customer booking page (the interest-selection section) —
  Express Interest's journey detection deliberately avoided
  confirm-booking.ts entirely, composing purely through triggers so it
  works regardless of which code created the job. All grants verified
  clean with `has_function_privilege` before moving on (no anon leaks this
  time, unlike the auction/messages saga). Verified all three live end to
  end: (1) a partner without guidelines accepted was redirected away from
  Find Work, accepted, and was redirected back automatically; (2) a
  real route (`MH1 → MH2`, `direction = both`) created via the actual UI
  immediately surfaced an existing listed job as a recommendation; (3) a
  real 3-stop job was built via direct inserts (matching how
  confirm-booking.ts actually writes stops), confirmed the trigger flipped
  `allocation_method` to `express_interest`, a partner expressed interest
  with a note through the real UI, and the test customer saw that partner
  and note on their booking page and successfully selected them — job
  correctly moved to `matched`/`assigned` with the right vehicle. **Also
  found and fixed a small real bug during this testing**: the Express
  Interest submit button didn't refresh the page after submitting, so the
  "N partners interested" count looked stale (the database was correct all
  along) — added the same `router.refresh()` call every other submit flow
  in this codebase already uses.
- **Also noticed, not part of this feature work**: `TEST_ACCOUNTS.md`
  documents a convention from another session — "Claude Code sessions must
  not enter passwords into forms," using `auth.admin.generateLink()` magic
  links instead — that this session's entire testing approach today (and
  in prior turns) didn't follow, typing test account passwords directly
  into login forms instead. Flagging this rather than quietly continuing
  either way; switching to the magic-link approach for future verification
  in this project.
- Deferred / not done yet: Route Matcher doesn't consider vehicle capacity
  (routes has no van-space field the way Reservations does — only what the
  table itself already declares: postcode/date/category/team_size).
  Express Interest has no deadline/expiry — an interest sits open until the
  customer manually picks someone or cancels the job; unlike Auction/
  Reservations, nothing times it out. No way for a partner to withdraw an
  expressed interest once sent (only update vehicle/note via re-submitting).

### 2026-07-31 — Find Work Map view, Auction Search nav, Messages templates/notifications
- Built three more items from the AnyVan comparison: a Map view for Find
  Work (paused earlier on a privacy/precision question, never resumed), a
  separate "Auction Search" nav entry, and Messages extras (canned-reply
  templates + a system-notice inbox).
- **Map view** (migration 0044): resolves the paused precision question the
  same way Book Now's category-filter interpretation was — a judgment call,
  flagged, changeable later. Decision: outward-code precision (e.g. "SW1A"
  instead of just the "SW" area) for map pins specifically, via a new
  `app_private.postcode_outward()` alongside the existing `postcode_area()`.
  `find_work_jobs()` gained two additive output columns
  (`collection_outward`/`delivery_outward`); existing area columns
  untouched. New `lib/geo/outcode-batch.ts` (server-side, separate cache
  from the browser-only `lib/geo/postcodes.ts`), `JobsMap.tsx` (Leaflet +
  OSM, same tile/attribution setup as `RouteMap.tsx`), and
  `FindWorkViewToggle.tsx` (List/Map pill toggle wrapping the existing
  Server Component list). **Auction Search**: AnyVan shows this as a
  distinct nav entry but it opens the same auction-browsing surface Bidding
  already does here — added as a second link to the existing Bidding page
  rather than building a duplicate feature.
- **Messages templates + notifications** (migration 0045): `message_templates`
  (partner-owned, full CRUD via RLS) — one unified canned-reply library, not
  AnyVan's two categorised lists ("Default messages" vs "Bid messages"),
  since this project's Messages only opens once a job is matched (migration
  0034) and has no separate pre-match "bid messages" channel to categorise
  against. New `/partner/messages/templates` management page and a template
  picker `<select>` wired into the shared `MessageThread.tsx` (an optional
  `templates` prop the partner thread page passes and the customer thread
  page doesn't, so nothing changes for customers). `partner_notifications`
  (system/admin-only inserts, partner can only read + mark read via
  `mark_notifications_read()`) — new `/partner/notifications` page, plain
  nav item (not nested under Messages, unlike AnyVan's tab, since Messages
  here is a flat thread list with no existing tab structure to extend).
  Wired up one real producer as a working example rather than shipping an
  empty inbox: `close_expired_auctions()` now inserts a "You won an auction"
  notice for the winning bid.
- **Found and fixed a real bug during live testing**: `lib/geo/outcode-batch.ts`
  originally called a bulk `POST /outcodes` endpoint on postcodes.io that
  doesn't exist (confirmed via a direct `curl` — it 404s). postcodes.io only
  supports bulk lookup for full postcodes (`POST /postcodes`); outcodes are
  single-lookup only (`GET /outcodes/:outcode`). Rewrote to fetch each
  uncached outcode individually, in parallel — fine at Find Work's scale (a
  handful of distinct outward codes per page). Caught this because the map
  showed "No mappable jobs" for a job seeded with a real UK postcode
  (`SW1A 1AA`/`E1 6AN`); after the fix the pin rendered on London and
  clicking it navigated to the job.
- Verified live, end to end, using the magic-link sign-in approach from
  `TEST_ACCOUNTS.md` (no passwords typed into forms this session): Map view
  toggled and rendered a real pin that navigated to its job; a template was
  created, appeared in `/partner/messages/templates`, and correctly
  populated the message composer on a real conversation, which sent
  successfully; a real auction win (seeded job + bid, `bidding_closes_at`
  backdated, `close_expired_auctions()` run by hand — same pattern as the
  Phase 6b auction tests) produced a notification that rendered unread
  (coral background), and "Mark all read" correctly cleared it. All test
  data (temp jobs, bid, notification, template, message) cleaned up
  afterward.
- Deferred / not done yet: the existing `2b1873e3…` Phase 6 UI test job has
  a non-standard test postcode (`MH1`/`MH2`, no inward code) that
  `postcode_outward()` can't parse — it's correctly excluded from map pins
  (falsy empty string), same graceful-degradation behavior as an
  unresolvable real postcode, not a bug. Notifications has only one real
  producer (auction win); reservation invitations, express-interest
  selection, and vehicle approval/rejection are equally valid candidates
  for a notification but out of scope this pass.

### 2026-08-03 — Payments placeholder
- Replaced the partner Payments page's half-real implementation (real
  Scheduled/Pending/Transferred tabs and a real `payments` table query, but
  no invoices, no CSV export, and an `express_pay` badge that only ever
  displays, never toggles) with a plain "Coming soon" placeholder, matching
  the existing pattern already used for the admin Support page. Deliberate
  choice: showing real tabs and a real-looking badge next to features that
  don't actually work reads as broken, not unfinished — a placeholder is
  the more honest state while Payments waits its turn behind Profile,
  Support, and payout calculation. Verified live: the page renders the
  same "Coming soon" card style, no console errors, other partner nav items
  unaffected.

### 2026-08-03 — Profile/Account gaps, searchable Help center
- Filled in the two remaining Profile gaps from the AnyVan comparison
  (bank details, insurance £ amounts, VAT number, payment methods accepted,
  category preferences, notification settings) and turned Support/Help
  from 3 hardcoded FAQs into a real searchable center (migration 0046,
  fixed by 0047 — see below).
- **Security decision made before writing any UI**: bank details and VAT
  number do NOT live on `transport_partners`. That table has a
  `transport_partners_select_matched` RLS policy (migration 0034) giving a
  customer matched to a job full-row SELECT access, and RLS is row-level,
  not column-level — a new column there is visible to that matched
  customer via a direct PostgREST call, regardless of which columns this
  codebase's own `select()` calls happen to ask for (the publishable key is
  public in the browser bundle, so nothing stops a wider request). Put
  bank/VAT/payment-methods in a new `transport_partner_payment_details`
  table instead, RLS-scoped to the owning partner (and admin) only, no
  matched-customer policy at all. Insurance £ cover amounts and category
  preferences stayed on `transport_partners` — same sensitivity level as
  the trade_associations/doc-url columns already there.
- **Category preferences aren't just a saved-but-inert field**: empty
  means "show me everything" (unchanged default for every existing
  partner), but a non-empty list now actually filters `find_work_jobs()`,
  `find_auction_jobs()`, and `find_express_interest_jobs()` — all three
  share the same `v_partner_id`/`v_has_any_approved` shape, so the same
  filter clause was added to each via `CREATE OR REPLACE` (no DROP needed,
  no column list changed, so grants stayed intact — verified with
  `has_function_privilege` anyway).
- **Notification settings honesty**: no email/SMS delivery exists anywhere
  in this codebase (`lib/email/send.ts` is an explicit not-yet-configured
  seam — see its own comment). Rather than build a decorative toggle that
  implies working delivery, the copy under the two toggles says plainly
  they'll take effect once email/SMS delivery is switched on for the
  platform, and that in-app notifications (migration 0045) work today
  regardless.
- **Found and fixed a real bug during live testing**: all three
  `CREATE OR REPLACE`d RPCs return an `id` output column, and PL/pgSQL
  implicitly exposes `RETURNS TABLE` column names as variables inside the
  function body — so the new `where id = v_partner_id` line against
  `transport_partners` collided with the function's own `id` OUT
  parameter, throwing `column reference "id" is ambiguous`. Not caught by
  `tsc` or by testing with an empty category-preferences value (only
  triggers once a partner actually sets a preference and the RPC runs
  Postgres's ambiguity check for real). Caught live: set a real preference
  on the test partner, watched Find Work throw the error. Fixed in
  migration 0047 — aliased the table (`transport_partners tp`) and
  qualified the column in all three functions.
- **Also found and fixed this turn, unrelated to the RPC bug**: ran
  `npm run types:generate` out of habit to regenerate `types/database.ts`
  after the migration — the `supabase` CLI isn't installed in this
  environment, so the command failed but still truncated the file to 0
  bytes via the `>` redirect. Recovered immediately from the Supabase MCP
  tool's own (larger-than-inline) output file rather than losing the
  regenerated types; `npx tsc --noEmit` came back clean afterward with no
  other damage. Worth remembering: this project has no local `supabase`
  CLI, only the MCP `generate_typescript_types` tool — don't run
  `types:generate` expecting it to work.
- Support/Help: expanded from 3 to 16 real Q&As grounded in what's
  actually built this session and earlier (Find Work vs Bidding vs Express
  Interest, Route Matcher, Watching/Alerts, Reservations, message
  templates, Notifications, 4-category reviews, and an honest "Payments
  isn't built yet" entry) grouped by topic, with a client-side search box
  filtering question/answer/topic text. New `lib/constants/partner-faq.ts`
  (content) and `components/partner/support/FaqSearch.tsx` (search UI) —
  static content, matching how `SERVICE_CATEGORIES`/`COMPANY_TYPES`
  already work in this codebase, not a new CMS/database table for content
  three people edit a year.
- Verified live end to end: filled in and saved Payment details (bank
  name/sort code/account number/VAT/payment methods), Insurance cover
  amounts (£50,000 / £100,000), Job categories, and both notification
  toggles on the real test partner account — confirmed each persisted via
  direct SQL, not just optimistic UI. Set a real category preference and
  watched Find Work correctly narrow to just that category (then hit, and
  fixed, the ambiguous-`id` bug), reset the preference back to `{}`
  afterward so it doesn't silently change what other test sessions expect
  Partner A to see. Help search tested with a noisy multi-topic-matching
  query ("VAT" — matched via substring inside "reser**vat**ions") and a
  precise single-match query ("template").
- Deferred / not done yet: payment methods accepted and bank details are
  purely informational — nothing reads them yet (Payments is still a
  placeholder, so there's no payout flow to feed them into). Category
  preferences only filter the three job-browsing RPCs, not Alerts' saved
  searches (those already have their own independent category filter) or
  Reservations/Route Matcher (neither browses a job list the same way).

### 2026-08-03 — Payout/commission calculation
- `payout_amount` has only ever been set for auction jobs (the winning bid
  amount, in `close_expired_auctions()` since Phase 6b) — every other
  allocation method has always inserted with it null, so Find Work's
  `payout ?? customer_price` fallback has been quietly showing partners the
  full customer price as their earnings. Flagged as a gap since Phase 6,
  picked up now with the user's explicit instruction to research AnyVan's
  real commission/payout model first rather than guess a number.
- **Research** (see chat for full findings and sources): no single
  authoritative commission percentage is published for AnyVan's
  independent Transport Partners specifically. A general summary describes
  a 60/40 (platform/driver) split for AnyVan's in-house driver network; a
  driver-advocacy petition (organise.network) cites a harsher 70-75/25-30
  split for that same in-house group — both describe employed-style
  drivers, not independent partners who bid their own price the way this
  project's auction jobs already work. Payout timing is more consistent
  across sources: funds held 2-5 days from booking to job completion, paid
  out within ~10 days (processed twice weekly), with an Express Pay option
  for 4.5+ rated partners to get paid the next business day for a fee
  (matches the unused `express_pay` column already sitting in `payments`).
  Presented the findings and asked the user to pick a rate rather than
  silently choosing one — **25% platform commission (partner keeps 75%)**,
  the generous end of the researched range.
- **Built** (migration 0048): a `BEFORE INSERT` trigger on `jobs`
  (`app_private.set_default_payout_amount()`) computes
  `payout_amount = round(customer_price * 0.75, 2)` for any job whose
  `allocation_method` isn't `'auction'` — named to sort alphabetically
  after `jobs_match_reservation_trigger` (migration 0035) so it sees
  `NEW.allocation_method` *after* a reservation match may have already
  overridden it, not the value `assign-method.ts` originally computed.
  Auction jobs are deliberately excluded — the winning bid already IS the
  payout, unchanged since Phase 6b, and the entire point of that flow is
  the partner setting their own price rather than accepting a fixed cut.
  One-time backfill for every already-existing non-auction job so test
  data reflects reality immediately, not just new jobs going forward.
- **Real bug found while reasoning through the trigger interactions, not
  live testing**: migration 0043's journey-detection trigger can flip a
  job from `'auction'` to `'express_interest'` (an office-relocation
  journey, say) — but `express_interest` jobs never go through bidding, so
  without a fix that job's `payout_amount` would've stayed permanently
  null (skipped at insert for being `'auction'` at the time, then
  reassigned to a method that never sets it either). Fixed by extending
  `mark_journey_express_interest()` to also set
  `payout_amount = coalesce(payout_amount, round(customer_price * 0.75, 2))`
  in the same `UPDATE` that flips the allocation method.
- **Also extended**: `find_express_interest_jobs()` and
  `my_job_invitations()` now return `payout_amount` too (DROP+CREATE,
  re-granted, verified via `has_function_privilege`) — both pages
  previously told a partner "Customer was quoted £X — not your payout"
  next to the price, which was true when payout genuinely wasn't knowable
  pre-match, but is now stale copy once a flat 75% figure is fixed at
  insert. Both pages now show the real payout instead. Deliberately did
  NOT touch Watching or Alerts this pass — both browse the same
  click_claim-shaped jobs and could show real payout too, but neither
  currently displays a "not your payout" disclaimer (just a plain price),
  so there's no active inaccuracy to fix there, only an enhancement —
  left for a future pass rather than growing this one further.
- Verified live: Find Work showed £110.25 (75% of £147) instead of the
  full £147 for the existing Phase 6 test job. Seeded a temporary
  express_interest test job (£400 customer price) and confirmed the
  trigger computed £300 payout at insert, then confirmed the Express
  Interest page rendered "£300.00 payout" correctly; cleaned up
  afterward. Invitations page uses the identical conditional/column, not
  separately live-tested.
- Deferred / not done yet: Insights has no earnings total to fix (it never
  computed one from payout_amount or customer_price in the first place —
  confirmed by reading migration 0039, not assumed). Watching/Alerts could
  show real payout_amount instead of a plain customer_price line, noted
  above as a future enhancement, not a fix.

### 2026-08-03 — Notify partners of matches (Alerts, Route Matcher, Reservations)
- Surfaced by auditing how partners actually get leads: Alerts, Route
  Matcher, and Reservation matching all already compute real matches
  server-side, but none of them told the partner — only
  `close_expired_auctions()` (migration 0045) wrote to
  `partner_notifications`. Migration 0049 adds the missing notification
  insert to all three: Alerts gets a new `AFTER INSERT ON jobs` trigger
  (`notify_alert_matches()`, mirroring `alert_matches()`'s exact filter
  logic per-job instead of per-partner); Route Matcher's existing two
  triggers (job→routes and route→jobs directions) each got their `INSERT
  ... ON CONFLICT DO NOTHING` restructured into a CTE with `RETURNING`, so
  only genuinely new recommendations notify, not conflict no-ops;
  Reservation matching's existing trigger got one more insert once a match
  is found.
- **Found and fixed a real regression this same migration introduced**,
  caught by re-querying a test job after insert instead of trusting the
  `RETURNING` clause: this session's own earlier notes describe a bug
  where the original `BEFORE INSERT` reservation-matching trigger caused a
  foreign-key violation, "fixed in migration 0036" by switching to `AFTER
  INSERT` and an explicit `UPDATE jobs SET ...` instead of assigning
  `NEW.allocation_method` directly. That fix was applied to the live
  database but **the migration file was never saved locally** — the
  migration folder jumps `0035` straight to `0037`. Migration 0049's
  `CREATE OR REPLACE FUNCTION` was written against the only version that
  exists on disk (0035's, pre-fix), which still assigns to `NEW` — a
  no-op on a trigger that's actually `AFTER INSERT` live, since Postgres
  discards a row-level `AFTER` trigger's return value. The side-effect
  writes (job_invitations, reservation status, the new notification) all
  still fired correctly; only `jobs.allocation_method` silently failed to
  become `'reservation'`. Fixed in migrations 0050 (explicit `UPDATE`
  instead of `NEW`-assignment, plus a `DROP`+`CREATE TRIGGER ... AFTER
  INSERT` so a from-scratch replay of local migration files converges
  correctly too, not just this already-patched live database — 0035 on
  disk still says `BEFORE INSERT` and always will) and 0051 (the payout
  trigger from migration 0048 is `BEFORE INSERT`, an entirely separate
  phase from this `AFTER INSERT` trigger, not just alphabetically after it
  as 0048 assumed — so a job that starts as `'auction'` and then gets
  reservation-matched needed the same `payout_amount` backfill 0048 already
  gave the express-interest journey trigger, and hadn't gotten it here).
- **Takeaway for future migrations touching existing triggers**: query
  `pg_get_triggerdef()` for the live trigger before assuming a local
  migration file reflects current reality, especially for any trigger this
  session's own history mentions being patched — the local file tree has
  at least one confirmed gap (0036) and there is no guarantee it's the
  only one.
- Verified live, all three, with real seeded data then cleaned up: a
  saved search + matching job produced a notification; a route + a job
  that matches it produced a notification (both directions — job created
  after the route, and route created after the job); a reservation +
  matching job produced a notification AND (after the 0050/0051 fixes)
  correctly flipped `allocation_method` to `'reservation'` and backfilled
  `payout_amount` even when the job started as `'auction'`. Confirmed
  end-to-end in the browser: the alert notification rendered correctly on
  `/partner/notifications`.
- Deferred / not done yet: Alerts' new trigger only fires on `jobs` INSERT,
  same scope as the existing pull-based `alert_matches()` — if a job's
  price/category ever changed after listing (nothing in this codebase does
  that today), a newly-matching alert wouldn't notify retroactively. A
  journey job that starts as `'auction'`/`'click_claim'` and gets
  reclassified to `'express_interest'` shortly after (migration 0043's
  job_stops trigger) may have already triggered an Alerts notification
  pointing at a job that's since moved to a different browsing surface —
  a minor, low-probability staleness window, not fixed this pass.

### 2026-08-03 — Partner-facing disputes
- The admin side (migration 0017) and RLS (migration 0007, "partner can
  read their own and update it only to submit a dispute") have existed
  since early phases, and the admin disputes list's own empty-state copy
  says "Disputed deallocation charges will show up here as soon as
  partners raise them" — but nothing in the codebase ever let a partner
  actually see a charge or raise a dispute. Confirmed by grepping the
  whole codebase for `deallocation_charges`: only admin pages touched it.
  Also confirmed nothing anywhere creates a charge in the first place —
  the `deallocation_charges_insert` policy allows `is_admin()`, but no
  admin UI/RPC exercises it either. That part stays out of scope; this
  pass is specifically the partner-facing view/dispute half.
- **Real semantic gap fixed while building this**: the admin dispute
  detail page treated `reason` as if it were the partner's dispute
  explanation ("Reason ... Submitted {created_at}"), but it should mean
  "why this charge exists" (admin-authored, at charge creation) —
  conflating the two would mean a partner disputing a charge overwrites
  the very reason they're disputing. Since no real data has ever been
  written here, fixed the ambiguity now rather than perpetuating it: new
  `dispute_reason` column (migration 0052), admin detail page updated to
  show both "Reason for charge" and, once submitted, "Partner's dispute"
  as separate sections.
- **Built**: `/partner/disputes` — Needs response / Submitted / Resolved
  tabs, mirroring the admin list's shape (direct table queries against
  `deallocation_charges`, no RPC needed, RLS already scopes it to the
  caller's own rows). `/partner/disputes/[id]` — same linked-job/
  reservation detail layout as the admin side, plus a `RaiseDisputeForm`
  (textarea + submit) shown only while `dispute_status = 'none'`, which
  flips it to `'submitted'` and saves `dispute_reason` — a direct
  `.update()` gated by `.eq("dispute_status", "none")` so a double-submit
  can't silently overwrite an already-submitted dispute. Linked from
  Insights' existing "Deallocations" stat tile (added an optional `href`
  prop to the shared `StatTile` component) rather than a new top-level nav
  item, matching the "link from the relevant parent page" pattern already
  used for Message Templates.
- Verified live, the full loop, both sides: seeded a test charge via SQL
  (as an admin eventually would) — showed up under the partner's "Needs
  response" tab; submitted a dispute with a real reason — flipped to
  "Awaiting review", form disappeared; signed in as
  `admin-test@example.com` — the charge now appeared in the admin
  disputes list (previously impossible, since nothing ever got partners
  past `dispute_status = 'none'`) with both "Reason for charge" and
  "Partner's dispute" showing distinctly; waived it as admin — partner's
  "Resolved" tab correctly showed "Waived" with the resolution text.
  Confirmed the Insights tile is a real link to `/partner/disputes`.
  Cleaned up the test charge afterward.
- Deferred / not done yet: still nothing creates a `deallocation_charges`
  row automatically or through any admin UI — a partner can now respond
  to a charge once one exists, but nothing in this codebase produces one
  yet. The reservation unfilled-fee candidate from the same audit would be
  the natural first real producer, mirroring how `close_expired_auctions()`
  became the first real `partner_notifications` producer.

### 2026-08-03 — Reservation unfilled-fee
- Closes the last of the four leads/trust gaps from this session's audit:
  real AnyVan pays a partner a fee when it can't fill a reservation they
  held open ("if a partner reserves availability and AnyVan can't fill it,
  AnyVan pays a fee for the reservation anyway"). Nothing modelled that —
  a reservation that never got matched just sat at `'pending'` forever,
  with no expiry, no compensation, no record of it having gone unfilled.
- **Deliberately not `deallocation_charges`**: that table (and the
  partner-facing dispute workflow built earlier this same session) is
  money the *partner* owes, with an "uphold/waive" framing that doesn't
  make sense for money flowing the other way. New `reservation_compensations`
  table instead — system-generated only (no partner or admin write policy
  at all, same shape as `partner_notifications`; only the SECURITY DEFINER
  cron function can write it).
- **Fee amount asked, not researched**: unlike the payout commission %
  (where real published AnyVan numbers existed to weigh), no fee schedule
  for unfilled reservations is public anywhere. Asked the project owner
  for a number or formula before building; got no response. Proceeded
  with the earlier-presented recommended default — a flat £50 per
  unfilled reservation — rather than blocking on it. One literal in
  `expire_unfilled_reservations()`, trivial to change or turn into a
  formula later.
- **Built**: `expire_unfilled_reservations()`, same shape and cadence
  (every 5 minutes) as `close_expired_auctions()`/`expire_job_invitations()`
  — finds reservations where `status in ('pending', 'partially_matched')`
  and `date < current_date` (the day passed without ever reaching
  `'fully_booked'`), marks each `'expired'`, inserts a £50 compensation
  row, and notifies the partner. `'accepted'` is a Phase 2 enum value no
  code has ever set — deliberately left unhandled rather than guessing
  what it should do. Partner-facing: the existing Reservations page's
  Historic tab now shows "£50.00 owed to you — went unfilled" under any
  expired reservation, fetched with one extra query keyed off the
  already-loaded expired IDs — no new page needed, the status badge and
  tab split already existed.
- Verified live: seeded a `'pending'` reservation dated yesterday, ran
  `expire_unfilled_reservations()` manually (same "call the cron function
  directly" pattern used for `close_expired_auctions()` earlier), confirmed
  status flipped to `'expired'`, a £50.00 compensation row was created,
  and a notification was generated — then confirmed both the Historic
  reservations tab and the Notifications page rendered it correctly.
  Cleaned up afterward.
- Deferred / not done yet: the fee is a flat rate regardless of reservation
  type (`full_day` vs `custom`) or declared price band (`min_price`/
  `max_price`) — real AnyVan likely scales this, but no rate schedule
  exists to model it against. No way for a partner to dispute an unfilled-
  reservation fee the way they can a deallocation charge (arguably moot,
  since this is money owed *to* them, not a charge against them).

### 2026-08-03 — End-to-end simulation: 3 real bookings through the actual form
- Not a feature build — a live demonstration that the full pipeline this
  session spent most of its time on (quote form → checkout →
  category/allocation derivation → payout calculation → partner
  discovery → claim/bid/express-interest → customer selection) actually
  works together, end to end, through the real UI on both sides. Every
  other test job created this session was inserted directly via SQL for
  speed; these three went through the real multi-step quote wizard,
  autocomplete postcode lookup, real item catalogue, real date/price
  calendar, and real checkout form, with real (if throwaway) customer
  accounts.
- Three fresh customer accounts (`sim-customer-1/2/3@moversnowtest.com`,
  magic-link only, no password ever set) each booked a real move chosen to
  land on a different allocation path:
  - **Click & Claim**: a single small box (£45) correctly derived
    `single-item-transport` and forced `click_claim`; Partner A claimed it
    through Find Work, revealing the full address only after claiming
    (privacy boundary confirmed live, not just in code).
  - **Auction**: 12 office desks (8.82 m³, £163) correctly derived
    `office-relocation` and forced `auction`; Partner A bid £120 through
    Bidding, the auction was closed early by hand (same
    `close_expired_auctions()` technique as the Phase 6b tests) to award
    it without waiting 24h, and `payout_amount` correctly became the
    winning bid.
  - **Express Interest**: a genuine 3-stop route (using "+ Add an extra
    stop" on the real Address step, not a shortcut) started as
    `click_claim`/home-removals and was correctly reclassified to
    `express_interest` by the journey trigger purely from stop count.
    Partner B — the one account that had never accepted the Partner
    Guidelines all session — hit that real gate for the first time,
    accepted it live, expressed interest with a real note through the UI,
    and was picked by the customer from the real "Choose your transport
    partner" screen, which correctly showed the note and triggered the
    real 4-category "Rate your move" section appearing afterward.
- Confirmed the payout figures were correct at every step by checking the
  database directly rather than trusting the UI alone — £33.75 (75% of
  £45), £120 (the winning bid, not a formula), £78 (75% of £104) — the
  same trigger from migration 0048, exercised for the first time by a
  booking that went through the actual checkout route handler
  (`/api/quote/[id]/confirm`) instead of a direct SQL insert.
- Deliberately left all three bookings and accounts in place afterward
  (documented in TEST_ACCOUNTS.md) rather than cleaning them up like every
  other test job this session — they're a real, inspectable trail of the
  whole system working, not throwaway verification noise.

### 2026-08-04 — Rating-gated access
- The last of the three "leads/trust" candidates from the earlier audit.
  Researched AnyVan thresholds, applied as-is per explicit instruction
  ("threshold just same as anyvan"): below 4.5★ average blocks a partner
  from all job discovery entirely; new partners (fewer than 30 completed
  jobs) stay capped to Single Item Transport only until they graduate —
  30 total jobs AND a 4.8+ average. 4.5+ also unlocks Express Pay
  eligibility, surfaced honestly on Insights (no real payout-timing system
  exists yet, so this is a status, not a working toggle).
- New shared helper `app_private.partner_job_access()` computes
  `avg_rating`/`total_jobs`/`is_blocked`/`is_probation` once, reusing the
  exact same rating/job-count definitions `my_performance_summary()`
  already used — no second, possibly-diverging definition of "how many
  jobs" or "what's the rating" introduced. Wired into all three job-
  browsing RPCs (`find_work_jobs`, `find_auction_jobs`,
  `find_express_interest_jobs`): blocked partners get an early empty
  return (same pattern as the existing `v_partner_id is null` check);
  probation partners get one more `WHERE` clause restricting to
  `single-item-transport`. `my_performance_summary()` extended (DROP+CREATE,
  columns added) with `job_access_blocked`, `job_access_probation`,
  `jobs_until_full_access`, `express_pay_eligible`.
- **Deliberately scoped to browsing only** — Reservations and Route
  Matcher are partner-initiated declarations, not browsing, and gating
  those raises separate UX questions (does a blocked partner's existing
  reservation stay live? get cancelled?) this pass doesn't answer.
  **Deliberately skipped the admin-facing "4.7★ intervention" flag** from
  the same research — the admin Partner Performance page already reads
  from `performance_metrics`, a cache table migration 0039 documented as
  having zero rows ever written to it. Wiring a new flag into an
  already-empty page would just be more dead UI; fixing that page to
  compute live (the same fix `my_performance_summary()` already got) is a
  separate, pre-existing gap, not part of this one.
- Verified live, all three states, on the real test partner account:
  **probation** (3 jobs, no rating) — Insights showed "Building trust — 27
  more jobs to unlock full access," Find Work correctly hid the existing
  Office Relocation job while it had previously been visible; **blocked**
  (seeded a real 2★ rating) — Insights showed "Job access restricted,"
  Find Work returned nothing at all, including a freshly-seeded Single
  Item Transport job that would have passed the probation filter,
  confirming blocked correctly overrides probation; **restored** — deleted
  the test rating, confirmed the partner reverted to probation
  automatically (no cached/stale state, since access tier is computed
  live on every call, not stored). All test data cleaned up afterward.
- Deferred / not done yet: no way for an established partner who's above
  30 jobs but averaging between 4.5 and 4.79 to ever "graduate" under this
  literal reading of the researched rule (it requires 4.8+, not just
  30 jobs) — flagged as a real edge case, not fixed, since the project
  owner asked for AnyVan's exact thresholds and this is what a faithful
  reading of them produces. Adjustable by changing one constant in
  `partner_job_access()` if it turns out too strict in practice.

### 2026-08-04 — Admin manual override (assign/reassign a job)
- Closes the "no admin allocation desk" gap from the AnyVan alignment
  check: allocation has been 100% algorithmic since Phase 6, with no way
  for an admin to intervene when the normal channels don't produce a
  result. New `admin_assign_job(job_id, transport_partner_id, vehicle_id)`
  RPC — validates the chosen vehicle is approved and compatible with the
  job's category, flips `matching_status`/`status` to matched/assigned,
  upserts `job_assignments` (the table's `job_id unique` constraint makes
  this a clean single-row assign-or-reassign, not an insert-then-delete
  dance), and notifies the newly assigned partner. If this is a
  reassignment (a different partner already had it), the displaced
  partner gets their own notification too, so they don't keep thinking
  they have a job that's been taken away.
- **Deliberately bypasses rating-gated access** (migration 0054, built
  this same session) — an admin manually placing a job with a specific
  partner is exactly the override case that gate isn't meant to block.
  Vehicle compatibility is still enforced server-side regardless, so an
  admin can't assign a job to a partner with no working vehicle for it.
- **New admin section built from scratch** — no admin Jobs view existed
  at all before this. `/admin/jobs` (Needs assignment / Assigned tabs,
  reusing the same list-page shape as Disputes & Charges) and
  `/admin/jobs/[id]` (route, current assignment if any, and the
  assign/reassign form). Eligible partners for the picker are computed by
  filtering approved vehicles to ones compatible with the job's category
  (same motorbike-compatibility rule used everywhere else), fetched
  directly rather than through a new RPC — `jobs_select`/`vehicles_select`
  already grant admin full access, same pattern the Disputes and Vehicle
  Approvals admin pages already use.
- Verified live: seeded a real unassigned job, assigned it to Partner B
  through the actual admin UI — confirmed `job_assignments` updated,
  Partner B got a notification. Reassigned the same job to Partner A —
  UI correctly showed "Reassigned — the previous partner has been
  notified," confirmed in the database that `job_assignments` held
  exactly one row (updated, not duplicated) and that Partner B received
  the displaced-partner notification. Confirmed the Jobs list page shows
  the final state correctly. All test data cleaned up afterward.
- Deferred / not done yet: no price renegotiation as part of the
  override — real AnyVan's ops desk also negotiates rates with partners
  when reassigning; this only reassigns at whatever `payout_amount` the
  job already has. No audit trail of who reassigned what or why beyond
  the two notifications this generates — a real admin-actions log is a
  separate, larger feature.

### 2026-08-04 — Customer-facing move protection / liability cover
- Closes the "customer-facing cover" gap from the AnyVan alignment check,
  using real figures sourced from Ecogreen's actual Terms & Conditions
  instead of invented numbers or AnyVan's marketing "£50k complimentary
  cover" framing (which this business's contract doesn't offer). Every
  move already carries a standard liability cap under the T&Cs — £25 per
  box, £50 per item, capped at £1,000 for the whole move, with a £100
  deductible per claim — at no extra charge; those are constants
  (`src/lib/constants/liability-cover.ts`), not per-booking data.
- **"Extended Liability Cover" is modelled as a request, not a priced
  add-on** — the T&Cs have no fixed rate for it (clause 11.3: "subject to
  our written acceptance, applicable pricing... rate advised"), so
  checkout only captures a declared value and an optional note for staff
  to follow up and quote directly, the same way the real business already
  does it. It never affects the booked price, and it's explicitly labelled
  as not insurance / not FCA-regulated everywhere it's shown, reusing the
  T&Cs' own wording rather than paraphrasing it.
- Migration 0056: `cover_tier` enum (`standard` / `extended_requested`)
  plus `extended_cover_declared_value` and `extended_cover_notes` on both
  `quotes` (captured at checkout, same pattern as `access_notes`) and
  `jobs` (copied over by `confirmBookingAndCreateJob` so the request is
  visible without joining back to the quote).
- New "Move protection" section in `CheckoutForm` between the notes and
  payment-placeholder sections: standard cover figures shown to every
  customer, plus an optional "Request Extended Liability Cover" checkbox
  that reveals a declared-value field and notes. `OrderSummary` and the
  customer booking detail page (`/customer/bookings/[id]`) both show a
  matching "What's covered" / "Move protection" summary, including the
  declared value when Extended Cover was requested.
- Verified live: created a real quote through the public quote API,
  booked it through the actual `/quote/checkout` UI as a signed-in test
  customer with Extended Cover requested (£3,500 declared value + a
  note) — confirmed the price stayed £53.00 (unaffected by the request),
  the `jobs` row got `cover_tier = 'extended_requested'` with the
  declared value and note copied over correctly, and the booking detail
  page renders "Extended Cover requested — £3,500 declared value. Our
  team will be in touch to confirm pricing." Also confirmed the default
  (no request) path shows just the standard-cover copy. `npx tsc
  --noEmit` clean. Test booking left in place (see TEST_ACCOUNTS.md).
- Deferred / not done yet: no admin-facing queue for Extended Cover
  requests yet — today staff would have to query `jobs` directly by
  `cover_tier = 'extended_requested'` to find them; a real ops workflow
  would need a list view (similar to Disputes) and a way to record the
  quoted rate once agreed. No rate card exists because the business's own
  T&Cs don't have one — this needs a real decision from the business, not
  a guessed number.

### 2026-09-17 — Unified CRM platform: specification (SPEC.md, DESIGN.md, ROADMAP.md)
- Built: no application code. Three planning documents at the repo root —
  `SPEC.md` (a Phase 1 build prompt for Claude Code: architecture, schema,
  RLS, pricing engine, sequence engine, milestones M0–M10 with acceptance
  criteria), `DESIGN.md` (design system and a craft audit gate), and
  `ROADMAP.md` (phases 2–6, with vendor and compliance items separated from
  development items).
- Key decisions: (1) The CRM is a **new app at `crm/`** with its own Supabase
  project, not an extension of the movers-now marketplace — the marketplace is
  a two-sided partner/auction product and its `jobs`/`quotes` model directly
  conflicts with an in-house operations model; 56 migrations of working code
  were not worth destabilising. (2) Hosting moves to **Vercel** per
  instruction; note `netlify.toml` and `claude.md.md` still describe Netlify
  for the existing app — migrating that app is a separate task, not done here.
  (3) The six brand WordPress sites stay live; the platform integrates via a
  signed lead-intake API plus an embeddable quote widget, rather than
  rebuilding six ranking sites. (4) Scope cut hard to lead → quote → book →
  pay → chase → review plus a thin dispatch slice; everything else phased in
  `ROADMAP.md`. (5) Typeface is **Geist Sans/Mono** — SF Pro cannot be licensed
  as a webfont for a commercial web app, and `-apple-system` would fragment the
  product across Windows and Android. (6) Chart palette is fixed and
  deliberately *not* brand-themed; the eight-slot order in `DESIGN.md` §7 was
  validated (worst adjacent CVD ΔE 9.1 light / 8.4 dark, normal-vision 19.6),
  not chosen by eye.
- Blocked on business input: real brand hex values, logos and sender domains
  for all six brands; the actual rate card (base rates, mileage, volume bands,
  crew rates, surcharges, VAT treatment); whether Stripe / email provider /
  WhatsApp Business API credentials exist; data retention periods per record
  class. `SPEC.md` §1 requires these to be marked `VALUE REQUIRED FROM
  BUSINESS` rather than guessed.
- Deferred / not done yet: nothing under `crm/` exists — M0 has not started.
  Several items from the brief are deliberately refused or reclassified in
  `ROADMAP.md` rather than scheduled (facial-recognition clock-in, in-house
  PAYE/NI calculation, tachograph integration, customs declarations, 3D room
  visualiser); each carries its reasoning there.

### 2026-09-17 — CRM Phase 1: M0 scaffold, M1 schema/RLS, M4 pricing engine
- Built: the `crm/` app — Next.js 14 + Supabase + Tailwind, Vercel-targeted,
  with `src/styles/tokens.css` as the single source of colour, type, space,
  shape and motion. 16 migrations under `crm/supabase/migrations`. The pure
  domain layer under `crm/src/domain` (money, clock, item catalogue, volume,
  pricing engine, pipeline transitions, duplicate/cross-brand matching, lead
  scoring, routing, sequence scheduler). UI primitives, staff shell, login,
  dashboard and leads workspace. `DECISIONS.md` answers the four items
  `SPEC.md` §1 had blocked on business input.
- Key decisions: (1) `crm/` is its own app with its own Supabase project — the
  marketplace's partner/auction model conflicts with an in-house operations
  model, and its 56 migrations were not worth destabilising. (2) Geist Sans and
  Geist Mono, self-hosted: SF Pro is not licensable as a webfont and
  `-apple-system` would fragment the product across Windows and Android.
  (3) Charts are deliberately NOT brand-themed — the eight-slot categorical
  order in `DESIGN.md` §7 is validated (worst adjacent CVD ΔE 9.1 light / 8.4
  dark) and would stop being readable if tinted per brand. (4) Seed migrations
  for the catalogue, rate cards and sequences are GENERATED from the TypeScript
  domain definitions by `npm run seed:generate`, so the database and the
  pricing engine cannot drift. (5) Double-booking, quote immutability,
  audit-log append-only and outbox idempotency are all database constraints,
  not application checks.
- Verified, not assumed: `npm run typecheck` clean; `npm run lint` clean;
  `npm run build` green; 60 unit tests pass; `npm run db:verify` applies all 16
  migrations to a throwaway Postgres 16 and passes 47 assertions covering brand
  isolation both ways, crew price exclusion, privilege escalation,
  double-booking, quote freezing, attendance, outbox and webhook idempotency,
  and seed integrity. The running app was smoke-tested: `/login` renders 200
  with the security headers, `/dashboard` 307s to `/login` without a session,
  `robots.txt` disallows everything, and the login screen was screenshotted in
  both themes at 1280px and checked for horizontal overflow at 320px.
- Three bugs were found by those checks and fixed: the sequence-step
  stop-condition CHECK used `array_length()`, which is NULL for an empty array
  and so passed; `next_reference()` had an ambiguous plpgsql variable; and an
  RLS escalation test was passing vacuously because the subquery it used was
  itself filtered by RLS. Worth carrying forward: an RLS denial on UPDATE or
  DELETE is a silent no-op, not an error, so application code must check
  affected-row counts rather than relying on a thrown error.
- Blocked on business input (recommended defaults are seeded and flagged, see
  `DECISIONS.md`): real brand hex values and logos; the actual rate card — every
  seeded card carries `provisional = true`, which is intended to drive a
  PROVISIONAL PRICING watermark on the quote PDF; current TfL congestion and
  ULEZ rates, seeded at zero rather than guessed; the gov.uk bank-holiday list;
  retention periods, which need legal sign-off, and Scotland's differing
  prescription period for the Edinburgh and Glasgow brands.
- Deferred / not done yet, within Phase 1: M2 intake API and embeddable widget;
  M3 lead detail and stage transitions in the UI (the domain logic exists and is
  tested, nothing is wired to a route); M5 quote PDF and view tracking; M6
  payments, webhooks and the booking transaction; M7 the cron tick and outbox
  dispatcher (the scheduler is pure and tested, but nothing calls it yet); M8
  the dispatch calendar and job sheet; M9 dashboards beyond the four KPI tiles;
  M10 GDPR export/erasure and 2FA. `crm/src/lib/db-types.ts` is hand-written and
  should be replaced by generated Supabase types once a project exists. No
  Supabase project has been created — that incurs cost and was not authorised.

### 2026-09-17 — CRM Phase 1: intake, scheduler, booking, GDPR — and closing out
- Built: provider adapters with working stubs (payments, email, SMS, WhatsApp,
  PDF, geo) behind interfaces, so nothing in the domain imports a vendor SDK
  and no flow blocks on procurement. `/api/intake/lead` — HMAC-signed with a
  replay window, idempotent, storing the raw body before validation.
  `/api/cron/tick` plus `vercel.json` — the single 5-minute scheduler that
  advances sequence enrolments into the outbox and dispatches it. Migrations
  0017–0019: `create_intake_lead`, `book_accepted_quote`,
  `claim_due_enrolments`, `claim_due_outbox`, `mark_outbox_sent`,
  `enrol_in_sequence`, `generate_job_sheet`, `export_customer_data`,
  `erase_customer_data`. `crm/README.md` with the commands that prove each
  claim.
- Key decisions: (1) Lead creation and booking are Postgres functions, not
  sequential PostgREST calls — a request dying halfway would otherwise leave a
  customer with no lead, or a job with no invoice. (2) Stop conditions are
  derived at dispatch time inside `claim_due_enrolments` from live state, never
  from a flag written at enrolment, so a customer who books an hour before the
  chase is due does not receive it. (3) The fair-use cap counts across all six
  brands: a customer experiences one sender, not six. (4) Erasure anonymises
  rather than deletes where financial records must survive the statutory
  period, and deletes behavioural data outright. (5) The job sheet is a frozen
  snapshot carrying access notes verbatim and payment status but never a price.
- Verified: typecheck, lint and build clean; **81 unit tests**; **88 SQL
  assertions** across 19 migrations applied to a throwaway Postgres 16. New
  coverage includes signature tampering, replay and length-mismatch handling,
  adapter contracts, intake customer reuse, booking atomicity, concurrent
  outbox claiming, cross-brand unsubscribe, job-sheet contents and GDPR
  erasure.
- One bug found and fixed: `book_accepted_quote` accepted `accepted` as an
  input status so a retry would be safe, but nothing stopped a second job and a
  second invoice being raised for the same quote. Now guarded and tested.
- Deliberately stopped here, at the user's instruction not to incur cost. No
  Supabase project was created, no paid provider was signed up for, and the
  remaining work is UI that cannot be meaningfully verified without a live
  project: the visual inventory builder, the quote PDF and send flow, the
  Stripe webhook route, the dispatch calendar, the embeddable widget, the lead
  detail screen, the retention purge job and 2FA enforcement. `SPEC.md` §15
  now records the true status of every milestone rather than a plan.

### 2026-09-17 — Design audit: typography, contrast, layout floors, photography slots
- Built: `/styleguide` — every primitive and all five required states with
  static data and no database, as a surface the craft gate can actually run
  against. `npm run audit` (`crm/scripts/audit.mjs`) — axe across every audit
  surface in both themes, 320px and 640px layout floors, a keyboard walk
  asserting a visible focus ring at every stop, and touch-target measurement.
  `BrandPhoto` with a designed no-asset state, and
  `crm/public/photos/CREDITS.md` as the sourcing rules and licence register.
  The sign-in screen is now a two-panel layout using that photography slot.
- Key decisions: (1) **Weight now drops as size grows, and tracking tightens
  with it** — display went 600→400 at −0.032em, titles 600→500. That pairing is
  what separates type reading as modern from type reading as merely large, and
  it is bound into the size token so a size cannot be used without its optical
  correction. (2) Status hues are **mark** colours; status used as text takes a
  separate `-text` step stepped for its surface. (3) Photography is slots plus
  a designed fallback rather than committed assets — the sandbox network policy
  blocks Unsplash and Pexels, so no licensed image could be fetched. The
  fallback is near-neutral on purpose: an accent-tinted first version read as a
  colour swatch rather than as a surface awaiting a photograph.
- Verified: `npm run audit` passes clean — zero axe violations at any impact
  across `/login` and `/styleguide` in both light and dark, zero horizontal
  overflow at 320px and 640px, a focus ring on every tabbable element, no touch
  target under 44px. Plus typecheck, lint, build, 81 unit tests and 88 SQL
  assertions. Screenshots reviewed in both themes.
- Three real defects the audit caught, all of which would have shipped: the
  muted ink token `#7c7c85` measures 4.13:1 on white and fails AA — on ten
  nodes at once, because every caption inherits it, now `#6b6b74` at 5.28:1;
  `status-critical` used as text measures 4.09:1 on the dark canvas, now a
  separate text step at 6.90:1; and panels stretched their grid track instead
  of scrolling, pushing the page 290px wide at a 320px viewport, because a grid
  item defaults to `min-width: auto` — `Panel`, `DataTable` and `TableSkeleton`
  now set `min-w-0`. The last one would have hit the real leads table on a
  phone, not just the styleguide.
- Also corrected: an earlier touch-target reading of 21px was my own
  measurement against a stale build, not a defect — real heights are 44px.
- Deferred: no licensed photography is committed. `BrandPhoto` takes a `src`
  and the credits register is ready; dropping files into `crm/public/photos`
  and filling in one row per asset is all that remains.

### 2026-09-17 — Theme rebuilt from the real EcoGreen brand
- Built: the whole token system re-derived from ecogreenmovers.co.uk's live
  Elementor global kit, read through the WordPress connector rather than
  eyeballed: navy `#161A36` as the ink ramp, the brand's warm off-white
  `#F9F7F5` as the sunken surface, lime `#7DB903` as the accent, `#111429` and
  `#161A36` as the dark grounds, Inter (self-hosted via
  `@fontsource-variable/inter`), and square controls matching the site's button
  radius of 0 with its uppercase, wide-tracked, generously padded treatment.
  Migration 0020 carries the real brand records, including
  `info@ecogreenmovers.co.uk` and the real logo URL.
- Key decisions: (1) An accent is **four tokens, not one** — a fill, what sits
  on the fill, the same family stepped for text, and the dark pair. EcoGreen
  forced this: its lime works as a fill at any size and fails as text. (2) One
  typeface across all six brands even though Glasgow Moving sets Instrument
  Sans and Removals Company Manchester sets Heebo — a CRM that changes typeface
  on brand switch reads as six products. (3) Four of the six sites still carry
  Elementor factory defaults (`#6EC1E4`/`#61CE70`) and continuumgreen.co.uk is
  still titled "We Are Building Continuum Green"; a theme default is not a
  brand, so those four inherit the flagship palette and carry
  `brand_identity_confirmed = false` rather than being seeded as if designed.
- **Two accessibility findings on the live website**, both worth fixing there:
  its primary button is white on the lime at **2.38:1**, and the lime as text
  on white is the same. The brand's own navy on that lime is 7.14:1 and its own
  darker green `#235F2A` is 7.66:1 as text, so the CRM keeps the exact brand
  hues and changes only what sits on or beside them. Recorded in `tokens.css`
  beside the values so nobody "fixes" them back.
- Verified: `npm run audit` passes clean on the new palette — zero axe
  violations in both themes, no overflow at 320/640px, focus ring on every
  tabbable, no target under 44px. Plus typecheck, lint, build, 81 unit tests
  and 92 SQL assertions. Preview republished.
- Deferred: Eco London Movers has no WordPress connector in this session, so
  its identity could not be read. The other three unbranded sites need a real
  brand before their accents mean anything.

### 2026-09-17 — Customer-facing quote funnel at /quote
- Built: a public quote page following the structure of the StudioOS reference
  the user supplied (sticky header · hero with eyebrow, large headline, dual
  CTAs, social proof and an overlapping detail card · services grid · reasons
  with testimonials · specialist work · three-step explainer · enquiry form ·
  footer), rebuilt entirely on EcoGreen's own brand. `src/lib/brand-content.ts`
  holds the copy; `QuoteForm` posts the shape `/api/intake/lead` accepts, so a
  submission becomes a routed, scored, de-duplicated lead.
- Key decisions: (1) **Every string is the business's own.** Headline, service
  names, the three branch numbers, the reviews and the case studies were read
  from ecogreenmovers.co.uk through the WordPress connector. Nothing about
  coverage, credentials or customer outcomes is invented. (2) **No price
  appears.** The reference has four pricing cards; the rate card here is still
  provisional and this business quotes a fixed price rather than publishing
  one, so that section became a three-step "how pricing works" explainer.
  Inventing a "from £X" would have been both wrong and off-brand. (3) The
  brand site's own H1 (68px/1.2/600) and body (16px/1.5/300) sizes were added
  as `hero` and `prose` tokens, scoped to customer-facing pages — 300-weight
  body at 14px would be too fragile for staff screens read all day. (4) This
  does not replace the WordPress sites (SPEC.md §1, decision 4); it is the
  funnel they link into.
- Verified: `npm run audit` passes clean across `/login`, `/styleguide` and
  `/quote` in both themes — zero axe violations, no overflow at 320/640px,
  focus ring on every tabbable. Plus typecheck, lint, build, 81 unit tests, 92
  SQL assertions.
- One defect found: the brand's own "Text Light" `#7A7E99` clears 4.5:1 on the
  dark canvas but only reaches 4.27:1 on the raised navy and 3.96:1 on the
  overlay — and muted text mostly appears inside cards, on exactly those
  surfaces. Stepped to `#8A8FAC`, which passes on all three. The earlier check
  had tested the canvas only.
- Deferred: the reference's testimonial carousel and sticky mobile CTA bar; no
  photography (slots render their fallback); the page is noindex like the rest
  of the app, which is correct while the WordPress pages hold the rankings.

### 2026-09-17 — The CRM itself: website → login → backend, with real photography
- Corrected course: the previous session had built a marketing page and called
  it progress. The product is a centralised CRM, so this session built the
  operational screens — grouped navigation across five module groups, a top bar
  with brand switcher and command-palette search, dashboard, leads workspace,
  lead detail with the full quote breakdown and history, a week job calendar
  with jobs placed by real start time and duration, and the manual send queue.
- Built: `src/lib/sample-data.ts` and a sample mode. With no Supabase project
  configured the app opens in a realistic working state instead of bouncing to
  a login it cannot complete, with a persistent banner stating that every
  figure is an example. The public site moved to `/` with `/quote` redirecting,
  so there is one public page, and it now links to `/login`, which links back.
- **Photography solved without stock sites.** The egress proxy blocks Unsplash
  and Pexels, but EcoGreen's own WordPress media library has 555 images, so
  five were pulled through the site connector, re-encoded to WebP at the sizes
  the pages need (201 KB for all five), and committed. Better than fresh stock
  three ways: the business already holds the licence, the images are the ones
  its customers already see, and nothing new had to be cleared. Alt text came
  from the library's own alt fields. Registered in `public/photos/CREDITS.md`.
- Typography pushed further toward modern and minimal: display weights dropped
  from 600 to **300** with tracking tightened to −0.035em, title-1 and title-2
  to 400, eyebrows to 11px/500. This departs from the brand site's H1 weight of
  600 on purpose — at 68px, 600 is a poster and 300 is an interface — and it is
  one token to revert.
- Verified: `npm run audit` now covers eight pages in both themes and passes
  clean. Plus typecheck, lint, build, 81 unit tests, 92 SQL assertions.
- Four defects the audit caught: muted text on a highlighted calendar block
  failed contrast in dark mode; the dashboard pushed the page 338px wide at
  320px; a standalone back-link was a 16px touch target; and the dashboard
  table wrapped references across four lines, making 36px rows 145px tall.
  That last one only showed up in a screenshot — the audit passes a wrapped
  table, which is why looking at the render is still a required step.
- Deferred: Quotes, Customers, Job sheets, Crew, Sequences, Templates,
  Invoices, Payments, Sales tracker and Lead providers are in the navigation
  but not built. The command palette is an affordance, not yet functional.

### 2026-09-17 — Green/teal palette, dashboard charts, full module map, recommendations
- Built: the palette re-derived as deep green + blue-green + white +
  near-black, with every neutral carrying a green bias so the near-black reads
  as the same family rather than sitting on top of the greens. Chart components
  (sparkline, two-series line, bar rows, actual-against-target) as inline SVG
  with no library, each with a table view and native `<title>` tooltips. The
  dashboard rebuilt around four headline figures with sparklines, leads
  year-on-year, pipeline by stage, booked-against-target by brand, lead source
  performance, crew on shift and the send queue. The left panel expanded from
  15 to **44 modules across 10 groups**, with unbuilt ones marked "soon".
  `RECOMMENDATIONS.md` documents the module map, a seven-component pricing
  matrix, the people/time/payroll boundary, and 54 improvements ordered by
  return.
- Key decisions: (1) **The product palette owns the interface; a brand is a
  mark, not a repaint.** The previous per-brand `--accent` override meant the
  UI changed colour on brand switch and, because an inline value outranks a
  theme, silently overrode dark mode — charts rendered in the light-mode brand
  colour on a dark ground. Per-brand colour still drives what customers see:
  PDFs, emails, the public site. (2) The pipeline funnel uses **position for
  order and one colour**, because a five-step ordinal ramp cannot clear the
  contrast floor against both a white and a near-black surface. (3) The chart
  order was **validated, not chosen** — aqua-led so the first series sits in
  the brand family, worst adjacent CVD ΔE 9.1, worst normal-vision ΔE 27.6,
  all eight above 3:1, in both modes. (4) Targets are a reference rule on the
  same axis, never a second y-scale. (5) Type tightened again: display 2.75rem
  at weight 300 and −0.038em, body to 14px.
- Verified: `npm run audit` across eight pages in both themes passes clean;
  typecheck, lint, build, 81 unit tests, 92 SQL assertions.
- Two defects caught: `--ink-4` on the "soon" nav items failed contrast in dark
  mode on 40 nodes — and distinguishing planned modules by colour alone was
  wrong regardless, so they now carry the word "soon"; and the brand-accent
  override described above, which only showed up in a screenshot because every
  automated check passes a chart drawn in the wrong colour.
- Deferred: 38 of the 44 modules are routed but not built. `RECOMMENDATIONS.md`
  §6 gives the build order, starting with the pricing matrix and cost capture.

## Session — SQL install verified end to end

The `3F000: schema "private" does not exist` error is closed out, and now
proven closed rather than asserted.

- Added `crm/scripts/parts-verify.sh` (`npm run db:verify:parts`). It applies
  `supabase/parts/*.sql` to a throwaway Postgres 16 three ways: each part alone
  on an empty database, all five in order, then all five in order again.
- Results: part 1 succeeds standalone; parts 2–5 refuse with a plain-English
  message naming the part to run first (`Run PART 1 (schema) first — table
  "quotes" does not exist.`), never `3F000`. All five in order succeed, and
  succeed again on a second pass. Final shape: 42 tables, 68 RLS policies, RLS
  enabled on all 42, 10 `private` helpers, 6 brands, 67 catalogue items,
  36 rate-card rows.
- Rewrote `crm/scripts/bundle-sql.sh` to generate `supabase/install.sql` from
  the parts rather than from the superseded `migrations/` directory, and
  regenerated it (2,556 lines / 123 KB). Verified `install.sql` alone on a
  clean database, twice, zero errors.
- Throwaway cluster stopped and deleted afterwards; nothing hosted, nothing
  billable.

## Session — CRM live on Supabase, screens wired to real data

- **Database live.** Restored the paused `EcoGreem Movers Hub` project
  (eu-west-2, London — the right region for UK staff; the other project is in
  Singapore). Free tier, £0. Installed the full schema through the management
  API: 42 tables, 68 RLS policies, RLS on all 42, 10 private helpers, 6 brands,
  67 catalogue items, 36 rate cards. Every figure matches the locally verified
  build. `MoversHub` was left untouched — it holds the marketplace app's live
  data and its `customers`/`jobs`/`quotes` tables would have collided.
- **Two security holes closed**, both found by Supabase's advisor after install:
  `next_reference` was reachable by `anon`, and the three `SECURITY DEFINER`
  functions granted to `authenticated` never authorised their caller, so any
  staff session could act across every brand by uuid. Fixed live and in the
  parts.
- **Seven staff accounts**, one per `brand_role` — see `CRM_ACCOUNTS.md`. The
  permission ladder was measured, not assumed, by setting each account's JWT
  claim and calling the real helpers.
- **The screens were showing fabricated data.** Every staff page imported
  `sample-data` unconditionally while only the layout touched Supabase, so the
  moment real credentials were set the sample banner would disappear and the
  invented pipeline would remain — presented as the business's own. Added
  `src/lib/data/` and wired leads, lead detail, calendar, send queue and the
  dashboard to real queries through the session client, so RLS decides scope.
  Where no honest figure exists yet (median first response, trend charts, crew
  on shift) the screen now says so instead of borrowing a sample value.
- **Rate cards screen built** — `RECOMMENDATIONS.md` §6 puts the pricing matrix
  first, and it is the one thing blocking real quotes. Shows all seven
  components per category with the progressive volume bands, and leads with how
  many cards are still provisional.
- Vercel's free tier runs cron once a day, so the 5-minute sequence tick moved
  to `pg_cron` in `supabase/parts/06_scheduler.sql`.

Verified: typecheck clean, 81/81 tests, lint clean, production build (13
routes), and every page returns 200 with the expected content rendered.

Not verified from here: the app talking to the live database. This sandbox's
egress proxy blocks `*.supabase.co`, so the wiring is proven by build and by
direct SQL against the live project, not by a round trip through the running
app. First real sign-in is the test that closes that gap.

## Session — sign-in proven working end to end

The sandbox cannot reach `*.supabase.co` (organisation egress policy), which
had left every claim about authentication unverified. Resolved by issuing the
requests **from inside the database** with `pg_net`: the project can reach its
own API, so the same GoTrue and PostgREST endpoints the browser uses were
exercised directly.

- **Sign-in works.** All seven accounts return HTTP 200 with an access token; a
  deliberately wrong password returns 400 `Invalid login credentials`, so the
  endpoint is discriminating rather than permissive.
- **RLS proven through PostgREST with real JWTs**, not by calling helpers as
  superuser. `rate_cards` returns rows to owner/manager/ops/accounts/sales and
  **zero rows to crew and viewer** — commercially sensitive pricing is invisible
  to crew, as designed. `staff` returns each person their own row.
- **Fixed `auth_rls_initplan`**: `staff_read` and `staff_self_update` called
  `auth.uid()` per row; wrapped in `(select …)` it is evaluated once per query.
  Re-ran the PostgREST ladder afterwards to prove access was unchanged.
- **Added 45 covering indexes** for foreign keys, including every join the data
  layer makes (`leads.customer_id`, `jobs.quote_id`, `invoices.customer_id`).
- Deleted the `net._http_response` rows afterwards: the verification had stored
  live JWTs in a table.

Deliberately not changed: `multiple_permissive_policies` on 25 tables. Each
table has a read policy and a `for all` write policy, and `for all` includes
SELECT, so both are evaluated on every read. Splitting the write policies into
insert/update/delete would halve that work and appears behaviour-preserving
(the write role outranks the read role on every table), but "appears" is not
good enough on a system about to take real bookings, and the gain is
theoretical on an empty database. Left as a documented trade-off.

### Pipeline smoke test (live database, rolled back)

Ran the whole chain against the live project inside a transaction that ends in
a deliberate raise, so nothing persisted (verified afterwards: 0 leads, 0
customers, 0 quotes, 0 jobs, 0 invoices, 0 audit rows; seed intact at 6 brands,
36 rate cards, 7 staff).

    lead EGM-2609-0001 → quote sent → price frozen ok → job + invoice
    → double-booking blocked ok → job sheet ok → gdpr export+erasure ok

Each step asserted its outcome rather than just running: the invoice total had
to equal the quote, the job sheet had to name its own job, erasure had to
report the financial record retained, and the two guards (frozen pricing after
send, one job per quote) had to actually refuse.
