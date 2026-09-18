/** Build-time guard for the one deployment mistake this repo invites.
 *
 *  The repository root is itself a deployable Next.js app (the older
 *  marketplace site) and carries .env / .env.production pointing at a
 *  DIFFERENT Supabase project. A CRM deployment whose root directory is not
 *  `crm` therefore builds the wrong app against the wrong database, and the
 *  only symptom is that nobody can sign in. Warn loudly at build time rather
 *  than leaving it to be discovered at the login screen. */
const MARKETPLACE_REF = "fkowixrwiqhlvuqphqst";
const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (configuredUrl?.includes(MARKETPLACE_REF)) {
  console.warn(
    `\n\x1b[31m  WARNING\x1b[0m  This CRM build is pointed at Supabase project ` +
      `"${MARKETPLACE_REF}", which belongs to the marketplace app, not the CRM.\n` +
      `           Staff accounts do not exist there and sign-in will fail.\n` +
      `           Set the deployment's root directory to \`crm\` and give it the CRM ` +
      `project's URL and key.\n`,
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    // The CRM is a private application. Unlike the marketing sites this is
    // never indexable, so the header is unconditional rather than behind a
    // go-live flag. The only public surface is /embed, which is framed by the
    // brand sites and still must not rank on its own.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        // The embeddable widget is the one route that must be frameable, and
        // only by the six brand domains. X-Frame-Options is omitted here on
        // purpose: frame-ancestors supersedes it and supports a list.
        source: "/embed/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://*.ecogreenmovers.co.uk https://*.ecolondonmovers.co.uk https://*.continuumgreen.co.uk https://*.removalscompanymanchester.co.uk https://*.edinburghmoving.co.uk https://*.glasgowmoving.co.uk",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
