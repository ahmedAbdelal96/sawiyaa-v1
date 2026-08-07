import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type SurfaceVariant = "page" | "section" | "compact" | "subtle";

const SURFACE_VARIANTS: Record<SurfaceVariant, string> = {
  page: "rounded-[30px] border border-border-light bg-surface-secondary p-6 shadow-[0_18px_40px_-30px_rgba(34,52,56,0.18)] dark:shadow-[0_18px_40px_-30px_rgba(0,0,0,0.6)] sm:p-7",
  section: "rounded-[26px] border border-border-light bg-surface-secondary p-5 shadow-[0_16px_34px_-30px_rgba(34,52,56,0.16)] dark:shadow-[0_16px_34px_-30px_rgba(0,0,0,0.5)] sm:p-6",
  compact: "rounded-[22px] border border-border-light bg-surface-secondary p-4 shadow-[0_14px_28px_-28px_rgba(34,52,56,0.14)] dark:shadow-[0_14px_28px_-28px_rgba(0,0,0,0.4)] sm:p-5",
  subtle: "rounded-[22px] border border-border-light/80 bg-surface-tertiary p-4 shadow-none sm:p-5",
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
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs md:text-sm font-semibold transition-all duration-150 active:scale-[0.98] h-10 min-h-[40px]";
  const variantClasses =
    variant === "primary"
      ? "bg-primary text-white border border-transparent shadow-xs hover:bg-primary-hover active:bg-primary-active"
      : "border border-border-light bg-white text-text-primary shadow-xs hover:border-primary/50 hover:bg-primary-light/40 hover:text-text-brand dark:bg-slate-800 dark:border-white/10 dark:text-white";

  return (
    <Link href={href as never} className={cn(baseClasses, variantClasses, className)}>
      {children}
    </Link>
  );
}
