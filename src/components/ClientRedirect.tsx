"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Workaround for a Hostinger/LiteSpeed hosting incompatibility: Next.js's
// server-side redirect() (thrown from a Server Component) crashes with
// ERR_HTTP_HEADERS_SENT under this host's Node.js app proxy. Redirecting
// from the browser instead sidesteps that code path entirely. Revisit
// removing this once the hosting issue is resolved upstream.
export function ClientRedirect({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return null;
}
