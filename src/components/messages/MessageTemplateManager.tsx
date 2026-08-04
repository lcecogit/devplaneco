"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

type Template = { id: string; name: string; body: string };

export function MessageTemplateManager({
  transportPartnerId,
  templates,
}: {
  transportPartnerId: string;
  templates: Template[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    const trimmedName = name.trim();
    const trimmedBody = body.trim();
    if (!trimmedName || !trimmedBody) return;

    setError(null);
    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("message_templates")
      .insert({ transport_partner_id: transportPartnerId, name: trimmedName, body: trimmedBody });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setName("");
    setBody("");
    router.refresh();
  }

  async function remove(id: string) {
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("message_templates").delete().eq("id", id);
    if (deleteError) return { error: deleteError.message };
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <h2 className="font-heading text-sm font-bold text-ink-900">New template</h2>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-800">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. On my way"
              className="rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-800">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Hi, I'm on my way and expect to arrive within the booked window."
              className="resize-none rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
            />
          </div>
          {error && (
            <p role="alert" className="text-xs font-medium text-coral-600">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={create}
            disabled={saving || !name.trim() || !body.trim()}
            className="self-start rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save template"}
          </button>
        </div>
      </div>

      {!templates.length ? (
        <p className="text-sm text-ink-700">No saved templates yet — add one above.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-white p-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-heading text-sm font-bold text-ink-900">{template.name}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{template.body}</p>
              </div>
              <div className="shrink-0">
                <ConfirmButton
                  label="Delete"
                  confirmLabel="Delete template"
                  description="This removes the template. Existing messages already sent aren't affected."
                  variant="danger"
                  onConfirm={() => remove(template.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
