"use client";

import { createClient } from "@/lib/supabase/client";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import type { Database } from "@/types/database";

type VehicleUpdate = Database["public"]["Tables"]["vehicles"]["Update"];

export function VehicleReviewActions({ vehicleId }: { vehicleId: string }) {
  async function updateVehicle(fields: VehicleUpdate) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("vehicles")
      .update({ ...fields, admin_reviewed_by: user!.id, admin_reviewed_at: new Date().toISOString() })
      .eq("id", vehicleId);

    return error ? { error: error.message } : undefined;
  }

  return (
    <div className="flex flex-wrap gap-3">
      <ConfirmButton
        label="Approve"
        confirmLabel="Confirm approval"
        description="This vehicle will be marked approved and become eligible for jobs."
        variant="primary"
        onConfirm={() =>
          updateVehicle({ approval_status: "approved", rejection_reason: null, admin_note: null })
        }
      />
      <ConfirmButton
        label="Reject"
        confirmLabel="Confirm rejection"
        description="The partner will see this vehicle as rejected, along with your reason."
        variant="danger"
        reason="required"
        reasonLabel="Rejection reason"
        onConfirm={(reasonText) =>
          updateVehicle({
            approval_status: "rejected",
            rejection_reason: reasonText,
            admin_note: null,
          })
        }
      />
      <ConfirmButton
        label="Request more info"
        confirmLabel="Send request"
        description="The vehicle stays under review and the partner sees your note."
        variant="neutral"
        reason="required"
        reasonLabel="Note for the partner"
        onConfirm={(reasonText) =>
          updateVehicle({
            approval_status: "under_review",
            admin_note: reasonText,
            rejection_reason: null,
          })
        }
      />
    </div>
  );
}
