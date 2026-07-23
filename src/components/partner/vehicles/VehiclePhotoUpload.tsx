"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { UploadIcon } from "@/components/icons";

export function VehiclePhotoUpload({
  transportPartnerId,
  vehicleId,
  currentUrl,
}: {
  transportPartnerId: string;
  vehicleId: string;
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
    const path = `${transportPartnerId}/${vehicleId}/${Date.now()}-${file.name}`;
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
      .from("vehicles")
      .update({ photo_url: publicUrl })
      .eq("id", vehicleId);

    setUploading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPreviewUrl(publicUrl);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-lg bg-brand-50">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Vehicle photo"
            width={112}
            height={80}
            className="h-20 w-28 object-cover"
          />
        ) : (
          <UploadIcon className="h-6 w-6 text-brand-300" />
        )}
      </div>
      <label className="cursor-pointer rounded-full border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
        {uploading ? "Uploading…" : "Upload photo"}
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
