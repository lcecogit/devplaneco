import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

// Bypasses Row Level Security entirely. Server-only (the `server-only`
// import makes any accidental Client Component import a build error).
// Reserve for trusted admin operations — approving vehicles, resolving
// disputes, webhook handlers — never per-request user-facing logic.
export function createAdminClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: { fetch: uncachedFetch },
  });
}

/**
 * Opt every PostgREST call out of Next.js's fetch caching AND its per-render
 * request memoization.
 *
 * Next 14 patches the global `fetch`. Two separate mechanisms then apply to
 * GET requests, and PostgREST selects are GETs:
 *
 *   1. The Data Cache — persists responses across requests. `cache:
 *      "no-store"` opts out of it.
 *   2. Request memoization — dedupes identical GETs *within a single render*
 *      and replays the first response. `no-store` does NOT opt out of this
 *      one; passing a distinct `signal` does (it's the documented escape
 *      hatch, because the signal makes each request non-identical).
 *
 * Without (2), a read-after-write inside one server render silently returns
 * the pre-write value. That is not theoretical: /quote/checkout read the
 * quote's owner, claimed the quote for the signed-in customer, then re-read
 * the owner and got the memoized pre-claim `null` back — so a customer's
 * first visit after signing in was told the quote belonged to someone else.
 *
 * A database read is never cacheable by URL. Both opt-outs belong here, once,
 * rather than at every call site that might happen to read after a write.
 */
function uncachedFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    cache: "no-store",
    signal: init?.signal ?? new AbortController().signal,
  });
}
