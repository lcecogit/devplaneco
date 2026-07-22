import type { MetadataRoute } from "next";
import { indexingAllowed, siteConfig } from "@/lib/site-config";

// Served at /robots.txt. While NEXT_PUBLIC_ALLOW_INDEXING is not "true" this
// disallows everything, matching the meta robots tags and X-Robots-Tag header.
export default function robots(): MetadataRoute.Robots {
  if (!indexingAllowed) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
