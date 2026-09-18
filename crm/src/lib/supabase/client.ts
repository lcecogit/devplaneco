"use client";

import { createBrowserClient } from "@supabase/ssr";

/** True when the browser bundle actually carries the Supabase config.
 *
 *  NEXT_PUBLIC_* values are inlined at BUILD time, not read at runtime, so
 *  adding them to a host's dashboard after a deploy leaves the shipped bundle
 *  with `undefined` until it is rebuilt. That is worth detecting explicitly:
 *  the symptom is otherwise a sign-in that appears to do nothing. */
export const isConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

/** Throws if called unconfigured — `createBrowserClient` raises on empty
 *  strings anyway, and swallowing that with `?? ""` only moved the failure
 *  somewhere harder to read. Callers check `isConfigured` first. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
