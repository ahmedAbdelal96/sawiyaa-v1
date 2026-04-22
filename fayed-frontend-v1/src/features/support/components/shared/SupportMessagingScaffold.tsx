"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: ReactNode;
  title: ReactNode;
  note?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function SupportMessagingScaffold({
  eyebrow,
  title,
  note,
  actions,
  children,
  className,
}: Props) {
  return (
    <div className={cn("app-max-content mx-auto space-y-5 sm:space-y-6", className)}>
      <section className="app-panel rounded-[32px] p-5 sm:p-7">
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
      </section>

      {children}
    </div>
  );
}

