"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { JobsMap, type MapPin } from "@/components/partner/work/JobsMap";

// Takes the already-rendered list markup as children (a Server Component
// output) rather than re-fetching/re-rendering it here — this component's
// only job is which view is visible, not the data.
export function FindWorkViewToggle({ pins, listView }: { pins: MapPin[]; listView: ReactNode }) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setView("list")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            view === "list" ? "bg-brand-600 text-white" : "border border-brand-300 text-ink-700 hover:bg-brand-50"
          }`}
        >
          List view
        </button>
        <button
          type="button"
          onClick={() => setView("map")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            view === "map" ? "bg-brand-600 text-white" : "border border-brand-300 text-ink-700 hover:bg-brand-50"
          }`}
        >
          Map view
        </button>
      </div>

      <div className="mt-4">
        {view === "list" ? (
          listView
        ) : (
          <JobsMap pins={pins} onSelectJob={(jobId) => router.push(`/partner/work/find/${jobId}`)} />
        )}
      </div>
    </div>
  );
}
