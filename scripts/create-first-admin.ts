// One-off CLI script to bootstrap the very first admin account. Run this
// once, manually, from your own terminal — it uses the Supabase secret key
// (service_role-equivalent) directly and must never be exposed as an API
// route or run in the browser.
//
// Usage:
//   npm run create-first-admin -- you@example.com "a-strong-password"

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";

config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error('Usage: npm run create-first-admin -- you@example.com "a-strong-password"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }
  if (!supabaseUrl || !supabaseSecretKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — check .env.local."
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    console.error("Failed to create auth user:", createError.message);
    process.exit(1);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: created.user.id, role: "admin", email }, { onConflict: "id" });

  if (profileError) {
    console.error("Auth user created, but failed to set admin profile:", profileError.message);
    process.exit(1);
  }

  console.log(`Admin account created for ${email}. Sign in at /admin/login.`);
}

main();
