import type { Metadata } from "next";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { CalendarIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Book Now" };

// No backing table/flow yet — this is where customers will be able to book
// a partner directly from search results. Structural shell only.
export default function BookNowPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Book Now</h1>
      <p className="mt-1 text-sm text-ink-700">
        Jobs customers have booked with you directly, without going through bidding.
      </p>

      <EmptyState
        icon={CalendarIcon}
        title="No direct bookings yet"
        description="Once customers can book partners directly, those jobs will appear here."
      />
    </div>
  );
}
