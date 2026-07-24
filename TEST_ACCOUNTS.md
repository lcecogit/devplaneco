# Test Accounts

Dev/test accounts on the live Supabase project (`fkowixrwiqhlvuqphqst`,
"MoversHub"). These are throwaway test identities, not real users — kept
here so a session doesn't need to re-create them to test a role's flows.

| Role     | Email                             | Password       | Notes |
|----------|------------------------------------|----------------|-------|
| Customer | `testcustomerphase5@gmail.com`     | `TestPass1234` | Created while verifying Phase 5. Email confirmation was manually forced via SQL (`email_confirmed_at`) — see "Email confirmation" below. Has one test booking (Home Removals, £1189.00 estimate) that was cancelled while testing the cancel flow. |
| Partner  | `partner-test@moversnowtest.com`   | `TempTest1234` | Pre-existing from Phase 3 testing; password was unknown, so it was reset via the Auth Admin API (`auth.admin.updateUserById`) while verifying Phase 6's "no approved vehicles" empty state — this account has zero vehicles, useful for that case again later. |
| Admin    | `admin-test@example.com`           | unknown        | Password not recorded anywhere I have access to. Reset it via `/admin/reset-password` if needed. |
| Partner  | `phase6-partner-a@moversnowtest.com` | `TestPass1234` | Created via `auth.admin.createUser` (`email_confirm: true`) while verifying Phase 6 — real signup was blocked by Supabase's email-send rate limit, so this bypasses email confirmation entirely. Business name "Phase 6 Test Movers A", one approved "Small van" vehicle. **Has claimed the Phase 6 UI test job** (see below) — its My Work list won't be empty. |
| Partner  | `phase6-partner-b@moversnowtest.com` | `TestPass1234` | Same as above. Business name "Phase 6 Test Movers B", one approved "Small van" vehicle. Used as the losing side of the claim-race test — has no assignments. |
| Customer | `phase6-customer@moversnowtest.com`  | `TestPass1234` | Same as above. Owns the Phase 6 UI test job (Office Relocation, matched to Partner A), the race-condition test job (deleted after the test ran — see PROGRESS.md Phase 6 entry), and two Phase 6b auction test jobs (see below). |

**Phase 6b auction test jobs**, both owned by `phase6-customer@moversnowtest.com`: an Office Relocation (£798, category-forced auction) that ran a real two-partner bid race — Partner A bid £450, Partner B bid £380 — then had `bidding_closes_at` manually backdated and `close_expired_auctions()` run by hand to verify the winner logic without waiting 24h; Partner B won (lowest bid), is now assigned with `payout_amount = 380`, and shows on their My Work with full address. A Home Removals (£161, price-threshold-forced auction) was left genuinely open (real `bidding_closes_at`, no bids yet) so a future session can watch the pg_cron job resolve it for real instead of only via the manual-backdate path.

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
leak (see `PROGRESS.md`). Browsing now goes exclusively through the
`find_work_jobs()` RPC, surfaced at `/partner/work/find`, which returns only
a curated, address-free shape for jobs compatible with the partner's
approved fleet. `Bidding`, `Watching`, `Invitations`, `Alerts`, `Book Now`
are still UI shells from Phase 3 — out of scope until Phase 7's other
allocation methods.
