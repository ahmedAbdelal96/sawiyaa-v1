"use client";

import { cn } from "@/lib/utils";

export type ReviewStepItem = {
  key: string;
  index: number;
  label: string;
};

type Props = {
  steps: ReviewStepItem[];
  activeStep: number;
  onStepChange: (step: number) => void;
};

export default function AdminApplicationReviewStepper({ steps, activeStep, onStepChange }: Props) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((step) => {
        const isActive = step.index === activeStep;
        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onStepChange(step.index)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-3 py-3 text-right text-sm transition",
              isActive
                ? "border-primary bg-primary-light text-primary"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
            )}
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/20 text-xs font-semibold">
              {step.index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{step.label}</span>
          </button>
        );
      })}
    </div>
  );
}

