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
          DEFAULT: "var(--accent)",
          contrast: "var(--accent-contrast)",
          wash: "var(--accent-wash)",
        },
        status: {
          good: "var(--status-good)",
          warning: "var(--status-warning)",
          serious: "var(--status-serious)",
          critical: "var(--status-critical)",
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
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      /* The type scale from DESIGN.md §1. Tracking tightens as size grows —
         this pairing is the whole point, so sizes are never used without it. */
      fontSize: {
        display: ["3rem", { lineHeight: "3.25rem", letterSpacing: "-0.022em", fontWeight: "600" }],
        "title-1": ["2rem", { lineHeight: "2.375rem", letterSpacing: "-0.018em", fontWeight: "600" }],
        "title-2": ["1.5rem", { lineHeight: "1.875rem", letterSpacing: "-0.014em", fontWeight: "600" }],
        "title-3": ["1.1875rem", { lineHeight: "1.625rem", letterSpacing: "-0.01em", fontWeight: "600" }],
        "body-lg": ["1.0625rem", { lineHeight: "1.625rem", letterSpacing: "-0.004em" }],
        body: ["0.9375rem", { lineHeight: "1.375rem", letterSpacing: "0" }],
        "body-dense": ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0" }],
        label: ["0.8125rem", { lineHeight: "1.125rem", letterSpacing: "0.006em", fontWeight: "500" }],
        caption: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.012em" }],
      },
      fontWeight: {
        /* 400/500/600 only. Hierarchy comes from size, colour and space. */
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
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
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
