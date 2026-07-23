"use client";

import { createClient } from "@/lib/supabase/client";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export function PmpActions({
  transportPartnerId,
  currentPlan,
}: {
  transportPartnerId: string;
  currentPlan: { id: string; status: string } | null;
}) {
  async function startPlan(reasonText: string) {
    const supabase = createClient();
    const { error } = await supabase.from("performance_management_plans").insert({
      transport_partner_id: transportPartnerId,
      status: "active",
      reason: reasonText,
    });
    return error ? { error: error.message } : undefined;
  }

  async function updatePlan(status: "resolved" | "terminated") {
    const supabase = createClient();
    const { error } = await supabase
      .from("performance_management_plans")
      .update({ status })
      .eq("id", currentPlan!.id);
    return error ? { error: error.message } : undefined;
  }

  if (currentPlan?.status === "active") {
    return (
      <div className="flex flex-wrap gap-3">
        <ConfirmButton
          label="Resolve plan"
          confirmLabel="Confirm resolve"
          description="Marks this performance management plan as resolved."
          variant="primary"
          onConfirm={() => updatePlan("resolved")}
        />
        <ConfirmButton
          label="Terminate plan"
          confirmLabel="Confirm termination"
          description="Marks this performance management plan as terminated — use for a partner offboarding."
          variant="danger"
          onConfirm={() => updatePlan("terminated")}
        />
      </div>
    );
  }

  return (
    <ConfirmButton
      label="Start a performance management plan"
      confirmLabel="Start plan"
      description="Flags this partner as under a performance management plan."
      variant="danger"
      reason="required"
      reasonLabel="Reason"
      onConfirm={(reasonText) => startPlan(reasonText)}
    />
  );
}
