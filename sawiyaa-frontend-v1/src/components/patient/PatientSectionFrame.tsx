"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PatientSectionFrameProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export default function PatientSectionFrame({
  title,
  description,
  children,
  className,
}: PatientSectionFrameProps) {
  return (
    <div className={cn("mx-auto max-w-5xl px-4 py-6 sm:py-8 space-y-6", className)}>
      <div className="border-b border-border-light/60 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary dark:text-white">
          {title}
        </h1>
        {description ? (
          <p className="text-xs text-text-secondary mt-0.5 max-w-2xl">
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </div>
  );
}

export function PatientQuickNav() {
  return null;
}
