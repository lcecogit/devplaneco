"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DOC_TYPES = [
  { value: "log_book", label: "Log book (V5C)" },
  { value: "mot", label: "MOT certificate" },
  { value: "v5", label: "V5 registration document" },
] as const;

export type ExistingDoc = {
  docType: (typeof DOC_TYPES)[number]["value"];
  signedUrl: string | null;
};

export function VehicleDocumentsSection({
  transportPartnerId,
  vehicleId,
  existingDocs,
}: {
  transportPartnerId: string;
  vehicleId: string;
  existingDocs: ExistingDoc[];
}) {
  const router = useRouter();
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(
    docType: (typeof DOC_TYPES)[number]["value"],
    file: File
  ) {
    setError(null);
    setUploadingType(docType);

    const supabase = createClient();
    const path = `${transportPartnerId}/${vehicleId}/${docType}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("vehicle-documents")
      .upload(path, file);

    if (uploadError) {
      setUploadingType(null);
      setError(uploadError.message);
      return;
    }

    const { error: insertError } = await supabase
      .from("vehicle_documents")
      .insert({ vehicle_id: vehicleId, doc_type: docType, file_url: path });

    setUploadingType(null);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {DOC_TYPES.map((docType) => {
        const existing = existingDocs.find((d) => d.docType === docType.value);
        return (
          <div
            key={docType.value}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-100 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-ink-800">{docType.label}</p>
              {existing?.signedUrl && (
                <a
                  href={existing.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  View uploaded file
                </a>
              )}
            </div>
            <label className="cursor-pointer rounded-full border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
              {uploadingType === docType.value
                ? "Uploading…"
                : existing
                  ? "Replace"
                  : "Upload"}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="sr-only"
                disabled={uploadingType === docType.value}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(docType.value, file);
                }}
              />
            </label>
          </div>
        );
      })}
      {error && (
        <p role="alert" className="text-xs font-medium text-coral-600">
          {error}
        </p>
      )}
    </div>
  );
}
