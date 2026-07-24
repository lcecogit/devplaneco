const indexingAllowed = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Our own hand-authored illustrations under /public are trusted SVGs;
    // this is required for next/image to optimize/serve local SVG sources.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fkowixrwiqhlvuqphqst.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    if (indexingAllowed) return [];

    // Belt-and-braces backup to the meta robots tags: applies even if a
    // route ever renders without the <meta name="robots"> tag.
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
