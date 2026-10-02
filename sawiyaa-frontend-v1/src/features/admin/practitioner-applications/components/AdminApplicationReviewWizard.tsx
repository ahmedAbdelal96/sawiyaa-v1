"use client";

import AdminApplicationReviewStepper, { type ReviewStepItem } from "./AdminApplicationReviewStepper";
import type { ReactNode } from "react";

type Props = {
  steps: ReviewStepItem[];
  activeStep: number;
  onStepChange: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onBack: () => void;
  nextLabel: string;
  previousLabel: string;
  backLabel: string;
  nextDisabled: boolean;
  previousDisabled: boolean;
  children: ReactNode;
};

export default function AdminApplicationReviewWizard({
  steps,
  activeStep,
  onStepChange,
  onNext,
  onPrevious,
  onBack,
  nextLabel,
  previousLabel,
  backLabel,
  nextDisabled,
  previousDisabled,
  children,
}: Props) {
  return (
    <section className="rounded-2xl border border-border-light bg-surface shadow-2xs dark:bg-surface-secondary/40">
      <div className="border-b border-border-light px-4 py-3">
        <AdminApplicationReviewStepper steps={steps} activeStep={activeStep} onStepChange={onStepChange} />
      </div>

      <div className="p-4 lg:p-5">{children}</div>

      <div className="border-t border-border-light px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onPrevious}
            disabled={previousDisabled}
            className="inline-flex items-center rounded-xl border border-border-light bg-surface px-3.5 py-2 text-xs font-bold text-text-secondary shadow-2xs transition hover:border-primary/40 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {previousLabel}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {nextLabel}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center rounded-xl border border-border-light bg-surface px-3.5 py-2 text-xs font-bold text-text-secondary shadow-2xs transition hover:border-primary/40 hover:text-text-primary"
          >
            {backLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
