// Central place for site-wide constants used across metadata, JSON-LD, and
// the noindex toggle. Flip NEXT_PUBLIC_ALLOW_INDEXING in .env(.local) to go
// live — every consumer of `indexingAllowed` reacts to the same flag.

export const siteConfig = {
  name: "Movers Now",
  shortName: "Movers Now",
  description:
    "Get an instant quote to move anything, anywhere. Movers Now connects you with vetted, insured transport partners for home removals, single items, vehicles and more.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.moversnow.example").replace(/\/$/, ""),
  supportPhone: "0203 872 3050",
  supportEmail: "help@moversnow.example",
  social: {
    facebook: "https://facebook.com/moversnow",
    instagram: "https://instagram.com/moversnow",
    x: "https://x.com/moversnow",
    linkedin: "https://www.linkedin.com/company/moversnow",
  },
} as const;

export const indexingAllowed = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";
