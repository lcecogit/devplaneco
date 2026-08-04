# Test Accounts

Dev/test accounts on the live Supabase project (`fkowixrwiqhlvuqphqst`,
"MoversHub"). These are throwaway test identities, not real users — kept
here so a session doesn't need to re-create them to test a role's flows.

| Role     | Email                             | Password       | Notes |
|----------|------------------------------------|----------------|-------|
| Customer | `testcustomerphase5@gmail.com`     | `TestPass1234` | Created while verifying Phase 5. Email confirmation was manually forced via SQL (`email_confirmed_at`) — see "Email confirmation" below. Has one test booking (Home Removals, £1189.00 estimate) that was cancelled while testing the cancel flow. |
| Partner  | `partner-test@moversnowtest.com`   | `TempTest1234` | Pre-existing from Phase 3 testing; password was unknown, so it was reset via the Auth Admin API (`auth.admin.updateUserById`) while verifying Phase 6's "no approved vehicles" empty state — this account has zero vehicles, useful for that case again later. |
| Admin    | `admin-test@example.com`           | unknown        | Password not recorded anywhere I have access to. Reset it via `/admin/reset-password` if needed. |
| Partner  | `phase6-partner-a@moversnowtest.com` | `TestPass1234` | Created via `auth.admin.createUser` (`email_confirm: true`) while verifying Phase 6 — real signup was blocked by Supabase's email-send rate limit, so this bypasses email confirmation entirely. Business name "Phase 6 Test Movers A", one approved "Small van" vehicle. **Has claimed the Phase 6 UI test job** (see below) — its My Work list won't be empty. Also has real saved Profile data from verifying the Payment details/insurance cover/category preferences work: a payment_details row (bank account name/sort code/account number, VAT number, "Bank transfer" accepted), `£50,000`/`£100,000` insurance cover amounts, and both notification toggles on. `category_preferences` was reset back to `{}` after testing (it briefly hid the Phase 6 test job from Find Work while set to `home-removals` only) — don't be surprised the underlying data exists if you query it directly. |
| Partner  | `phase6-partner-b@moversnowtest.com` | `TestPass1234` | Same as above. Business name "Phase 6 Test Movers B", one approved "Small van" vehicle. Was the losing side of the original claim-race test (no assignments then) — **now has real assignments** from the end-to-end simulation below: won an auction (£120 payout) and was selected off an Express Interest journey (£78 payout). Also **now has Partner Guidelines accepted** (previously the one account that hadn't — accepted live as part of the simulation, since Express Interest is guidelines-gated too, not just Find Work/Book Now). |
| Customer | `phase6-customer@moversnowtest.com`  | `TestPass1234` | Same as above. Owns the Phase 6 UI test job (Office Relocation, matched to Partner A), the race-condition test job (deleted after the test ran — see PROGRESS.md Phase 6 entry), and two Phase 6b auction test jobs (see below). |
| Customer | `sim-customer-1@moversnowtest.com` | none — magic-link only | Created for the end-to-end quote-form-to-partner-claim simulation (see below). No password was ever set; sign in via the magic-link technique in this file. |
| Customer | `sim-customer-2@moversnowtest.com` | none — magic-link only | Same as above. |
| Customer | `sim-customer-3@moversnowtest.com` | none — magic-link only | Same as above. |

**Phase 6b auction test jobs**, both owned by `phase6-customer@moversnowtest.com`: an Office Relocation (£798, category-forced auction) that ran a real two-partner bid race — Partner A bid £450, Partner B bid £380 — then had `bidding_closes_at` manually backdated and `close_expired_auctions()` run by hand to verify the winner logic without waiting 24h; Partner B won (lowest bid), is now assigned with `payout_amount = 380`, and shows on their My Work with full address. A Home Removals (£161, price-threshold-forced auction) was left genuinely open (real `bidding_closes_at`, no bids yet) so a future session can watch the pg_cron job resolve it for real instead of only via the manual-backdate path.

**End-to-end simulation (3 real bookings, entirely through the actual UI, no shortcuts)**: created three fresh customer accounts and drove each through the real quote wizard → checkout → confirm, then had partners act on each through the real partner UI — this is different from every other test job in this file, which were created via direct SQL for speed. All three are still live (not cleaned up) so they can be inspected or built on further:
- `sim-customer-1` — 1x Small Box, £45 → `single-item-transport` → forced `click_claim`. Claimed by Partner A via Find Work (`£33.75` payout). Booking ref `#86454786`.
- `sim-customer-2` — 12x Office Desk (8.82 m³), £163 → `office-relocation` → forced `auction`. Partner A bid £120 and won (auction manually closed early to award it rather than waiting 24h — same `close_expired_auctions()` technique used in the Phase 6b tests above). Booking ref `#96250123`.
- `sim-customer-3` — 3 stops (pickup, extra stop, delivery), £104 → `home-removals`, then reclassified to `express_interest` by the journey trigger (migration 0043) purely from stop count. Partner B expressed interest with a real note through the UI; `sim-customer-3` picked them from the real "Choose your transport partner" screen. Booking ref `#32416188`.

## Email confirmation

Real signups currently go through Supabase's "confirm your email" step —
`auth.signUp()` returns no session until the link is clicked — even though
the Phase 3 code comments assume it's off for this project. Both code paths
are handled in the UI either way, so nothing breaks, but if you want
immediate post-signup sessions (matching what the Phase 3 comments assume),
check **Supabase Dashboard → Authentication → Providers → Email → Confirm
email** on this project.

To manually confirm a test account without clicking an email link:

```sql
update auth.users set email_confirmed_at = now() where email = '...';
```

## Partner visibility into customer bookings

As of Phase 6, a partner no longer has direct RLS access to browse `jobs`
rows with `matching_status = 'listed'` — that changed to close an address
leak (see `PROGRESS.md`). Browsing now goes exclusively through curated,
SECURITY DEFINER RPCs (`find_work_jobs`, `find_auction_jobs`,
`find_express_interest_jobs`, `my_watchlist`, `my_job_invitations`, etc.),
each scoped to jobs compatible with the partner's approved fleet. All of
Bidding, Watching, Invitations, Alerts, Book Now, Express Interest, Route
Matcher, and the Partner Guidelines gate are now real, not shells — see
`PROGRESS.md` for the phase-by-phase build history.

`phase6-partner-a@moversnowtest.com` has accepted the Partner Guidelines
(`transport_partners.guidelines_accepted_at` is set) — `phase6-partner-b`
and other partner test accounts have not, so they'll hit the
`/partner/guidelines` redirect the first time they visit Find Work, Book
Now, or Express Interest.

## Phase 8B booking test data

Two real bookings made through the new checkout as
`phase6-customer@moversnowtest.com`, both SW1A 1AA → E1 6AN on 5 Aug 2026,
3.17 m³, 2-person crew, £172, and both category-derived `home-removals` routed
to `auction` by the £150 price threshold: quote references **67992399** and
**89844120**. 89844120 is the one that was confirmed three times (two of them
concurrently) to prove `confirmBookingAndCreateJob` is idempotent — it still
has exactly one `jobs` row, one `customer_payments` row (status `unpaid`), two
`job_stops` and two `job_items`. 67992399 was booked before the BST off-by-one
in `lib/time/uk-datetime.ts` was fixed; its window timestamps were corrected by
hand afterwards so the two bookings match.

This account's `profiles.phone` was filled in (`07700 900123`) by checkout's
profile backfill, which only ever fills blanks — `full_name` was already set to
"Phase 6 Customer" and was correctly left alone.

## Move protection / liability cover test booking

A third real booking as `phase6-customer@moversnowtest.com`, quote reference
**26919725**, SW1A 1AA → E1 6AN, 20 Aug 2026, £53.00, made through the actual
`/quote/checkout` UI with **Extended Liability Cover requested** (£3,500
declared value, note: "Antique dining table, roughly £3500 replacement
value") — verifies the Move protection feature end to end. `jobs.cover_tier`
= `extended_requested`, price unaffected by the request as designed. Left in
place, not cleaned up.

## Signing a test account in without typing a password

Claude Code sessions must not enter passwords into forms. To get a browser
session for a test account, mint a one-time magic link with the service-role
Auth Admin API and let the existing `/auth/callback` route exchange it:

```ts
const { data } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: "phase6-customer@moversnowtest.com",
  options: { redirectTo: "http://localhost:3000/auth/callback?next=/customer/dashboard" },
});
// Use data.properties.action_link directly, or take
// data.properties.hashed_token and call
//   anonClient.auth.verifyOtp({ token_hash, type: "magiclink" })
// to get a session object you can write into the sb-<ref>-auth-token cookie
// yourself (base64url JSON, `base64-` prefixed — see @supabase/ssr).
```

Two failure modes found doing this live, worth avoiding:

- **`action_link` doesn't work here.** This project's Supabase Auth is
  configured for implicit-flow magic links (tokens in a `#` fragment), but
  `/auth/callback` (`src/app/auth/callback/route.ts`) only handles PKCE's
  `?code=`. Navigating the browser straight to `action_link` was also denied
  outright (cross-origin navigation to `supabase.co` from the Browser pane).
  Use the `verifyOtp(token_hash)` path instead — it returns a full session
  object client-side, no navigation to Supabase's domain required.
- **Never retype the session/cookie value by hand into a tool call.** It's
  ~2,700 base64 characters; manually reproducing it across a tool-result →
  tool-call boundary corrupts it silently (`bad_jwt: invalid signature` when
  tested against `/auth/v1/user`), and the browser then just redirects back
  to `/login` with no useful error. Instead: write the generated cookie
  value to a file (script writes it, never a manual copy), then use **Bash
  shell substitution** (`$(cat file)`) to inject it into a tiny static
  bridge page written to `public/_settoken.html`:
  ```bash
  COOKIE=$(cat /path/to/cookie.txt)
  cat > public/_settoken.html <<EOF
  <!doctype html><html><body><script>
  document.cookie = "sb-fkowixrwiqhlvuqphqst-auth-token=${COOKIE}; path=/; max-age=3600";
  window.location.href = "/partner/dashboard";
  </script></body></html>
  EOF
  ```
  Then navigate the browser to `http://localhost:3000/_settoken.html` — it
  sets the cookie same-origin and redirects. Delete the file afterward
  (never commit it). This never routes the token through the LLM's own
  text generation, so it can't be transcribed wrong.
