import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  SurfaceCard,
  SurfaceHeader,
  SurfaceStatCard,
} from "@/components/shared/SurfaceShell";

type PatientPageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PatientPageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  className,
}: PatientPageHeaderProps) {
  return (
    <SurfaceCard variant="page" className={cn("overflow-hidden", className)}>
      <SurfaceHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        meta={meta}
        actions={actions}
      />
    </SurfaceCard>
  );
}

type PatientSectionCardProps = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  tone?: "default" | "subtle";
  className?: string;
};

export function PatientSectionCard({
  eyebrow,
  title,
  description,
  actions,
  children,
  tone = "default",
  className,
}: PatientSectionCardProps) {
  return (
    <SurfaceCard
      variant={tone === "subtle" ? "subtle" : "section"}
      className={cn("overflow-hidden", className)}
    >
      {(eyebrow || title || description || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-xl">
                  {title}
                </h2>
                {description ? (
                  <p className="max-w-3xl text-sm leading-6 text-text-secondary">
                    {description}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      )}

      <div className={cn(title || description || eyebrow || actions ? "mt-4" : "")}>{children}</div>
    </SurfaceCard>
  );
}

type PatientActionPanelProps = {
  href: string;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function PatientActionPanel({
  href,
  label,
  description,
  icon,
  className,
}: PatientActionPanelProps) {
  return (
    <Link
      href={href as never}
      className={cn(
        "app-panel-soft flex items-start gap-3 rounded-[24px] px-4 py-4 transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-surface-secondary dark:hover:bg-white/8",
        className,
      )}
    >
      {icon ? (
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary dark:text-white/95">{label}</p>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-text-secondary">{description}</p>
        ) : null}
      </div>
    </Link>
  );
}

type PatientStatusBadgeProps = {
  children: ReactNode;
  className?: string;
};

export function PatientStatusBadge({ children, className }: PatientStatusBadgeProps) {
  return (
    <span className={cn("app-chip inline-flex rounded-full px-3 py-1.5 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

type PatientStatCardProps = {
  label: string;
  value: string;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "brand" | "primary" | "success" | "warning";
  className?: string;
};

export function PatientStatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  className,
}: PatientStatCardProps) {
  return (
    <SurfaceStatCard
      label={label}
      value={value}
      hint={hint}
      icon={icon}
      tone={tone}
      className={className}
    />
  );
}
