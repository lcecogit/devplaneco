# Project: [Your Platform Name] — Transport/Removals Marketplace

## What this is
A two-sided logistics marketplace connecting customers who need items transported
with transport partners (business owners) and their drivers. Modeled on AnyVan's
architecture: a customer booking site, a transport-partner web dashboard, a driver
mobile app, and an admin panel, all sharing one Supabase backend.

## Tech stack
- Frontend: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- Backend/DB: Supabase (Postgres, Auth, Storage, Realtime, Edge Functions)
- Hosting: Hostinger (Node.js hosting / VPS)
- Deploy target: a live public domain — see "Indexing" rule below, this is critical.

## User roles (separate auth flows, enforced via Supabase RLS)
- `customer` — books jobs, tracks delivery, pays
- `partner` — business owner, uses the web dashboard, manages vehicles/drivers/jobs
- `driver` — employee/contractor of a partner, uses the mobile app only
- `admin` — internal staff, approves vehicles, resolves disputes, manages performance

## Non-negotiable rules for every phase of this build

### 1. Indexing — NOINDEX EVERYTHING until told otherwise
This site will be deployed to a live domain before it's ready for public search
traffic. On every page, in every phase, until I explicitly say "go live":
- Add `<meta name="robots" content="noindex, nofollow">` in the page/layout `<head>`
  (in Next.js App Router, set this via `metadata.robots = { index: false, follow: false }`
  in each route's metadata export, or centrally in the root layout).
- `robots.txt` must contain:

User-agent: * Disallow: /

- Add an `X-Robots-Tag: noindex, nofollow` HTTP header as a belt-and-braces backup
  (via `next.config.js` headers or middleware), in case a page ever renders without
  the meta tag.
- Do NOT generate/submit a sitemap to search engines while noindex is active, but DO
  build the sitemap generation logic now so it's ready to switch on later.
- Make this a single toggle (e.g. an env var like `NEXT_PUBLIC_ALLOW_INDEXING=false`)
  so I can flip one value to go live later instead of hunting through every page.

### 2. Technical SEO — implement from the start, even while noindexed
(So the foundation is right when we do flip indexing on.)
- Semantic HTML5 structure (one `<h1>` per page, logical `<h2>`/`<h3>` hierarchy)
- Descriptive, unique `<title>` and meta description per page/template
- Canonical URL tag on every page
- Clean, human-readable URL structure (e.g. `/services/piano-removals`, not query strings)
- Fully responsive, mobile-first layout
- Image optimization: Next.js `<Image>` component, explicit width/height to prevent
  layout shift, descriptive `alt` text (not keyword-stuffed)
- Lazy-load below-the-fold images and non-critical scripts
- Fast font loading (font-display: swap, subset where possible)
- Core Web Vitals in mind: minimize CLS, keep LCP element lightweight, avoid
  render-blocking JS
- Basic accessibility: proper landmark roles, focus states, sufficient color contrast,
  form labels
- 404 and error pages that are actually useful (not dead ends)

### 3. Content SEO — apply per page as we build each one
- One clear primary keyword/intent per page, reflected in H1, title tag, and first
  paragraph
- Meta descriptions written as a compelling ~150-160 character summary, not a keyword list
- Internal links between related pages (e.g. homepage → service pages → partner
  recruitment page)
- Content should read naturally for a human first; do not keyword-stuff

### 4. Structured data (schema.org) — required on every page, matched to content type
Implement as JSON-LD in the page `<head>`. Use the right type per page:
- Homepage: `Organization` + `WebSite` schema
- Any local/service info: `Service` schema (or `MovingCompany`/`LocalBusiness` if
  applicable to how we're positioning the brand)
- FAQ sections: `FAQPage` schema
- Partner recruitment / "become a partner" pages: consider `JobPosting`-style
  structured content where relevant
- Reviews/ratings sections: `AggregateRating` + `Review`, only if the ratings shown
  are real, not placeholder numbers
- Any multi-level page (service pages, city pages): `BreadcrumbList`
Validate mentally against Google's Rich Results structure — no schema for content
that isn't actually visible on the page.

## Coding conventions
- TypeScript strict mode
- Component structure: keep page-level layout separate from reusable UI components
- Use environment variables for all Supabase keys/URLs — never hardcode
- Comment any GPS, matching, or payment logic clearly — this platform has complex
  business rules and future-me (or future Claude Code sessions) will need the "why"