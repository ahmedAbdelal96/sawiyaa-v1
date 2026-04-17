import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type SurfaceVariant = "page" | "section" | "compact" | "subtle";
type SurfaceTone = "neutral" | "brand" | "primary" | "success" | "warning";

const SURFACE_VARIANTS: Record<SurfaceVariant, string> = {
  page: "app-panel rounded-[30px] p-6 sm:p-7",
  section: "app-panel rounded-[26px] p-5 sm:p-6",
  compact: "app-panel rounded-[22px] p-4 sm:p-5",
  subtle: "app-panel-soft rounded-[22px] p-4 sm:p-5",
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
    shell:
      "border-[#d9e2f0] bg-[#f7f9ff] text-text-primary shadow-[0_18px_40px_-30px_rgba(34,52,56,0.14)]",
    label: "text-text-muted/90",
    value: "text-text-primary",
    hint: "text-text-secondary",
    accent: "bg-[#e7edff]",
    iconShell: "bg-white text-[#5f73d2] shadow-[0_10px_22px_-14px_rgba(95,115,210,0.2)]",
  },
  brand: {
    shell:
      "border-[#5e3fc1] bg-[#5e3fc1] text-white shadow-[0_22px_48px_-28px_rgba(94,63,193,0.5)]",
    label: "text-white/74",
    value: "text-white",
    hint: "text-white/70",
    accent: "bg-white/12",
    iconShell: "bg-white/14 text-white",
  },
  primary: {
    shell:
      "border-[#2d89e9] bg-[#2d89e9] text-white shadow-[0_22px_48px_-28px_rgba(45,137,233,0.44)]",
    label: "text-white/74",
    value: "text-white",
    hint: "text-white/70",
    accent: "bg-white/12",
    iconShell: "bg-white/14 text-white",
  },
  success: {
    shell:
      "border-[#27a67a] bg-[#27a67a] text-white shadow-[0_22px_48px_-28px_rgba(39,166,122,0.38)]",
    label: "text-white/74",
    value: "text-white",
    hint: "text-white/70",
    accent: "bg-white/12",
    iconShell: "bg-white/14 text-white",
  },
  warning: {
    shell:
      "border-[#efd18a] bg-[#fff8e7] text-[#223043] shadow-[0_20px_42px_-28px_rgba(239,209,138,0.3)]",
    label: "text-[#6f5b25]/90",
    value: "text-[#182132]",
    hint: "text-[#6f5b25]/74",
    accent: "bg-[#f6cd59]/40",
    iconShell: "bg-[#fff0be] text-[#8a6508]",
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
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
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
      ? "bg-primary text-white shadow-[0_12px_24px_-16px_rgba(63,125,207,0.34)] hover:bg-primary-hover"
      : "border border-border-light bg-white text-text-primary shadow-[0_10px_20px_-16px_rgba(34,52,56,0.08)] hover:border-primary/30 hover:bg-brand-25 dark:bg-surface-secondary dark:text-text-primary dark:hover:bg-surface-tertiary";

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
