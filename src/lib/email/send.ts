import "server-only";

// ===========================================================================
// NO EMAIL PROVIDER IS CONFIGURED ON THIS PROJECT YET.
// ===========================================================================
// Nothing in this codebase has ever sent an application email — Supabase Auth
// sends its own confirmation/reset mail through Supabase's built-in SMTP, and
// that's the extent of it. Rather than pick a vendor unilaterally and add a
// dependency plus an API key you'd have to go and create, this module is a
// provider-agnostic seam:
//
//   * With no provider configured (today), sendEmail() logs the full message
//     to the server console and returns { delivered: false,
//     reason: 'not_configured' }. Callers treat that as a non-fatal outcome —
//     a booking must never fail because a receipt didn't send.
//   * Once you've chosen a provider, implement `deliver()` below. That is the
//     only function that needs to change; every caller stays as it is.
//
// RECOMMENDED: Resend (https://resend.com) — one `RESEND_API_KEY`, a plain
// HTTPS POST so no SDK dependency is required, a free tier that covers early
// volume, and it works from a Netlify serverless function without the SMTP
// egress problems Nodemailer hits there. Postmark is the stronger choice if
// transactional deliverability matters more than price. Either way you'll
// need to verify a sending domain — `moversnow.example` in site-config.ts is
// a placeholder, so a real domain has to exist first.
//
// To switch on, set in Netlify (and .env.local for development):
//   EMAIL_PROVIDER=resend
//   RESEND_API_KEY=re_...
//   EMAIL_FROM="Movers Now <bookings@yourdomain.co.uk>"
// ===========================================================================

export type EmailMessage = {
  to: string;
  subject: string;
  /** Plain-text body. Always provided — it's the fallback that always works. */
  text: string;
  /** Optional HTML body. */
  html?: string;
};

export type EmailResult =
  | { delivered: true; providerId: string | null }
  | { delivered: false; reason: "not_configured" | "no_recipient" | "failed"; detail?: string };

const provider = process.env.EMAIL_PROVIDER ?? null;
const fromAddress = process.env.EMAIL_FROM ?? null;

/**
 * Whether email can actually leave this deployment. Exported so UI copy can
 * be honest about it — a confirmation page must not tell someone "we've
 * emailed you a copy" when nothing was sent.
 */
export const emailConfigured = Boolean(provider && fromAddress);

/**
 * Sends a transactional email, or explains why it couldn't.
 *
 * Never throws. Callers are things like booking confirmation, where failing
 * to send a receipt is worth logging and surfacing, but is not worth failing
 * the operation the customer actually asked for.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  if (!message.to) {
    return { delivered: false, reason: "no_recipient" };
  }

  if (!provider || !fromAddress) {
    // Deliberately verbose: while there's no provider, the server log IS the
    // outbox. Anything we'd have emailed is recoverable from here.
    console.info(
      [
        "[email] No provider configured — message not sent.",
        `        to:      ${message.to}`,
        `        subject: ${message.subject}`,
        message.text
          .split("\n")
          .map((line) => `        | ${line}`)
          .join("\n"),
      ].join("\n")
    );
    return { delivered: false, reason: "not_configured" };
  }

  try {
    return await deliver(message);
  } catch (error) {
    console.error("[email] Delivery failed:", error);
    return {
      delivered: false,
      reason: "failed",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * THE SWAP POINT. Implement this against whichever provider is configured.
 *
 * A Resend implementation is roughly:
 *
 *   const response = await fetch("https://api.resend.com/emails", {
 *     method: "POST",
 *     headers: {
 *       authorization: `Bearer ${process.env.RESEND_API_KEY}`,
 *       "content-type": "application/json",
 *     },
 *     body: JSON.stringify({
 *       from: fromAddress,
 *       to: [message.to],
 *       subject: message.subject,
 *       text: message.text,
 *       html: message.html,
 *     }),
 *   });
 *   if (!response.ok) throw new Error(await response.text());
 *   const body = await response.json();
 *   return { delivered: true, providerId: body.id ?? null };
 *
 * Left unwritten rather than half-written: an untested call to an API we have
 * no key for would look wired up when it isn't, which is worse than an honest
 * "not configured".
 */
async function deliver(message: EmailMessage): Promise<EmailResult> {
  throw new Error(
    `EMAIL_PROVIDER is set to "${provider}" but lib/email/send.ts has no implementation for it. ` +
      `Dropped message to ${message.to}: "${message.subject}".`
  );
}
