import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ClientRedirect } from "@/components/ClientRedirect";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { createClient } from "@/lib/supabase/server";
import { claimQuoteForCustomer, getQuoteOwner, loadQuote } from "@/lib/quote/server";

export const metadata: Metadata = {
  title: "Confirm Your Booking",
  description: "Check your move details, add your contact information, and confirm your booking.",
  alternates: { canonical: "/quote/checkout" },
};

// Checkout for a completed quote.
//
// Three states, decided server-side:
//   1. Signed out  — the order summary plus a sign-in / create-account card.
//      Auth itself is the Phase 5 customer flow, reused as-is: `next` carries
//      the visitor straight back here, and the quote survives because it's a
//      real database row keyed by the UUID in the URL, not browser state.
//   2. Signed in   — the quote is claimed for this customer and the full
//      checkout form renders.
//   3. Already booked — bounce to the thank-you page rather than offering to
//      book it a second time.

export default async function QuoteCheckoutPage({
  searchParams,
}: {
  searchParams: { quote?: string };
}) {
  if (!searchParams.quote) notFound();

  let quote;
  try {
    quote = await loadQuote(searchParams.quote);
  } catch {
    notFound();
  }

  const checkoutPath = `/quote/checkout?quote=${quote.id}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- State 1: signed out ------------------------------------------------
  if (!user) {
    return (
      <CheckoutShell quote={quote}>
        <section className="rounded-2xl border border-brand-200 bg-white p-6">
          <h2 className="font-heading text-lg font-bold text-ink-900">
            Create an account to book
          </h2>
          <p className="mt-2 text-sm text-ink-700">
            You need an account so you can track your move, see who&apos;s been matched to it,
            and get in touch if anything changes. It takes a moment, and your quote is saved —
            you&apos;ll come straight back here.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/customer/signup?next=${encodeURIComponent(checkoutPath)}`}
              className="flex-1 rounded-full bg-coral-500 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-coral-600"
            >
              Create an account
            </Link>
            <Link
              href={`/customer/login?next=${encodeURIComponent(checkoutPath)}`}
              className="flex-1 rounded-full border border-brand-300 px-6 py-3 text-center text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-50"
            >
              I already have one
            </Link>
          </div>

          <p className="mt-4 border-t border-brand-100 pt-4 text-xs text-ink-700">
            Quote <span className="font-semibold text-ink-900">#{quote.reference}</span> is
            saved either way. Keep this page&apos;s link and you can come back to it later.
          </p>
        </section>
      </CheckoutShell>
    );
  }

  // --- State 3: already booked --------------------------------------------
  if (quote.status === "converted") {
    return <ClientRedirect to={`/quote/confirmation/${quote.reference}`} />;
  }

  // --- State 2: signed in --------------------------------------------------
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!customer) {
    // The customers row is created by /customer/post-auth. Someone who
    // reached checkout without passing through it (an old session, say)
    // goes through it now and comes back.
    return <ClientRedirect to={`/customer/post-auth?next=${encodeURIComponent(checkoutPath)}`} />;
  }

  // Link the quote to this account. Only claims an unclaimed quote — the
  // UUID is a shareable capability token, so a second signed-in visitor
  // opening the same link must not take the quote over.
  const owner =
    (await getQuoteOwner(quote.id)) ?? (await claimQuoteForCustomer(quote.id, customer.id));

  if (owner !== customer.id) {
    return (
      <CheckoutShell quote={quote}>
        <section className="rounded-2xl border border-coral-300 bg-coral-50 p-6">
          <h2 className="font-heading text-lg font-bold text-ink-900">
            This quote belongs to another account
          </h2>
          <p className="mt-2 text-sm text-ink-700">
            You can see it because you have the link, but it can only be booked by the account
            that started it. Sign in as that account, or{" "}
            <Link href="/quote" className="font-semibold text-brand-600 underline">
              start a fresh quote
            </Link>
            .
          </p>
        </section>
      </CheckoutShell>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <CheckoutShell quote={quote}>
      <CheckoutForm
        quote={quote}
        defaultName={profile?.full_name ?? ""}
        defaultPhone={profile?.phone ?? ""}
      />
    </CheckoutShell>
  );
}

/**
 * Shared page frame: heading, the order summary (always visible, in every
 * state — the customer should never be asked for details without being able
 * to see what they're agreeing to), and whatever action belongs in the main
 * column.
 */
function CheckoutShell({
  quote,
  children,
}: {
  quote: Awaited<ReturnType<typeof loadQuote>>;
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" className="bg-brand-50/40 py-12 sm:py-16">
      <Container className="max-w-6xl">
        <div className="max-w-2xl">
          <h1 className="font-heading text-3xl font-extrabold text-ink-900 sm:text-4xl">
            Confirm your booking
          </h1>
          <p className="mt-3 text-ink-700">
            Quote <span className="font-semibold text-ink-900">#{quote.reference}</span>. Check
            everything over, add your details, and we&apos;ll send your move out to our
            transport partners.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
          <div className="min-w-0 order-2 lg:order-1">{children}</div>

          {/* Summary comes first on a narrow screen: see it, then fill it in. */}
          <div className="min-w-0 order-1 lg:order-2 lg:sticky lg:top-6">
            <OrderSummary quote={quote} />
            <Link
              href={`/quote?quote=${quote.id}`}
              className="mt-4 inline-block text-sm font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700"
            >
              Change dates, items or addresses
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
