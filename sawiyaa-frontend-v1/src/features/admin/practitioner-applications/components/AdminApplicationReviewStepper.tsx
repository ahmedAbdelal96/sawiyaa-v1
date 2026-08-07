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
    <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((step) => {
        const isActive = step.index === activeStep;
        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onStepChange(step.index)}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-right transition-all duration-150",
              isActive
                ? "border-primary bg-primary/10 text-primary font-extrabold shadow-2xs dark:bg-primary/20 dark:text-primary-light"
                : "border-gray-300 bg-white text-gray-800 font-bold hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
            )}
          >
            <span className={cn(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
              isActive ? "bg-primary text-white" : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
            )}>
              {step.index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-bold text-sm">{step.label}</span>
          </button>
        );
      })}
    </div>
  );
}

