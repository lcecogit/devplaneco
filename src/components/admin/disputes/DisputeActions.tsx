"use client";

import { createClient } from "@/lib/supabase/client";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export function DisputeActions({ chargeId }: { chargeId: string }) {
  async function resolve(waived: boolean, defaultResolution: string, note: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("deallocation_charges")
      .update({
        dispute_status: "resolved",
        waived,
        resolution: note || defaultResolution,
      })
      .eq("id", chargeId);

    return error ? { error: error.message } : undefined;
  }

  return (
    <div className="flex flex-wrap gap-3">
      <ConfirmButton
        label="Uphold charge"
        confirmLabel="Confirm uphold"
        description="The charge stands — the full amount is still owed."
        variant="primary"
        reason="optional"
        reasonLabel="Note (optional)"
        onConfirm={(note) => resolve(false, "Charge upheld — full amount stands.", note)}
      />
      <ConfirmButton
        label="Waive charge"
        confirmLabel="Confirm waive"
        description="The partner will not be charged."
        variant="danger"
        reason="optional"
        reasonLabel="Note (optional)"
        onConfirm={(note) => resolve(true, "Charge waived — no amount charged.", note)}
      />
    </div>
  );
}
