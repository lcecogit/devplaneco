import type { MetadataRoute } from "next";
import { indexingAllowed, siteConfig } from "@/lib/site-config";

// Served at /sitemap.xml. The URL list is built now so it's ready to go, but
// we intentionally return an empty sitemap while indexing is off so nothing
// gets submitted to search engines before NEXT_PUBLIC_ALLOW_INDEXING=true.
const STATIC_ROUTES = [
  "",
  "/quote",
  "/partners/join",
  "/services/home-removals",
  "/services/single-item-transport",
  "/services/office-relocation",
  "/services/car-transport",
  "/services/motorbike-transport",
  "/services/piano-moving",
  "/services/international-moves",
];

export default function sitemap(): MetadataRoute.Sitemap {
  if (!indexingAllowed) return [];

  return STATIC_ROUTES.map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: new Date(),
  }));
}
