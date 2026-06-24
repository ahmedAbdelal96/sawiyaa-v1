"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

type MoneyFact = {
  label: ReactNode;
  value: ReactNode;
  helper?: ReactNode;
};

type MoneyAction = {
  label: ReactNode;
  href: string;
  tone?: "primary" | "secondary";
};

type Props = {
  eyebrow?: ReactNode;
  title: ReactNode;
  note?: ReactNode;
  facts?: MoneyFact[];
  actions?: MoneyAction[];
  variant?: "default" | "soft";
};

export default function PatientMoneyClarityPanel({
  eyebrow,
  title,
  note,
  facts = [],
  actions = [],
  variant = "default",
}: Props) {
  const shellClassName =
    variant === "soft"
      ? "rounded-[28px] border border-primary/10 bg-primary-light/40 p-5 dark:border-primary/15 dark:bg-primary/10"
      : "rounded-[28px] border border-border-light bg-white p-5 shadow-[0_16px_34px_-28px_rgba(34,52,56,0.16)] dark:border-border-light dark:bg-surface-secondary";

  return (
    <section className={shellClassName}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
      ) : null}

      <h3
        className={`text-base font-semibold text-text-primary dark:text-white/95 ${eyebrow ? "mt-1.5" : ""}`}
      >
        {title}
      </h3>

      {note ? <p className="mt-2 text-sm leading-6 text-text-secondary">{note}</p> : null}

      {facts.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {facts.map((fact, index) => (
            <div
              key={`${index}-${String(fact.label)}`}
              className="rounded-2xl border border-border-light bg-surface-primary px-4 py-3 dark:bg-white/5"
            >
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
                {fact.label}
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
                {fact.value}
              </p>
              {fact.helper ? (
                <p className="mt-1 text-xs leading-5 text-text-secondary">{fact.helper}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {actions.map((action) => (
            <Link
              key={`${action.href}-${String(action.label)}`}
              href={action.href as never}
              className={`inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                action.tone === "primary"
                  ? "bg-primary text-white hover:bg-primary-hover"
                  : "border border-border-light bg-white text-text-primary hover:border-primary/30 hover:text-primary dark:bg-white/5 dark:text-white/90"
              }`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
