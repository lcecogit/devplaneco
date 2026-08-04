import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ClientRedirect } from "@/components/ClientRedirect";
import { createClient } from "@/lib/supabase/server";
import { bookingNextSteps } from "@/lib/booking/next-steps";
import { emailConfigured } from "@/lib/email/send";
import { formatMoveDate } from "@/lib/email/booking-confirmation";
import { floorLabel, formatWindow } from "@/lib/quote/types";
import type { FloorLevel } from "@/lib/quote/types";

// Always noindex, whatever NEXT_PUBLIC_ALLOW_INDEXING says: this is one
// customer's booking, keyed by their reference. It should never be in an
// index even after the marketing site goes live.
export const metadata: Metadata = {
  title: "Booking Confirmed",
  description: "Your move is booked. Here's what happens next.",
  robots: { index: false, follow: false, nocache: true },
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Not yet paid",
  pending: "Payment in progress",
  succeeded: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

/** "08:00:00" from a Postgres `time`, or an ISO timestamp, down to an hour. */
function hourOf(value: string | null): number | null {
  if (!value) return null;
  const hour = Number(value.slice(0, 2));
  return Number.isFinite(hour) ? hour : null;
}

function windowLabel(start: string | null, end: string | null): string {
  const startHour = hourOf(start);
  const endHour = hourOf(end);
  if (startHour === null || endHour === null) return "Any time on the day";
  return formatWindow({ startHour, endHour });
}

export default async function BookingConfirmationPage({
  params,
}: {
  params: { reference: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const here = `/quote/confirmation/${params.reference}`;
  if (!user) {
    return <ClientRedirect to={`/customer/login?next=${encodeURIComponent(here)}`} />;
  }

  // Read through the customer's OWN session, not the service-role client:
  // `quotes_select` already restricts this to the owning customer, so RLS is
  // what stops someone guessing another reference. No extra check needed —
  // and no way to forget one.
  const { data: quote } = await supabase
    .from("quotes")
    .select(
      "id, reference, selected_date, collection_window_start, collection_window_end, delivery_window_start, delivery_window_end, crew_size, helper_included, total_volume_m3, total_price, contact_name, access_notes, status"
    )
    .eq("reference", params.reference)
    .maybeSingle();

  if (!quote || quote.status !== "converted") notFound();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, allocation_method, matching_status, customer_price, distance_miles")
    .eq("quote_id", quote.id)
    .maybeSingle();

  if (!job) notFound();

  const [{ data: stops }, { data: items }, { data: payment }] = await Promise.all([
    supabase
      .from("job_stops")
      .select("id, address_line, address_text, postcode, floor, has_lift")
      .eq("job_id", job.id)
      .order("sequence"),
    supabase
      .from("job_items")
      .select("id, custom_name, quantity")
      .eq("job_id", job.id)
      .order("created_at"),
    supabase
      .from("customer_payments")
      .select("amount, status")
      .eq("job_id", job.id)
      .maybeSingle(),
  ]);

  const route = stops ?? [];
  const inventory = items ?? [];
  const next = bookingNextSteps(job.allocation_method);
  const amountDue = payment?.amount ?? quote.total_price ?? job.customer_price;

  return (
    <main id="main-content" className="bg-brand-50/40 py-12 sm:py-16">
      <Container className="max-w-3xl">
        {/* Confirmation ------------------------------------------------- */}
        <div className="rounded-2xl border border-mint-100 bg-mint-50 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-mint-600">
            Booking confirmed
          </p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold text-ink-900 sm:text-4xl">
            You&apos;re booked in for {formatMoveDate(quote.selected_date)}
          </h1>
          <p className="mt-3 text-ink-700">
            Your booking reference is{" "}
            <span className="font-heading text-lg font-extrabold tracking-wide text-ink-900">
              #{quote.reference}
            </span>
            . Quote it whenever you get in touch.
            {quote.contact_name ? ` Thanks, ${quote.contact_name.split(" ")[0]}.` : ""}
          </p>
        </div>

        {/* Summary ------------------------------------------------------ */}
        <section className="mt-6 rounded-2xl border border-brand-100 bg-white p-6 sm:p-8">
          <h2 className="font-heading text-xl font-bold text-ink-900">Your move</h2>

          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-700">Date</dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink-900">
                {formatMoveDate(quote.selected_date)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-700">Crew</dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink-900">
                {quote.crew_size === 2 ? "2 people" : "1 person (driver)"}
                {quote.helper_included ? " · helper included" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-700">
                Collection window
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink-900">
                {windowLabel(quote.collection_window_start, quote.collection_window_end)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-700">
                Delivery window
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink-900">
                {windowLabel(quote.delivery_window_start, quote.delivery_window_end)}
              </dd>
            </div>
          </dl>

          {/* Route ------------------------------------------------------ */}
          <h3 className="mt-7 font-heading text-base font-bold text-ink-900">Route</h3>
          <ol className="mt-3 flex flex-col gap-3">
            {route.map((stop, index) => (
              <li key={stop.id} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">
                    {index === 0
                      ? "Pickup"
                      : index === route.length - 1
                        ? "Delivery"
                        : `Stop ${index}`}
                  </p>
                  <p className="text-sm font-semibold text-ink-900">
                    {[stop.address_line, stop.postcode].filter(Boolean).join(", ") ||
                      stop.address_text ||
                      "—"}
                  </p>
                  <p className="text-xs text-ink-700">
                    {floorLabel(stop.floor as FloorLevel)}
                    {stop.has_lift ? " · lift available" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {/* Items ------------------------------------------------------ */}
          <h3 className="mt-7 font-heading text-base font-bold text-ink-900">
            Items{" "}
            <span className="font-sans text-sm font-normal text-ink-700">
              ({Number(quote.total_volume_m3 ?? 0).toFixed(2)} m³ total)
            </span>
          </h3>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {inventory.map((item) => (
              <li key={item.id} className="flex justify-between gap-4">
                <span className="text-ink-900">{item.custom_name ?? "Item"}</span>
                <span className="shrink-0 font-semibold text-ink-700">×{item.quantity}</span>
              </li>
            ))}
          </ul>

          {quote.access_notes && (
            <>
              <h3 className="mt-7 font-heading text-base font-bold text-ink-900">Your notes</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{quote.access_notes}</p>
            </>
          )}

          {/* Amount ----------------------------------------------------- */}
          <div className="mt-7 flex items-baseline justify-between gap-4 border-t border-brand-100 pt-5">
            <span className="font-heading text-base font-bold text-ink-900">Amount due</span>
            <span className="font-heading text-2xl font-extrabold tabular-nums text-ink-900">
              {amountDue === null || amountDue === undefined
                ? "—"
                : `£${Number(amountDue).toFixed(2)}`}
            </span>
          </div>
          <p className="mt-1 text-right text-xs text-ink-700">
            {PAYMENT_STATUS_LABELS[payment?.status ?? "unpaid"]}
          </p>
        </section>

        {/* What happens next -------------------------------------------- */}
        <section className="mt-6 rounded-2xl border border-brand-100 bg-white p-6 sm:p-8">
          <h2 className="font-heading text-xl font-bold text-ink-900">{next.headline}</h2>
          <ol className="mt-4 flex flex-col gap-3">
            {next.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-ink-700">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700"
                >
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-5 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">
              Payment — not collected online yet
            </p>
            <p className="mt-1.5 text-sm text-ink-700">{next.paymentNote}</p>
          </div>
        </section>

        {/* Actions ------------------------------------------------------- */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/customer/bookings/${job.id}`}
            className="flex-1 rounded-full bg-coral-500 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-coral-600"
          >
            Track this booking
          </Link>
          <Link
            href="/customer/dashboard"
            className="flex-1 rounded-full border border-brand-300 px-6 py-3 text-center text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-50"
          >
            Go to my dashboard
          </Link>
        </div>

        {/* Only claim an email was sent if one actually could be — see
            lib/email/send.ts. No provider is configured yet. */}
        <p className="mt-6 text-center text-sm text-ink-700">
          {emailConfigured ? (
            <>
              We&apos;ve emailed a copy of this to you. Nothing arrived? Check your spam folder,
              or just keep reference{" "}
              <span className="font-semibold text-ink-900">#{quote.reference}</span> to hand.
            </>
          ) : (
            <>
              Confirmation emails aren&apos;t switched on yet, so please save this page or note
              your reference{" "}
              <span className="font-semibold text-ink-900">#{quote.reference}</span>. Your
              booking is safe either way — it&apos;s always in{" "}
              <Link
                href="/customer/bookings"
                className="font-semibold text-brand-600 underline underline-offset-2"
              >
                My Bookings
              </Link>
              .
            </>
          )}
        </p>
      </Container>
    </main>
  );
}
