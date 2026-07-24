"use client";

import Link from "next/link";
import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { MenuIcon, CloseIcon } from "@/components/icons";
import { siteConfig } from "@/lib/site-config";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Services", href: "#services" },
  { label: "Become a Partner", href: "/partners/join" },
  { label: "Help", href: "#faq" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-100 bg-white/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between sm:h-20">
        <Link
          href="/"
          className="font-heading text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl"
        >
          Movers<span className="text-coral-500">Now</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink-700 transition-colors hover:text-brand-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <a
            href={`tel:${siteConfig.supportPhone.replace(/\s/g, "")}`}
            className="text-sm font-semibold text-ink-700 hover:text-brand-600"
          >
            {siteConfig.supportPhone}
          </a>

          <div
            className="relative"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setSignInOpen(false);
              }
            }}
          >
            <button
              type="button"
              onClick={() => setSignInOpen((v) => !v)}
              aria-expanded={signInOpen}
              aria-haspopup="true"
              className="text-sm font-semibold text-ink-700 transition-colors hover:text-brand-600"
            >
              Sign in
            </button>
            {signInOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-brand-100 bg-white p-1.5 shadow-lg">
                <Link
                  href="/customer/login"
                  onClick={() => setSignInOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-800 hover:bg-brand-50"
                >
                  Customer sign in
                </Link>
                <Link
                  href="/partner/login"
                  onClick={() => setSignInOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-800 hover:bg-brand-50"
                >
                  Partner sign in
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/quote"
            className="rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-600"
          >
            Get a Quote
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-900 lg:hidden"
        >
          {open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </Container>

      {open && (
        <div id="mobile-nav" className="border-t border-brand-100 bg-white lg:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-ink-800 hover:bg-brand-50"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={`tel:${siteConfig.supportPhone.replace(/\s/g, "")}`}
              className="rounded-lg px-3 py-3 text-base font-semibold text-ink-800 hover:bg-brand-50"
            >
              Call {siteConfig.supportPhone}
            </a>

            <div className="mt-2 border-t border-brand-100 pt-2">
              <p className="px-3 text-xs font-semibold uppercase tracking-wide text-ink-700">
                Sign in
              </p>
              <Link
                href="/customer/login"
                onClick={() => setOpen(false)}
                className="mt-1 block rounded-lg px-3 py-3 text-base font-medium text-ink-800 hover:bg-brand-50"
              >
                Customer sign in
              </Link>
              <Link
                href="/partner/login"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-3 text-base font-medium text-ink-800 hover:bg-brand-50"
              >
                Partner sign in
              </Link>
            </div>

            <Link
              href="/quote"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-coral-500 px-5 py-3 text-center text-base font-semibold text-white"
            >
              Get a Quote
            </Link>
          </Container>
        </div>
      )}
    </header>
  );
}
