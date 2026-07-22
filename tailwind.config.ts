import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Primary brand color: electric violet. Used for nav, headings,
        // and primary structural elements.
        brand: {
          50: "#F2EFFE",
          100: "#E4DEFD",
          200: "#C7BAFB",
          300: "#A594F5",
          400: "#8069EE",
          500: "#5B3DF6",
          600: "#4726E1",
          700: "#371DB3",
          800: "#291686",
          900: "#1C0F5C",
        },
        // CTA / accent color: warm coral. Reserved for primary calls to
        // action so they stand out against the violet/ink palette.
        coral: {
          50: "#FFF1EC",
          100: "#FFE0D5",
          300: "#FFA688",
          400: "#FF8563",
          500: "#FF6B4A",
          600: "#E84E2C",
          700: "#C13A1E",
        },
        // Trust / success color: fresh mint-emerald, used for ratings,
        // vetting badges, and confirmation states.
        mint: {
          50: "#E9FBF3",
          100: "#CFF6E4",
          400: "#2FD98F",
          500: "#12BD79",
          600: "#0C9A62",
        },
        ink: {
          900: "#0F1024",
          800: "#191A33",
          700: "#2B2C4A",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
