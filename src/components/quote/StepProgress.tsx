const STEP_LABELS = ["What's moving", "Route & date", "Details", "Estimate", "Confirm"];

export function StepProgress({ currentStep }: { currentStep: number }) {
  return (
    <ol className="flex items-center justify-between gap-2" aria-label="Quote progress">
      {STEP_LABELS.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isDone = stepNumber < currentStep;
        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <span
              aria-current={isActive ? "step" : undefined}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                isDone
                  ? "bg-mint-500 text-white"
                  : isActive
                    ? "bg-brand-600 text-white"
                    : "bg-brand-50 text-ink-700"
              }`}
            >
              {isDone ? "✓" : stepNumber}
            </span>
            <span
              className={`hidden text-xs font-medium sm:block ${
                isActive ? "text-ink-900" : "text-ink-700"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
