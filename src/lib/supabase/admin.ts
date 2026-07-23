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
  });
}
