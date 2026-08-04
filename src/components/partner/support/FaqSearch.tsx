"use client";

import { useMemo, useState } from "react";
import type { FaqEntry } from "@/lib/constants/partner-faq";

export function FaqSearch({ faqs }: { faqs: FaqEntry[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        faq.topic.toLowerCase().includes(q)
    );
  }, [faqs, query]);

  const topics = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const faq of filtered) {
      if (!seen.has(faq.topic)) {
        seen.add(faq.topic);
        ordered.push(faq.topic);
      }
    }
    return ordered;
  }, [filtered]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search help articles…"
        className="w-full rounded-lg border border-brand-100 px-4 py-3 text-sm text-ink-900 outline-none focus:border-brand-500"
      />

      {!filtered.length ? (
        <p className="mt-6 text-sm text-ink-700">
          No results for &ldquo;{query}&rdquo; — try a different search term.
        </p>
      ) : (
        topics.map((topic) => (
          <div key={topic} className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-700">
              {topic}
            </h2>
            <div className="mt-2 flex flex-col divide-y divide-brand-100 rounded-2xl border border-brand-100 bg-white">
              {filtered
                .filter((faq) => faq.topic === topic)
                .map((faq) => (
                  <details key={faq.question} className="p-5">
                    <summary className="cursor-pointer text-sm font-bold text-ink-900">
                      {faq.question}
                    </summary>
                    <p className="mt-2 text-sm text-ink-700">{faq.answer}</p>
                  </details>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
