import type { Config } from "tailwindcss";

/* Tailwind reads from the CSS custom properties in src/styles/tokens.css
   rather than redeclaring values. One consequence worth knowing: because the
   colours are `var(...)`, Tailwind's opacity modifiers (`bg-accent/50`) do not
   work on them. That is deliberate — a half-opacity accent is not in the
   system. Use the `-wash` tokens where a tint is wanted. */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          1: "var(--ink-1)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
          4: "var(--ink-4)",
        },
        surface: {
          canvas: "var(--surface-canvas)",
          sunken: "var(--surface-sunken)",
          raised: "var(--surface-raised)",
          overlay: "var(--surface-overlay)",
        },
        accent: {
          DEFAULT: "var(--accent)",          // a FILL
          hover: "var(--accent-hover)",
          contrast: "var(--accent-contrast)", // what sits ON the fill
          text: "var(--accent-text)",         // the accent AS text or a ring
          wash: "var(--accent-wash)",
        },
        status: {
          // Mark colours. For status as TEXT use `critical-text`, which is
          // stepped for its surface — see tokens.css.
          good: "var(--status-good)",
          warning: "var(--status-warning)",
          serious: "var(--status-serious)",
          critical: "var(--status-critical)",
          "critical-text": "var(--status-critical-text)",
        },
        series: {
          1: "var(--series-1)",
          2: "var(--series-2)",
          3: "var(--series-3)",
          4: "var(--series-4)",
          5: "var(--series-5)",
          6: "var(--series-6)",
          7: "var(--series-7)",
          8: "var(--series-8)",
        },
      },
      borderColor: {
        DEFAULT: "var(--hairline)",
        hairline: "var(--hairline)",
        strong: "var(--hairline-strong)",
      },
      fontFamily: {
        // Inter, self-hosted: the typeface ecogreenmovers.co.uk sets for body,
        // headings and buttons. Google Fonts is blocked by the artifact CSP and
        // by this environment's egress policy, so it ships from npm via
        // @fontsource-variable/inter rather than a CDN link.
        sans: ["'Inter Variable'", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      /* The type scale from DESIGN.md §1.
         Two things happen together as size grows, and they are what make type
         read as modern rather than merely large: tracking tightens, and weight
         drops. A 48px headline at 600 is a poster; the same headline at 400
         with -0.03em is an interface. Size and its tracking/weight are bound
         into one token so they cannot be used apart. */
      fontSize: {
        display: ["3rem", { lineHeight: "3.25rem", letterSpacing: "-0.032em", fontWeight: "400" }],
        "title-1": ["2rem", { lineHeight: "2.375rem", letterSpacing: "-0.024em", fontWeight: "500" }],
        "title-2": ["1.5rem", { lineHeight: "1.875rem", letterSpacing: "-0.018em", fontWeight: "500" }],
        "title-3": ["1.1875rem", { lineHeight: "1.625rem", letterSpacing: "-0.013em", fontWeight: "500" }],
        "body-lg": ["1.0625rem", { lineHeight: "1.625rem", letterSpacing: "-0.006em" }],
        body: ["0.9375rem", { lineHeight: "1.375rem", letterSpacing: "-0.002em" }],
        "body-dense": ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0" }],
        label: ["0.8125rem", { lineHeight: "1.125rem", letterSpacing: "0.004em", fontWeight: "500" }],
        caption: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
      },
      fontWeight: {
        /* 400 and 500 carry the product. 600 exists for the rare case where a
           label must separate from dense data beside it, and appears almost
           nowhere — hierarchy comes from size, colour and space. */
        normal: "400",
        medium: "500",
        semibold: "600",
      },
      spacing: {
        /* The 4px grid. Nothing between these steps. */
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "20px",
        6: "24px",
        8: "32px",
        10: "40px",
        14: "56px",
        20: "80px",
      },
      /* Square, following the brand: ecogreenmovers.co.uk sets a button
         radius of 0. Controls are square exactly as the site is; containers
         take the smallest possible softening so dense tables and stacked
         panels do not read as harsh at small sizes. */
      borderRadius: {
        sm: "0px",
        md: "0px",
        lg: "2px",
        xl: "4px",
      },
      boxShadow: {
        1: "var(--shadow-1)",
        2: "var(--shadow-2)",
        3: "var(--shadow-3)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
        emphasised: "var(--ease-emphasised)",
      },
      transitionDuration: {
        instant: "var(--motion-instant)",
        quick: "var(--motion-quick)",
        settled: "var(--motion-settled)",
      },
      maxWidth: { content: "1280px" },
    },
  },
  plugins: [],
};

export default config;
