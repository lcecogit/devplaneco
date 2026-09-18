#!/usr/bin/env node
/**
 * Pre-launch check. Run it wherever the app is failing:
 *
 *     npm run doctor                       # checks .env.local
 *     npm run doctor -- owner@ecogreenmovers.co.uk 'the-password'
 *
 * It answers, in order, the questions that actually cause "it won't let me in":
 * is the config present, does it point at the right project, is the API
 * reachable, does the account sign in, and does that session see the CRM
 * through RLS. Each check prints what it found, not just pass/fail.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CRM_REF = "knbsosxsfvqslpimiznl";

let failures = 0;
const ok = (m) => console.log(`  \x1b[32mok\x1b[0m    ${m}`);
const bad = (m, fix) => { failures++; console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`); if (fix) console.log(`        → ${fix}`); };
const note = (m) => console.log(`        ${m}`);

/* ── 1. configuration ──────────────────────────────────────────────────── */
console.log("\n1. Configuration");

const env = { ...process.env };
const envFile = resolve(root, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
  }
  ok(`.env.local found`);
} else {
  bad(".env.local not found", "cp .env.example .env.local, then fill in the Supabase values");
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url) bad("NEXT_PUBLIC_SUPABASE_URL is not set", "without it the sign-in form cannot work at all");
else ok(`NEXT_PUBLIC_SUPABASE_URL = ${url}`);
if (!key) bad("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
else ok(`publishable key set (${key.slice(0, 22)}…)`);

if (url) {
  const ref = new URL(url).hostname.split(".")[0];
  if (ref === CRM_REF) ok(`points at the CRM project (${ref})`);
  else bad(`points at project "${ref}", which is NOT the CRM (${CRM_REF})`,
           "the repo root carries .env files for the other project — check the deployment's root directory is `crm`");
}

if (!env.CRON_SECRET) note("CRON_SECRET unset — /api/cron/tick will return 401, so sequences never run");
if (!env.SUPABASE_SECRET_KEY) note("SUPABASE_SECRET_KEY unset — server-side jobs that bypass RLS will fail");

if (!url || !key) { summary(); process.exit(1); }

/* ── 2. reachability ───────────────────────────────────────────────────── */
console.log("\n2. Reachability");
const headers = { apikey: key, "Content-Type": "application/json" };

try {
  const r = await fetch(`${url}/auth/v1/health`, { headers });
  // A Supabase edge response always carries its own headers. A bare 403/407
  // without them is a proxy, VPN or corporate firewall refusing the CONNECT,
  // which is a completely different problem from a paused project.
  const fromSupabase = [...r.headers.keys()].some((h) => h.startsWith("sb-") || h === "x-sb-edge-region");
  if (r.ok) ok(`auth service reachable (${r.status})`);
  else if ((r.status === 403 || r.status === 407) && !fromSupabase)
    bad(`blocked before reaching Supabase (${r.status}, no Supabase headers)`,
        "a proxy, VPN or firewall is refusing supabase.co — try another network, or allow *.supabase.co");
  else if (r.status === 503)
    bad(`project unavailable (503)`, "the project is probably paused — open it in the Supabase dashboard to restore it");
  else bad(`auth service returned ${r.status}`, "check the project is running in the Supabase dashboard");
} catch (e) {
  bad(`cannot reach ${url} — ${e.message}`,
      "check the project is running, and that a firewall or proxy is not blocking supabase.co");
  summary(); process.exit(1);
}

/* ── 3. sign-in ────────────────────────────────────────────────────────── */
const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.log("\n3. Sign-in\n        skipped — pass an email and password to test one:");
  console.log("        npm run doctor -- owner@ecogreenmovers.co.uk 'your-password'");
  summary(); process.exit(failures ? 1 : 0);
}

console.log("\n3. Sign-in");
let token = null;
try {
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST", headers, body: JSON.stringify({ email, password }),
  });
  const body = await r.json();
  if (r.ok && body.access_token) { token = body.access_token; ok(`signed in as ${email}`); }
  else bad(`sign-in refused (${r.status}): ${body.error_description ?? body.msg ?? JSON.stringify(body)}`,
           body.error_code === "email_not_confirmed"
             ? "confirm the address: update auth.users set email_confirmed_at = now() where email = '…'"
             : "check the password, or reset it in Supabase → Authentication → Users");
} catch (e) {
  bad(`sign-in threw — ${e.message}`);
}

/* ── 4. what that session can see ──────────────────────────────────────── */
if (token) {
  console.log("\n4. What this account can see (through RLS)");
  const auth = { ...headers, Authorization: `Bearer ${token}` };
  for (const table of ["brands", "items", "rate_cards", "leads", "jobs"]) {
    try {
      const r = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
        headers: { ...auth, Prefer: "count=exact" },
      });
      const range = r.headers.get("content-range") ?? "";
      const count = range.split("/")[1] ?? "?";
      if (r.ok) ok(`${table.padEnd(11)} ${count} row(s) visible`);
      else bad(`${table} returned ${r.status}: ${(await r.text()).slice(0, 120)}`);
    } catch (e) { bad(`${table} — ${e.message}`); }
  }
  note("0 rows on leads/jobs is correct on a fresh install — they are genuinely empty.");
  note("0 rows on brands means this account has no staff_brand_access grant.");
}

summary();
process.exit(failures ? 1 : 0);

function summary() {
  console.log(
    failures === 0
      ? "\n\x1b[32mAll checks passed.\x1b[0m\n"
      : `\n\x1b[31m${failures} check(s) failed.\x1b[0m See the arrows above.\n`,
  );
}
