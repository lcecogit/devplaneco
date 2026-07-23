"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { UploadIcon } from "@/components/icons";

// Uploads to the public `vehicle-photos` bucket — the only public-read
// bucket from Phase 2 — under {transportPartnerId}/profile-photo/, since the
// storage RLS policies key off the partner's own transport_partners.id as
// the first path segment. Worth confirming with the project owner whether a
// dedicated public bucket for partner profile photos is wanted later —
// noted in the phase summary.
export function PhotoUploadField({
  transportPartnerId,
  currentUrl,
}: {
  transportPartnerId: string;
  currentUrl: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState(currentUrl);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    const supabase = createClient();
    const path = `${transportPartnerId}/profile-photo/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("vehicle-photos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("vehicle-photos").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("transport_partners")
      .update({ profile_photo_url: publicUrl })
      .eq("id", transportPartnerId);

    setUploading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPreviewUrl(publicUrl);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-50">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Profile photo"
            width={64}
            height={64}
            className="h-16 w-16 object-cover"
          />
        ) : (
          <UploadIcon className="h-6 w-6 text-brand-300" />
        )}
      </div>
      <label className="cursor-pointer rounded-full border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
        {uploading ? "Uploading…" : "Change photo"}
        <input
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="sr-only"
          disabled={uploading}
        />
      </label>
      {error && (
        <p role="alert" className="text-xs font-medium text-coral-600">
          {error}
        </p>
      )}
    </div>
  );
}
