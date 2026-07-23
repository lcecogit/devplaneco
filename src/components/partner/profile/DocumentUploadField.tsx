"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Uploads to the private `partner-documents` bucket. We store the storage
// path (not a public URL — the bucket is private) in the given column, and
// the page passes down a short-lived signed URL for the "view current file"
// link, generated server-side each time the page loads.
export function DocumentUploadField({
  label,
  transportPartnerId,
  column,
  currentSignedUrl,
  hasCurrentFile,
}: {
  label: string;
  transportPartnerId: string;
  column: "goods_in_transit_insurance_doc_url" | "cmr_insurance_doc_url";
  currentSignedUrl: string | null;
  hasCurrentFile: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(hasCurrentFile);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    const supabase = createClient();
    const path = `${transportPartnerId}/${column}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("partner-documents")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const update =
      column === "goods_in_transit_insurance_doc_url"
        ? { goods_in_transit_insurance_doc_url: path }
        : { cmr_insurance_doc_url: path };

    const { error: updateError } = await supabase
      .from("transport_partners")
      .update(update)
      .eq("id", transportPartnerId);

    setUploading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setUploaded(true);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-brand-100 p-4">
      <p className="text-sm font-medium text-ink-800">{label}</p>
      <div className="flex flex-wrap items-center gap-3">
        {uploaded && currentSignedUrl && (
          <a
            href={currentSignedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            View current file
          </a>
        )}
        {uploaded && !currentSignedUrl && (
          <span className="text-sm text-mint-600">Uploaded</span>
        )}
        <label className="cursor-pointer rounded-full border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
          {uploading ? "Uploading…" : uploaded ? "Replace file" : "Upload file"}
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={handleChange}
            className="sr-only"
            disabled={uploading}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-coral-600">
          {error}
        </p>
      )}
    </div>
  );
}
