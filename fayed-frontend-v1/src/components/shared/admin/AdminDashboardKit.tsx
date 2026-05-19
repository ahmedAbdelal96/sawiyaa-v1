"use client";

import { useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import {
  ChevronDown,
  Filter,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const TONE_STYLES: Record<
  Tone,
  {
    shell: string;
    value: string;
    label: string;
    hint: string;
    iconShell: string;
    chip: string;
  }
> = {
  neutral: {
    shell: "border-border-light bg-white shadow-[0_16px_30px_-26px_rgba(34,52,56,0.18)]",
    value: "text-text-primary",
    label: "text-text-muted",
    hint: "text-text-secondary",
    iconShell: "bg-primary-light text-text-brand",
    chip: "border-border-light bg-surface-secondary text-text-secondary",
  },
  primary: {
    shell: "border-primary/18 bg-primary-light/40 shadow-[0_18px_34px_-26px_rgba(68,161,148,0.18)]",
    value: "text-text-brand",
    label: "text-text-brand/82",
    hint: "text-text-secondary",
    iconShell: "bg-white text-text-brand",
    chip: "border-primary/18 bg-white text-text-brand",
  },
  success: {
    shell: "border-success-500/16 bg-success-50/80 shadow-[0_18px_34px_-26px_rgba(18,183,106,0.16)]",
    value: "text-success-700",
    label: "text-success-700/82",
    hint: "text-success-700/78",
    iconShell: "bg-white text-success-700",
    chip: "border-success-200/80 bg-white text-success-700",
  },
  warning: {
    shell: "border-warning-300/30 bg-warning-50/90 shadow-[0_18px_34px_-26px_rgba(247,144,9,0.16)]",
    value: "text-warning-700",
    label: "text-warning-700/82",
    hint: "text-warning-700/78",
    iconShell: "bg-white text-warning-700",
    chip: "border-warning-200/80 bg-white text-warning-700",
  },
  danger: {
    shell: "border-error-200/70 bg-error-50/80 shadow-[0_18px_34px_-26px_rgba(240,68,56,0.14)]",
    value: "text-error-700",
    label: "text-error-700/82",
    hint: "text-error-700/78",
    iconShell: "bg-white text-error-700",
    chip: "border-error-200/80 bg-white text-error-700",
  },
  info: {
    shell: "border-sky-200/70 bg-sky-50/80 shadow-[0_18px_34px_-26px_rgba(56,133,214,0.14)]",
    value: "text-sky-700",
    label: "text-sky-700/82",
    hint: "text-sky-700/78",
    iconShell: "bg-white text-sky-700",
    chip: "border-sky-200/80 bg-white text-sky-700",
  },
};

export type AdminPageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
};

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: AdminPageHeaderProps) {
  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[2.05rem] font-semibold tracking-[-0.02em] text-text-primary sm:text-[2.4rem]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-text-secondary sm:text-base">
              {description}
            </p>
          ) : null}
          {meta ? <div className="pt-1">{meta}</div> : null}
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export type AdminMetricCardProps = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
};

export function AdminMetricCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  className,
}: AdminMetricCardProps) {
  const styles = TONE_STYLES[tone];

  return (
    <article
      className={cn(
        "relative isolate overflow-hidden rounded-xl border px-4 py-4",
        styles.shell,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-primary/8"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-6 left-1/2 h-14 w-14 -translate-x-1/2 rounded-full bg-white/60"
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", styles.label)}>
            {label}
          </p>
          <p className={cn("mt-2 text-2xl font-semibold tracking-[-0.03em] tabular-nums", styles.value)}>
            {value}
          </p>
          {hint ? <p className={cn("mt-2 text-xs leading-5", styles.hint)}>{hint}</p> : null}
        </div>

        {icon ? (
          <span
            aria-hidden="true"
            className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", styles.iconShell)}
          >
            {icon}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export type AdminSectionCardProps = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminSectionCard({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: AdminSectionCardProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[24px] border border-outline-variant/30 bg-white shadow-[0_4px_24px_rgba(68,161,148,0.04)]",
        className,
      )}
    >
      {(eyebrow || title || description || actions) && (
        <div className="border-b border-outline-variant/20 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1.5">
              {eyebrow ? (
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <h2 className="text-[1.65rem] font-semibold tracking-[-0.02em] text-text-primary">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="max-w-3xl text-sm leading-6 text-text-secondary">{description}</p>
              ) : null}
            </div>

            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </div>
      )}

      <div className={cn((eyebrow || title || description || actions) && "px-5 py-5 sm:px-6")}>
        {children}
      </div>
    </section>
  );
}

type BadgeTone = Tone | "muted";

export type AdminStatusBadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

export function AdminStatusBadge({
  children,
  tone = "neutral",
  className,
}: AdminStatusBadgeProps) {
  const styles = tone === "muted" ? TONE_STYLES.neutral : TONE_STYLES[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        styles.chip,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AdminPaymentStatusBadge(props: AdminStatusBadgeProps) {
  return <AdminStatusBadge {...props} />;
}

export function AdminPriorityBadge(props: AdminStatusBadgeProps) {
  return <AdminStatusBadge {...props} />;
}

export function AdminRiskBadge(props: AdminStatusBadgeProps) {
  return <AdminStatusBadge {...props} />;
}

export type AdminTableTabsProps<T extends string> = {
  value: T;
  tabs: Array<{ value: T; label: ReactNode; count?: ReactNode }>;
  onChange: (value: T) => void;
  className?: string;
};

export function AdminTableTabs<T extends string>({
  value,
  tabs,
  onChange,
  className,
}: AdminTableTabsProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap gap-1.5 rounded-[18px] bg-surface-tertiary/90 p-1.5",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-[14px] px-3.5 py-2 text-sm font-medium transition",
              active
                ? "bg-white text-text-brand shadow-[0_10px_18px_-16px_rgba(34,52,56,0.24)]"
                : "text-text-secondary hover:bg-white/70 hover:text-text-primary",
            )}
          >
            <span>{tab.label}</span>
            {tab.count ? (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  active
                    ? "border-primary/15 bg-primary-light text-text-brand"
                    : "border-border-light bg-white text-text-secondary",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export type AdminTableToolbarProps = {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    ariaLabel?: string;
  };
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function AdminTableToolbar({
  search,
  filters,
  actions,
  className,
}: AdminTableToolbarProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border-light bg-surface-secondary text-text-secondary">
            <Filter className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Filters
            </p>
            <p className="text-sm text-text-secondary">Refine the current list without leaving the page.</p>
          </div>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_auto]">
        {search ? (
          <label className="relative block">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={search.placeholder}
              aria-label={search.ariaLabel ?? search.placeholder}
              className="app-control w-full rounded-[18px] py-3 pe-4 ps-11 text-sm"
            />
          </label>
        ) : null}

        <div className="flex items-center justify-start gap-2 xl:justify-end">
          {filters ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
              <SlidersHorizontal className="h-4 w-4" />
              <div className="flex flex-wrap items-center gap-2">{filters}</div>
            </div>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-[18px] border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export type AdminRowActionsMenuItem = {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  danger?: boolean;
};

export type AdminRowActionsMenuProps = {
  label: string;
  items: AdminRowActionsMenuItem[];
  className?: string;
};

export function AdminRowActionsMenu({
  label,
  items,
  className,
}: AdminRowActionsMenuProps) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const dropdownAlignment = locale === "ar" ? "left-0 origin-top-left" : "right-0 origin-top-right";

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="dropdown-toggle inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-light bg-white text-text-secondary transition hover:border-primary/25 hover:bg-primary-light/50 hover:text-text-brand"
        aria-label={label}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <Dropdown
        isOpen={open}
        onClose={() => setOpen(false)}
        className={`${dropdownAlignment} mt-2 flex w-56 flex-col p-2`}
      >
        {items.map((item, index) => (
          <DropdownItem
            key={`${index}-${String(item.label)}`}
            tag={item.href ? "a" : "button"}
            href={item.href}
            onClick={() => {
              item.onClick?.();
              setOpen(false);
            }}
            baseClassName={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
              item.danger
                ? "text-error-700 hover:bg-error-50"
                : "text-text-primary hover:bg-primary-light/50 hover:text-text-brand",
            )}
          >
            {item.icon ? <span className="inline-flex h-4 w-4 items-center justify-center">{item.icon}</span> : null}
            <span>{item.label}</span>
          </DropdownItem>
        ))}
      </Dropdown>
    </div>
  );
}

export { ChevronDown };
