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
    <section className="rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <AdminApplicationReviewStepper steps={steps} activeStep={activeStep} onStepChange={onStepChange} />
      </div>

      <div className="px-5 py-5 lg:px-6 lg:py-6">{children}</div>

      <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPrevious}
            disabled={previousDisabled}
            className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {previousLabel}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {nextLabel}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {backLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
