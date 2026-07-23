import type { Metadata } from "next";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { BellIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Alerts" };

// No backing table yet — job alert preferences/notifications aren't part of
// the Phase 2 schema. Structural shell only, per this phase's scope.
export default function AlertsPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Alerts</h1>
      <p className="mt-1 text-sm text-ink-700">
        Get notified the moment a job matching your criteria is listed.
      </p>

      <EmptyState
        icon={BellIcon}
        title="Job alerts are coming soon"
        description="Once the job matching engine is live, you'll be able to set up alerts for the routes and categories you care about."
      />
    </div>
  );
}
