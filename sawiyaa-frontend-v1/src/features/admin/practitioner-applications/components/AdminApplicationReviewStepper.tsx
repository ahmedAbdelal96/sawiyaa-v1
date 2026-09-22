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
    <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
      {steps.map((step) => {
        const isActive = step.index === activeStep;
        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onStepChange(step.index)}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-start transition-all duration-150 active:scale-98",
              isActive
                ? "border-primary bg-primary text-white shadow-2xs font-bold"
                : "border-border-light bg-surface text-text-secondary font-semibold hover:border-primary/30 hover:bg-surface-secondary hover:text-text-primary dark:bg-surface-secondary/20",
            )}
          >
            <span
              className={cn(
                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black transition-colors",
                isActive
                  ? "bg-white/20 text-white"
                  : "bg-surface-secondary text-text-secondary border border-border-light",
              )}
            >
              {step.index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-bold">
              {step.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
