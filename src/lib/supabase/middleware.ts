import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// The only /partner and /admin paths reachable without a session. Everything
// else under those prefixes requires a logged-in user at minimum — the exact
// role (partner/admin) is checked separately in each area's layout, since
// that check needs a DB read that's better done once per navigation there
// than on every request here.
const PUBLIC_PARTNER_PATHS = ["/partner/login", "/partner/signup", "/partner/forgot-password"];
const PUBLIC_ADMIN_PATHS = ["/admin/login"];

// Refreshes the Supabase auth session cookie on every request that isn't a
// static asset, and gates /partner/* and /admin/* behind having a session at
// all. Must run in src/middleware.ts — this file only holds the logic so it
// can be unit-tested independently of the Next.js middleware API.
export async function updateSession(request: NextRequest) {
  // A single response object, mutated in place. Supabase's own docs sample
  // reassigns `response = NextResponse.next({ request })` a second time
  // inside setAll() — on Vercel's Edge runtime that's harmless, but under
  // Hostinger's LiteSpeed Node.js proxy it caused ERR_HTTP_HEADERS_SENT on
  // nearly every request (confirmed via runtime logs): the response
  // identity changing mid-request triggers a second header-write attempt
  // after the first has already been sent.
  const response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Required: calling getUser() (not getSession()) forces a round-trip to
  // Supabase Auth that validates and refreshes the token server-side.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/partner") && !PUBLIC_PARTNER_PATHS.includes(pathname) && !user) {
    return NextResponse.redirect(new URL("/partner/login", request.url));
  }

  if (pathname.startsWith("/admin") && !PUBLIC_ADMIN_PATHS.includes(pathname) && !user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return response;
}
