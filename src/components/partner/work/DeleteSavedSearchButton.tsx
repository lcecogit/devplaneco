"use client";

import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { createClient } from "@/lib/supabase/client";

export function DeleteSavedSearchButton({ savedSearchId }: { savedSearchId: string }) {
  async function remove() {
    const supabase = createClient();
    const { error } = await supabase.from("saved_searches").delete().eq("id", savedSearchId);
    if (error) return { error: error.message };
  }

  return (
    <ConfirmButton
      label="Delete"
      confirmLabel="Delete alert"
      description="You'll stop getting matches from this alert. This can't be undone."
      variant="danger"
      onConfirm={remove}
    />
  );
}
