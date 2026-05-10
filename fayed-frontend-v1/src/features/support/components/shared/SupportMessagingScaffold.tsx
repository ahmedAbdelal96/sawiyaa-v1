"use client";

import type { ReactNode } from "react";
import { PatientQuickNav } from "@/components/patient/PatientSectionFrame";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: ReactNode;
  title: ReactNode;
  note?: ReactNode;
  actions?: ReactNode;
  density?: "regular" | "compact";
  children: ReactNode;
  className?: string;
};

export default function SupportMessagingScaffold({
  eyebrow,
  title,
  note,
  actions,
  density = "regular",
  children,
  className,
}: Props) {
  const shellClassName =
    density === "compact" ? "space-y-4 sm:space-y-5" : "app-max-content mx-auto space-y-5 sm:space-y-6";
  const heroClassName = density === "compact" ? "app-panel rounded-[28px] p-4 sm:p-5" : "app-panel rounded-[32px] p-5 sm:p-7";

  return (
    <div className={cn(shellClassName, className)}>
      <section className={heroClassName}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            {eyebrow ? (
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {title}
            </h1>
            {note ? (
              <p className="mt-3 text-sm leading-6 text-text-secondary sm:text-base">{note}</p>
            ) : null}
          </div>

          {actions ? <div className="flex w-full items-start justify-end sm:w-auto">{actions}</div> : null}
        </div>

        <div className="mt-5 border-t border-border-light/70 pt-4 dark:border-white/10">
          <PatientQuickNav />
        </div>
      </section>

      {children}
    </div>
  );
}
