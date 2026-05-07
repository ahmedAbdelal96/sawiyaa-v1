"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";

type PaymentCheckoutShellProps = {
  backHref: string;
  backLabel: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
  sidebar: ReactNode;
};

export default function PaymentCheckoutShell({
  backHref,
  backLabel,
  eyebrow,
  title,
  description,
  summary,
  children,
  sidebar,
}: PaymentCheckoutShellProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <section className="rounded-[32px] border border-border-light bg-white p-6 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary">
        <Link
          href={backHref as never}
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary"
        >
          <DirectionalArrowIcon direction="back" className="h-[13px] w-[13px]" />
          {backLabel}
        </Link>

        {eyebrow ? (
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="mt-3 text-2xl font-bold text-text-primary dark:text-white/95 md:text-3xl">
          {title}
        </h1>

        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-7 text-text-secondary">
            {description}
          </p>
        ) : null}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2.15fr)_320px]">
        <main className="space-y-5">
          {summary}
          {children}
        </main>

        <aside className="h-fit rounded-[32px] border border-border-light bg-white p-5 shadow-[0_18px_38px_-30px_rgba(34,52,56,0.22)] dark:border-border-light dark:bg-surface-secondary lg:sticky lg:top-20">
          {sidebar}
        </aside>
      </div>
    </div>
  );
}
