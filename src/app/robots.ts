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
      // Gated application areas, not marketing content — keep these out of
      // the index even once public indexing is switched on generally.
      disallow: ["/partner/", "/admin/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
