import "server-only";

// The booking confirmation email.
//
// Plain text only, on purpose for a first pass: it renders everywhere, it
// can't break, and it's the version that matters if a provider strips HTML.
// When a provider is configured (see ./send.ts) an HTML variant can be added
// alongside it without changing any caller.

import { bookingNextSteps } from "@/lib/booking/next-steps";
import { formatWindow, floorLabel, type FloorLevel, type TimeWindow } from "@/lib/quote/types";
import { siteConfig } from "@/lib/site-config";
import { sendEmail, type EmailResult } from "@/lib/email/send";

export type BookingConfirmationEmail = {
  to: string;
  contactName: string | null;
  reference: string;
  jobId: string;
  selectedDate: string | null;
  collectionWindow: TimeWindow | null;
  deliveryWindow: TimeWindow | null;
  stops: { label: string; floor: FloorLevel; hasLift: boolean }[];
  items: { name: string; quantity: number }[];
  totalVolumeM3: number;
  totalGBP: number | null;
  allocationMethod: string;
};

export function formatMoveDate(dateIso: string | null): string {
  if (!dateIso) return "Date to be confirmed";
  return new Date(`${dateIso}T00:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function buildBookingConfirmationText(booking: BookingConfirmationEmail): string {
  const next = bookingNextSteps(booking.allocationMethod);
  const greeting = booking.contactName ? `Hi ${booking.contactName},` : "Hi,";

  const lines: string[] = [
    greeting,
    "",
    `Your booking is confirmed. Your reference is ${booking.reference} — quote it if you get in touch.`,
    "",
    "YOUR MOVE",
    `Date:       ${formatMoveDate(booking.selectedDate)}`,
    `Collection: ${booking.collectionWindow ? formatWindow(booking.collectionWindow) : "Any time on the day"}`,
    `Delivery:   ${booking.deliveryWindow ? formatWindow(booking.deliveryWindow) : "Any time on the day"}`,
    "",
    "ROUTE",
    ...booking.stops.map((stop, index) => {
      const role =
        index === 0 ? "Pickup  " : index === booking.stops.length - 1 ? "Delivery" : `Stop ${index}  `;
      const access = `${floorLabel(stop.floor)}${stop.hasLift ? ", lift available" : ""}`;
      return `${role}  ${stop.label} (${access})`;
    }),
    "",
    `ITEMS (${booking.totalVolumeM3.toFixed(2)} m3 total)`,
    ...booking.items.map((item) => `- ${item.quantity} x ${item.name}`),
    "",
    booking.totalGBP === null
      ? "AMOUNT DUE: to be confirmed"
      : `AMOUNT DUE: £${booking.totalGBP.toFixed(2)}`,
    next.paymentNote,
    "",
    next.headline.toUpperCase(),
    ...next.steps.map((step) => `- ${step}`),
    "",
    `Track your booking: ${siteConfig.url}/customer/bookings/${booking.jobId}`,
    "",
    `Questions? Call ${siteConfig.supportPhone} or reply to this email.`,
    "",
    siteConfig.name,
  ];

  return lines.join("\n");
}

/**
 * Sends the confirmation. Returns the delivery outcome rather than throwing —
 * a booking that exists but whose receipt didn't send is a much better
 * outcome than the reverse, so the caller logs this and carries on.
 */
export async function sendBookingConfirmationEmail(
  booking: BookingConfirmationEmail
): Promise<EmailResult> {
  return sendEmail({
    to: booking.to,
    subject: `Booking confirmed — ${booking.reference} — ${formatMoveDate(booking.selectedDate)}`,
    text: buildBookingConfirmationText(booking),
  });
}
