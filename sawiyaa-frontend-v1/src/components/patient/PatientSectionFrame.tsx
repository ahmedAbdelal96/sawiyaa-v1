"use client";

import type { ReactNode } from "react";
import { CalendarDays, CreditCard, LifeBuoy, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type PatientSectionFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
};

const shortcuts = [
  {
    href: "/patient/sessions",
    labelKey: "shell.sessions",
    icon: CalendarDays,
  },
  {
    href: "/patient/payments",
    labelKey: "shell.payments",
    icon: CreditCard,
  },
  {
    href: "/patient/profile",
    labelKey: "shell.profile",
    icon: UserRound,
  },
  {
    href: "/patient/messages?lane=support",
    labelKey: "shell.support",
    icon: LifeBuoy,
  },
] as const;

export default function PatientSectionFrame({
  eyebrow,
  title,
  description,
  children,
  className,
}: PatientSectionFrameProps) {
  const tArea = useTranslations("patient-area");

  return (
    <div className={cn("app-max-content mx-auto space-y-5 sm:space-y-6", className)}>
      <section className="app-panel rounded-[32px] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary sm:text-base">
              {description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {shortcuts.map(({ href, labelKey, icon: Icon }) => (
              <Link
                key={href}
                href={href as never}
                className="inline-flex items-center gap-2 rounded-full border border-border-light bg-surface-secondary px-4 py-2 text-sm font-medium text-text-secondary transition-all hover:border-primary/30 hover:bg-primary-light/60 hover:text-primary dark:bg-surface-secondary dark:hover:bg-primary/10"
              >
                <Icon className="h-4 w-4" />
                <span>{tArea(labelKey)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {children}
    </div>
  );
}

export function PatientQuickNav() {
  const tArea = useTranslations("patient-area");
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {shortcuts.map(({ href, labelKey, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href as never}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
              active
                ? "border-primary/20 bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light"
                : "border-border-light bg-surface-secondary text-text-secondary hover:border-primary/30 hover:bg-primary-light/60 hover:text-primary dark:bg-surface-secondary dark:hover:bg-primary/10",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tArea(labelKey)}</span>
          </Link>
        );
      })}
    </div>
  );
}
