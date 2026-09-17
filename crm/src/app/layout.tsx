import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import "./globals.css";

/* Geist, self-hosted through the package: no external request, no layout
   shift, one typeface across all six brands. DESIGN.md §1 explains why this
   and not SF Pro (not licensable as a webfont) or -apple-system (fragments
   across Windows and Android). */

export const metadata: Metadata = {
  title: { default: "Operations", template: "%s · Operations" },
  description: "Internal operations platform.",
  // A private application. Never indexable, in any environment.
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh bg-surface-canvas text-ink-1 antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-contrast"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
