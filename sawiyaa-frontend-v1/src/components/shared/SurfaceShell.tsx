import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type SurfaceVariant = "page" | "section" | "compact" | "subtle";
type SurfaceTone = "neutral" | "brand" | "primary" | "success" | "warning";

const SURFACE_VARIANTS: Record<SurfaceVariant, string> = {
  page: "rounded-[30px] border border-border-light bg-surface-secondary p-6 shadow-[0_18px_40px_-30px_rgba(34,52,56,0.18)] dark:shadow-[0_18px_40px_-30px_rgba(0,0,0,0.6)] sm:p-7",
  section: "rounded-[26px] border border-border-light bg-surface-secondary p-5 shadow-[0_16px_34px_-30px_rgba(34,52,56,0.16)] dark:shadow-[0_16px_34px_-30px_rgba(0,0,0,0.5)] sm:p-6",
  compact: "rounded-[22px] border border-border-light bg-surface-secondary p-4 shadow-[0_14px_28px_-28px_rgba(34,52,56,0.14)] dark:shadow-[0_14px_28px_-28px_rgba(0,0,0,0.4)] sm:p-5",
  subtle: "rounded-[22px] border border-border-light/80 bg-surface-tertiary p-4 shadow-none sm:p-5",
};

const STAT_TONE_CLASSES: Record<
  SurfaceTone,
  {
    shell: string;
    label: string;
    value: string;
    hint: string;
    accent: string;
    iconShell: string;
  }
> = {
  neutral: {
    shell: "border-border-light bg-surface-secondary text-text-primary shadow-[0_18px_40px_-30px_rgba(34,52,56,0.14)] dark:shadow-[0_18px_40px_-30px_rgba(0,0,0,0.5)]",
    label: "text-text-secondary",
    value: "text-text-primary",
    hint: "text-text-muted",
    accent: "bg-primary-light/70 dark:bg-primary-light/10",
    iconShell: "bg-primary-light text-text-brand shadow-[0_10px_22px_-14px_rgba(68,161,148,0.2)] dark:shadow-none",
  },
  brand: {
    shell: "border-primary/30 bg-primary text-white shadow-[0_22px_48px_-28px_rgba(68,161,148,0.38)]",
    label: "text-white/74",
    value: "text-white",
    hint: "text-white/70",
    accent: "bg-white/12",
    iconShell: "bg-white/14 text-white",
  },
  primary: {
    shell: "border-primary/20 bg-primary-light text-text-brand shadow-[0_22px_48px_-28px_rgba(68,161,148,0.22)]",
    label: "text-text-brand/80",
    value: "text-text-brand",
    hint: "text-text-secondary",
    accent: "bg-white/55",
    iconShell: "bg-white text-text-brand",
  },
  success: {
    shell: "border-success-500/70 bg-success-500 text-white shadow-[0_22px_48px_-28px_rgba(18,183,106,0.3)]",
    label: "text-white/74",
    value: "text-white",
    hint: "text-white/70",
    accent: "bg-white/12",
    iconShell: "bg-white/14 text-white",
  },
  warning: {
    shell: "border-status-warning-border bg-status-warning-soft text-status-warning",
    label: "text-status-warning opacity-90",
    value: "text-status-warning",
    hint: "text-status-warning opacity-75",
    accent: "bg-status-warning-border/30",
    iconShell: "bg-status-warning-soft text-status-warning",
  },
};

type SurfaceCardProps<T extends ElementType = "div"> = {
  as?: T;
  variant?: SurfaceVariant;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function SurfaceCard<T extends ElementType = "div">({
  as,
  variant = "section",
  className,
  children,
  ...props
}: SurfaceCardProps<T>) {
  const Component = (as ?? "div") as ElementType;

  return (
    <Component className={cn(SURFACE_VARIANTS[variant], className)} {...props}>
      {children}
    </Component>
  );
}

type SurfaceHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
};

export function SurfaceHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: SurfaceHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-text-secondary sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {meta ? <div className="pt-1">{meta}</div> : null}
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

type SurfaceToolbarProps = {
  children: ReactNode;
  className?: string;
};

export function SurfaceToolbar({ children, className }: SurfaceToolbarProps) {
  return (
    <div className={cn("app-panel-soft rounded-[22px] p-4 sm:p-5", className)}>{children}</div>
  );
}

type SurfaceActionLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
};

export function SurfaceActionLink({
  href,
  children,
  variant = "secondary",
  className,
}: SurfaceActionLinkProps) {
  const baseClasses =
    "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition";
  const variantClasses =
    variant === "primary"
      ? "bg-primary text-white shadow-[0_12px_24px_-16px_rgba(68,161,148,0.34)] hover:bg-primary-hover"
      : "border border-border-light bg-surface-secondary text-text-primary shadow-[0_10px_20px_-16px_rgba(34,52,56,0.08)] dark:shadow-[0_10px_20px_-16px_rgba(0,0,0,0.4)] hover:border-primary/30 hover:bg-surface-tertiary";

  return (
    <Link href={href as never} className={cn(baseClasses, variantClasses, className)}>
      {children}
    </Link>
  );
}

type SurfaceStatCardProps = {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: SurfaceTone;
  icon?: ReactNode;
  className?: string;
};

export function SurfaceStatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
  className,
}: SurfaceStatCardProps) {
  const toneStyles = STAT_TONE_CLASSES[tone];

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-[22px] border px-4 py-4 sm:px-5 sm:py-5",
        toneStyles.shell,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("pointer-events-none absolute -right-7 -top-7 h-24 w-24 rounded-full", toneStyles.accent)}
      />
      <span
        aria-hidden="true"
        className={cn("pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full opacity-60", toneStyles.accent)}
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", toneStyles.label)}>
            {label}
          </p>
          <p className={cn("mt-2 text-[2rem] font-semibold tracking-tight tabular-nums sm:text-[2.15rem]", toneStyles.value)}>
            {value}
          </p>
        </div>

        {icon ? (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", toneStyles.iconShell)}>
            {icon}
          </div>
        ) : null}
      </div>

      {hint ? <p className={cn("relative z-10 mt-2 text-xs", toneStyles.hint)}>{hint}</p> : null}
    </div>
  );
}
