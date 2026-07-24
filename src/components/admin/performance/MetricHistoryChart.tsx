export function MetricHistoryChart({
  data,
  max,
  label,
}: {
  data: { period: string; value: number }[];
  max: number;
  label: string;
}) {
  if (!data.length) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-700">{label}</p>
        <p className="mt-2 text-sm text-ink-700">No history yet.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-700">{label}</p>
      <div className="mt-3 flex h-32 items-end gap-2">
        {data.map((point) => (
          <div key={point.period} className="flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-brand-500"
              style={{ height: `${Math.max(4, (point.value / max) * 100)}%` }}
              title={`${point.period}: ${point.value}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        {data.map((point) => (
          <span key={point.period} className="flex-1 text-center text-[10px] text-ink-700">
            {point.period}
          </span>
        ))}
      </div>
    </div>
  );
}
