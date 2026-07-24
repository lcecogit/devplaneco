"use client";

import { createClient } from "@/lib/supabase/client";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

export function CancelBookingButton({ jobId }: { jobId: string }) {
  async function cancel() {
    const supabase = createClient();
    const { error } = await supabase
      .from("jobs")
      .update({ matching_status: "cancelled" })
      .eq("id", jobId)
      .eq("matching_status", "listed");

    return error ? { error: error.message } : undefined;
  }

  return (
    <ConfirmButton
      label="Cancel booking"
      confirmLabel="Confirm cancellation"
      description="This booking hasn't been matched to a partner yet, so it can be cancelled with no charge."
      variant="danger"
      onConfirm={cancel}
    />
  );
}
