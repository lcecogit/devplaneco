"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
};

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type MessageTemplate = { id: string; name: string; body: string };

export function MessageThread({
  jobId,
  counterpartName,
  templates,
}: {
  jobId: string;
  counterpartName: string;
  // Partner-only: a customer thread never passes this, so the picker below
  // simply doesn't render for them. See message_templates, migration 0045.
  templates?: MessageTemplate[];
}) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentProfileId(user?.id ?? null);

      const { data } = await supabase
        .from("messages")
        .select("id, sender_profile_id, body, created_at")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });
      setMessages(data ?? []);

      // Fire-and-forget: marks the other side's messages read now that this
      // thread has been opened. See migration 0034 for why this is an RPC
      // rather than a plain UPDATE (a participant can't grant themselves a
      // general write on the table).
      await supabase.rpc("mark_messages_read", { p_job_id: jobId });
    }

    load();
  }, [jobId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send() {
    const trimmed = body.trim();
    if (!trimmed || !currentProfileId) return;

    setError(null);
    setSending(true);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("messages")
      .insert({ job_id: jobId, sender_profile_id: currentProfileId, body: trimmed })
      .select("id, sender_profile_id, body, created_at")
      .single();
    setSending(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setMessages((prev) => [...(prev ?? []), data]);
    setBody("");
  }

  if (messages === null) {
    return <p className="text-sm text-ink-700">Loading conversation…</p>;
  }

  return (
    <div className="flex flex-col rounded-2xl border border-brand-100 bg-white">
      <div className="flex max-h-[28rem] min-h-[16rem] flex-col gap-3 overflow-y-auto p-5">
        {!messages.length ? (
          <p className="text-sm text-ink-700">
            No messages yet — say hello to {counterpartName} about this job.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.sender_profile_id === currentProfileId;
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    mine ? "bg-coral-500 text-white" : "bg-brand-50 text-ink-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.body}</p>
                  <p className={`mt-1 text-xs ${mine ? "text-white/70" : "text-ink-700"}`}>
                    {formatTimestamp(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-brand-100 p-4">
        {error && (
          <p role="alert" className="mb-2 text-xs font-medium text-coral-600">
            {error}
          </p>
        )}
        {!!templates?.length && (
          <select
            value=""
            onChange={(e) => {
              const template = templates.find((t) => t.id === e.target.value);
              if (template) setBody(template.body);
            }}
            className="mb-2 w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-xs text-ink-700 outline-none focus:border-brand-500"
          >
            <option value="">Insert a saved template…</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Message ${counterpartName}…`}
            rows={2}
            className="flex-1 resize-none rounded-lg border border-brand-100 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !body.trim()}
            className="self-end rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
