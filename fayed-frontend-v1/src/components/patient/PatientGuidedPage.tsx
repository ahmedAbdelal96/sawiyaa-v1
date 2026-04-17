import { ArrowLeft, CheckCircle2, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";
import { SurfaceActionLink, SurfaceCard } from "@/components/shared/SurfaceShell";

type GuidedListItem = {
  title: string;
  description: string;
};

type GuidedAction = {
  href: string;
  label: string;
};

type PatientGuidedPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: GuidedAction;
  secondaryAction?: GuidedAction;
  stepsTitle: string;
  steps: GuidedListItem[];
  tipsTitle: string;
  tips: string[];
  children?: ReactNode;
};

export default function PatientGuidedPage({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  stepsTitle,
  steps,
  tipsTitle,
  tips,
  children,
}: PatientGuidedPageProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <SurfaceCard as="section" variant="page">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/15 dark:text-primary-light">
              {eyebrow}
            </span>

            <div className="space-y-3">
              <h1 className="max-w-2xl text-3xl font-semibold leading-tight text-text-primary dark:text-white sm:text-4xl">
                {title}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-text-secondary dark:text-white/72 sm:text-base">
                {description}
              </p>
            </div>

            {(primaryAction || secondaryAction) && (
              <div className="flex flex-col gap-3 sm:flex-row">
                {primaryAction && (
                  <SurfaceActionLink href={primaryAction.href} variant="primary">
                    <span className="inline-flex items-center justify-center gap-2">
                      {primaryAction.label}
                      <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    </span>
                  </SurfaceActionLink>
                )}

                {secondaryAction && (
                  <SurfaceActionLink href={secondaryAction.href} variant="secondary">
                    {secondaryAction.label}
                  </SurfaceActionLink>
                )}
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-border-light bg-white p-5 dark:border-border-light dark:bg-surface-secondary">
            <div className="flex items-center gap-2 text-text-primary dark:text-white">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">{stepsTitle}</p>
            </div>

            <div className="mt-4 space-y-3">
              {steps.map((step) => (
                <div key={step.title} className="rounded-2xl bg-surface-secondary px-4 py-3 dark:bg-surface-tertiary">
                  <p className="text-sm font-semibold text-text-primary dark:text-white">
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary dark:text-white/72">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SurfaceCard>

      {children}

      <SurfaceCard as="section" variant="page">
        <div className="flex items-center gap-2 text-text-primary dark:text-white">
          <Lightbulb className="h-5 w-5 text-primary" />
          <p className="text-lg font-semibold">{tipsTitle}</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {tips.map((tip) => (
            <div
              key={tip}
              className="rounded-2xl border border-border-light bg-white px-4 py-4 text-sm leading-7 text-text-secondary dark:border-border-light dark:bg-surface-secondary dark:text-text-secondary"
            >
              {tip}
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
