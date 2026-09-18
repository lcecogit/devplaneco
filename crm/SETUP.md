# Setup

Three things, in this order: get it running, give it a database, deploy it.

---

## 1. Run it locally (5 minutes, no accounts needed)

```bash
npm install
npm run dev
```

Open **http://localhost:3000**.

It runs with **no Supabase project and no API keys**. Every screen opens with
sample data behind a banner saying so, which is the point: you can review the
whole thing before provisioning anything.

| Route | What it is |
|---|---|
| `/` | The public site and quote funnel |
| `/login` | Staff sign-in |
| `/dashboard` | The CRM — charts, pipeline, crew, send queue |
| `/leads` · `/leads/l1` | Leads list and a lead in full |
| `/calendar` | Job board for the week |
| `/inbox` | The manual send queue |
| `/styleguide` | Every component and state, for design review |

---

## 2. Give it a database

Free Supabase tier is enough.

1. **supabase.com** → New project. Keep the database password somewhere.
2. **SQL Editor → New query.** Run the five parts in order from
   `supabase/parts/`:

   ```
   01_schema.sql      extensions, 24 enums, 42 tables, indexes, triggers
   02_integrity.sql   reference numbering, quote freezing, audit immutability
   03_security.sql    helpers and 68 row-level-security policies
   04_functions.sql   intake, booking, scheduler, job sheets, GDPR
   05_seed.sql        6 brands, 67 catalogue items, 36 rate cards, sequences
   ```

   Every part is safe to re-run, and each checks its prerequisites and tells you
   plainly if something is missing. `supabase/install.sql` is all five
   concatenated if you would rather paste once.

3. **Check it worked:**

   ```sql
   select
     (select count(*) from information_schema.tables
        where table_schema='public' and table_type='BASE TABLE') as tables,
     (select count(*) from pg_policies where schemaname='public') as policies,
     (select count(*) from brands)                                as brands;
   ```

   Expect **42, 68, 6**.

4. **Wire the app to it.** Copy `.env.example` to `.env.local` and fill in the
   three Supabase values from Project Settings → API:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=sb_secret_...
   ```

   Restart `npm run dev`. The sample-data banner disappears and the screens read
   real records.

5. **Create your first staff account.** Supabase → Authentication → Add user,
   then in the SQL Editor:

   ```sql
   insert into staff (auth_user_id, full_name, email, department)
   values ((select id from auth.users where email = 'you@ecogreenmovers.co.uk'),
           'Your Name', 'you@ecogreenmovers.co.uk', 'admin');

   -- The guard trigger is admin-only, so the very first grant bypasses it.
   alter table staff_brand_access disable trigger staff_brand_access_guard;
   insert into staff_brand_access (staff_id, brand_id, role)
   select s.id, b.id, 'admin'
   from staff s, brands b
   where s.email = 'you@ecogreenmovers.co.uk' and b.slug = 'ecogreen-movers';
   alter table staff_brand_access enable trigger staff_brand_access_guard;
   ```

---

## 3. Deploy

Vercel, free Hobby tier.

1. Push this to a Git repo, then import it at vercel.com.
2. **Set Root Directory to `crm`** if the repo has the app in a subfolder.
3. Add the same three environment variables, plus:

   ```
   CRON_SECRET=<any long random string>
   INTAKE_SIGNING_SECRET=<any long random string>
   ```

   `/api/cron/tick` returns 401 without `CRON_SECRET`, so set it or the chase
   sequences never run.

   **On the free Hobby tier, Vercel runs cron jobs once per DAY.** `vercel.json`
   therefore registers a daily tick as a backstop only. For the real 5-minute
   cadence the sequences need, run `supabase/parts/06_scheduler.sql` in the
   Supabase SQL Editor — it schedules the tick from inside Postgres using
   pg_cron and pg_net, both included in Supabase's free plan. Edit the two
   placeholders at the top of that file first (your deployment URL and the same
   `CRON_SECRET`); it refuses to run until you do. On a paid Vercel plan you can
   skip part 6 and put `*/5 * * * *` back in `vercel.json` instead.

Providers are optional. With `STRIPE_SECRET_KEY`, `EMAIL_PROVIDER_API_KEY` and
`WHATSAPP_ACCESS_TOKEN` all empty, the flows still work: payment links are
local and marked paid by hand, email renders to `.tmp/mail/`, and WhatsApp and
SMS steps queue in the send queue for a person. Set a key, get the real
provider — no code changes.

---

## Commands

| Command | What it proves |
|---|---|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript strict |
| `npm test` | 81 unit tests over the pure domain layer |
| `npm run audit` | Accessibility, layout floors, keyboard and contrast, both themes (needs the app running) |
| `npm run db:verify` | Applies every migration to a throwaway Postgres and runs 92 SQL assertions (needs a local Postgres 16) |

---

## Before you quote a real customer

Every seeded rate card is flagged `provisional = true`. Those figures are
recommendations, not your prices, and congestion and ULEZ are seeded at zero
rather than guessed — a stale TfL rate loses money on every London job.
`DECISIONS.md` §2 explains each number and what to change.

## Where to read next

| File | What it covers |
|---|---|
| `RECOMMENDATIONS.md` | The full module map, the pricing matrix, and 54 improvements in build order |
| `DECISIONS.md` | The defaults chosen for you, and which need sign-off |
| `DESIGN.md` | The design system and the craft gate every screen must pass |
| `SPEC.md` | What is built, what is not, and the acceptance criteria |
| `PROGRESS.md` | Session-by-session log of what changed and why |

---

## Launch checklist

Run `npm run doctor` at any point — it checks configuration, reachability, a
real sign-in and what that account can see through RLS, and names the fix for
whatever it finds.

### 1. Local first (2 minutes, proves the credentials)

```bash
cd crm
npm install
npm run doctor -- owner@ecogreenmovers.co.uk '<password>'
npm run dev            # http://localhost:3000/login
```

`.env.local` already points at the live CRM project. Expect empty leads and
jobs — the database is genuinely empty, and that is the correct state.

### 2. Deploy to Vercel (free Hobby tier)

Import the repository, then **before the first build**:

| Setting | Value |
|---|---|
| **Root Directory** | **`crm`** — this is the one that breaks logins |
| Framework | Next.js (detected) |

**Why the root directory matters.** The repository root is *also* a deployable
Next.js app — the older marketplace site — and it carries `.env` and
`.env.production` pointing at a different Supabase project. Deploy from the
root and you ship the wrong app against a database where no CRM staff account
exists. The only symptom is that nobody can sign in. The CRM's `next.config.mjs`
warns at build time if it sees that project's URL.

Environment variables (Production, Preview and Development):

```
NEXT_PUBLIC_SUPABASE_URL=https://knbsosxsfvqslpimiznl.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_zpOcpMhB-LlJ4poQdJezEQ_sL4UCCM0
SUPABASE_SECRET_KEY=<Supabase → Settings → API Keys → service_role>
CRON_SECRET=<long random string>
INTAKE_SIGNING_SECRET=<long random string>
```

**`NEXT_PUBLIC_*` values are inlined at build time.** Adding them after a deploy
does nothing until you redeploy. If sign-in behaves oddly, redeploy before
debugging anything else — `/login` names this itself if the build has no
configuration.

### 3. After the first successful sign-in

1. Run `supabase/parts/06_scheduler.sql` with your deployed URL and the same
   `CRON_SECRET`, so the chase sequences tick every 5 minutes. Vercel's free
   tier only runs cron once a day.
2. Rotate the seeded staff passwords (`CRM_ACCOUNTS.md`) and delete the roles
   you do not need.
3. Sign off the rate cards. All 36 are `provisional = true`, and every quote
   computed from them will be wrong until someone confirms the real numbers.
