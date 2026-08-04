"use client";

import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { createClient } from "@/lib/supabase/client";

export function CancelReservationButton({ reservationId }: { reservationId: string }) {
  async function cancel() {
    const supabase = createClient();
    // reservations_delete lets a partner remove their own row — there's no
    // 'cancelled' value in reservation_status, so a still-pending
    // reservation (nothing matched to it yet) is simply deleted rather than
    // status-flipped. Gated to `status = 'pending'` here in the query so a
    // reservation that's already accepted/partially/fully booked can't be
    // silently wiped once real jobs depend on it.
    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", reservationId)
      .eq("status", "pending");

    if (error) return { error: error.message };
  }

  return (
    <ConfirmButton
      label="Cancel"
      confirmLabel="Cancel reservation"
      description="This removes the reservation. You can create a new one any time."
      variant="danger"
      onConfirm={cancel}
    />
  );
}
