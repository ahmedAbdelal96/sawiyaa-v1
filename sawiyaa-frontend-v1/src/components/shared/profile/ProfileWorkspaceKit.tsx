"use client";

import React, { type ReactNode } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

// ─── ProfileWorkspaceShell ───────────────────────────────────────────────────

export function ProfileWorkspaceShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4 sm:space-y-5", className)}>
      {children}
    </div>
  );
}

// ─── ProfileWorkspaceHeader ──────────────────────────────────────────────────

export type ProfileWorkspaceHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
};

export function ProfileWorkspaceHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: ProfileWorkspaceHeaderProps) {
  const locale = useLocale();
  const isRtl = locale === "ar";

  return (
    <section className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          {eyebrow ? (
            <p
              className={cn(
                "text-xs font-medium text-primary",
                !isRtl && "uppercase tracking-[0.14em]"
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-5 text-text-secondary">
              {description}
            </p>
          ) : null}
          {meta ? <div className="pt-0.5">{meta}</div> : null}
        </div>

        {actions ? (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </section>
  );
}

// ─── ProfileWorkspaceCard ────────────────────────────────────────────────────

export function ProfileWorkspaceCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[30px] border border-slate-200/80 bg-white dark:border-white/8 dark:bg-surface-secondary shadow-sm overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── ProfileTabs ─────────────────────────────────────────────────────────────

export type ProfileTabItem = {
  id: string;
  label: string;
  icon?: ReactNode;
};

export type ProfileTabsProps = {
  tabs: ProfileTabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
};

export function ProfileTabs({
  tabs,
  activeTab,
  onChange,
  className,
}: ProfileTabsProps) {
  return (
    <div className={cn("border-b border-slate-200/80 dark:border-white/8", className)}>
      <nav className="-mb-px flex gap-6 sm:gap-8 overflow-x-auto scrollbar-none" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none",
                isActive
                  ? "border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-white/60 dark:hover:text-white/80"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ─── ProfileSummaryCard ───────────────────────────────────────────────────────

export function ProfileSummaryCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-white/8 dark:bg-surface-secondary shadow-sm flex flex-col items-center text-center",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── ProfileInfoSection ──────────────────────────────────────────────────────

export type ProfileInfoSectionProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ProfileInfoSection({
  title,
  subtitle,
  icon,
  action,
  children,
  className,
}: ProfileInfoSectionProps) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-slate-200/80 bg-white p-5 sm:p-6 dark:border-white/8 dark:bg-surface-secondary shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-4 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          {icon ? (
            <div className="text-teal-600 dark:text-teal-450 flex-shrink-0">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-text-primary dark:text-white/95 truncate">
              {title}
            </h3>
            {subtitle ? (
              <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}

// ─── ProfileInfoGrid ─────────────────────────────────────────────────────────

export type ProfileInfoGridProps = {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
};

const GRID_COLS = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const;

export function ProfileInfoGrid({
  children,
  columns = 2,
  className,
}: ProfileInfoGridProps) {
  return (
    <div className={cn("grid gap-4", GRID_COLS[columns], className)}>
      {children}
    </div>
  );
}

// ─── ProfileInfoRow ──────────────────────────────────────────────────────────

export type ProfileInfoRowProps = {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function ProfileInfoRow({
  label,
  value,
  icon,
  className,
}: ProfileInfoRowProps) {
  const isValueEmpty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim().length === 0);

  const displayValue = isValueEmpty ? (
    <span className="text-slate-400 italic">—</span>
  ) : (
    value
  );

  return (
    <div
      className={cn(
        "flex items-center justify-between py-3 border-b border-slate-100 last:border-0 dark:border-white/5",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon ? (
          <div className="text-teal-600 dark:text-teal-450 flex-shrink-0">
            {icon}
          </div>
        ) : null}
        <span className="text-xs font-semibold text-slate-500 dark:text-white/60 truncate">
          {label}
        </span>
      </div>
      <span className="text-sm font-bold text-slate-800 dark:text-white/95 text-end pl-4 leading-tight break-all">
        {displayValue}
      </span>
    </div>
  );
}

// ─── ProfileEmptyState ────────────────────────────────────────────────────────

export type ProfileEmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

export function ProfileEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: ProfileEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 bg-slate-50/50 dark:border-white/10 dark:bg-white/5 rounded-xl",
        className
      )}
    >
      {icon ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300 mb-3">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">{title}</h3>
      <p className="mt-1 text-xs text-text-muted max-w-sm">{description}</p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-teal-750"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
