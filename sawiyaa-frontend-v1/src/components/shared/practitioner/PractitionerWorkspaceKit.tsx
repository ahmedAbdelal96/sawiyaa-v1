"use client";

import React, { type ReactNode } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Clock3,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Users,
  Calendar,
  CalendarClock,
  Ban,
  XCircle,
  FileText,
  Sparkles,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  CircleDashed,
  MessageSquare,
  Headset,
  HelpCircle,
  WalletCards,
  ArrowUpRight,
  Layers,
  BadgeDollarSign,
  Clock,
  Ticket,
  Tag,
  Percent
} from "lucide-react";

// ─── Tone System ─────────────────────────────────────────────────────────────

export type Tone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "finance"
  | "session"
  | "support";

const TONE_STYLES: Record<
  Tone,
  {
    shell: string;
    value: string;
    label: string;
    hint: string;
    iconShell: string;
  }
> = {
  neutral: {
    shell: "border-slate-200/80 bg-white dark:bg-surface-secondary dark:border-white/8 shadow-[0_2px_12px_-6px_rgba(15,23,42,0.10)]",
    value: "text-slate-800 dark:text-white/95",
    label: "text-slate-500 dark:text-white/60",
    hint: "text-slate-400 dark:text-white/45",
    iconShell: "bg-teal-50 text-teal-700 ring-1 ring-teal-200/60 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20",
  },
  primary: {
    shell: "border-teal-200/70 bg-white dark:bg-surface-secondary dark:border-teal-500/20 shadow-[0_2px_12px_-6px_rgba(20,150,132,0.12)]",
    value: "text-teal-800 dark:text-teal-200",
    label: "text-teal-600 dark:text-teal-400",
    hint: "text-teal-500 dark:text-teal-450",
    iconShell: "bg-teal-600 text-white ring-1 ring-teal-700/20",
  },
  success: {
    shell: "border-emerald-200/70 bg-white dark:bg-surface-secondary dark:border-emerald-500/20 shadow-[0_2px_12px_-6px_rgba(16,185,129,0.10)]",
    value: "text-emerald-800 dark:text-emerald-200",
    label: "text-emerald-600 dark:text-emerald-400",
    hint: "text-emerald-500 dark:text-emerald-450",
    iconShell: "bg-emerald-500 text-white ring-1 ring-emerald-600/20",
  },
  warning: {
    shell: "border-amber-200/70 bg-white dark:bg-surface-secondary dark:border-amber-500/20 shadow-[0_2px_12px_-6px_rgba(245,158,11,0.10)]",
    value: "text-amber-800 dark:text-amber-200",
    label: "text-amber-600 dark:text-amber-400",
    hint: "text-amber-500 dark:text-amber-450",
    iconShell: "bg-amber-500 text-white ring-1 ring-amber-600/20",
  },
  danger: {
    shell: "border-rose-200/70 bg-white dark:bg-surface-secondary dark:border-rose-500/20 shadow-[0_2px_12px_-6px_rgba(244,63,94,0.10)]",
    value: "text-rose-800 dark:text-rose-200",
    label: "text-rose-600 dark:text-rose-400",
    hint: "text-rose-500 dark:text-rose-450",
    iconShell: "bg-rose-500 text-white ring-1 ring-rose-600/20",
  },
  info: {
    shell: "border-sky-200/70 bg-white dark:bg-surface-secondary dark:border-sky-500/20 shadow-[0_2px_12px_-6px_rgba(14,165,233,0.10)]",
    value: "text-sky-800 dark:text-sky-200",
    label: "text-sky-600 dark:text-sky-400",
    hint: "text-sky-500 dark:text-sky-450",
    iconShell: "bg-sky-500 text-white ring-1 ring-sky-600/20",
  },
  finance: {
    shell: "border-indigo-200/70 bg-white dark:bg-surface-secondary dark:border-indigo-500/20 shadow-[0_2px_12px_-6px_rgba(99,102,241,0.10)]",
    value: "text-indigo-800 dark:text-indigo-200",
    label: "text-indigo-600 dark:text-indigo-400",
    hint: "text-indigo-500 dark:text-indigo-450",
    iconShell: "bg-indigo-500 text-white ring-1 ring-indigo-600/20",
  },
  session: {
    shell: "border-purple-200/70 bg-white dark:bg-surface-secondary dark:border-purple-500/20 shadow-[0_2px_12px_-6px_rgba(168,85,247,0.10)]",
    value: "text-purple-800 dark:text-purple-200",
    label: "text-purple-600 dark:text-purple-400",
    hint: "text-purple-500 dark:text-purple-450",
    iconShell: "bg-purple-500 text-white ring-1 ring-purple-600/20",
  },
  support: {
    shell: "border-orange-200/70 bg-white dark:bg-surface-secondary dark:border-orange-500/20 shadow-[0_2px_12px_-6px_rgba(249,115,22,0.10)]",
    value: "text-orange-800 dark:text-orange-200",
    label: "text-orange-600 dark:text-orange-400",
    hint: "text-orange-500 dark:text-orange-450",
    iconShell: "bg-orange-500 text-white ring-1 ring-orange-600/20",
  },
};

// ─── Fallback Icon Resolver ──────────────────────────────────────────────────

function getFallbackIcon({
  metricKey,
  semantic,
  tone,
  label,
}: {
  metricKey?: string;
  semantic?: string;
  tone?: string;
  label?: ReactNode;
}): ReactNode {
  const key = (metricKey || semantic || "").toLowerCase().trim();
  const labelStr = typeof label === "string" ? label.toLowerCase().trim() : "";

  // Coupons / Promo Codes
  if (key.includes("promo") || key.includes("coupon") || key.includes("discount")) {
    if (key.includes("active")) return <CheckCircle2 className="h-4 w-4" />;
    if (key.includes("redemption") || key.includes("use")) return <Activity className="h-4 w-4" />;
    return <Ticket className="h-4 w-4" />;
  }

  // Sessions / Calendar
  if (key.includes("session") || key.includes("calendar") || key.includes("booking")) {
    if (key.includes("upcoming") || key.includes("scheduled")) return <CalendarClock className="h-4 w-4" />;
    if (key.includes("finished") || key.includes("complete")) return <CheckCircle2 className="h-4 w-4" />;
    if (key.includes("cancel") || key.includes("rejected")) return <XCircle className="h-4 w-4" />;
    return <Calendar className="h-4 w-4" />;
  }

  // Support / Help
  if (key.includes("support") || key.includes("ticket") || key.includes("help")) {
    if (key.includes("open") || key.includes("active")) return <Activity className="h-4 w-4" />;
    return <Headset className="h-4 w-4" />;
  }

  // Messages / Chat
  if (key.includes("message") || key.includes("chat") || key.includes("conversation")) {
    return <MessageSquare className="h-4 w-4" />;
  }

  // Finance / Wallet / Ledger / Settlements
  if (key.includes("wallet") || key.includes("ledger") || key.includes("balance") || key.includes("earn") || key.includes("finance") || key.includes("settlement") || key.includes("paid")) {
    if (key.includes("available")) return <Wallet className="h-4 w-4" />;
    if (key.includes("pending")) return <Clock className="h-4 w-4" />;
    if (key.includes("reserved") || key.includes("security")) return <ShieldCheck className="h-4 w-4" />;
    if (key.includes("payout") || key.includes("paid") || key.includes("out")) return <ArrowUpRight className="h-4 w-4" />;
    if (key.includes("page")) return <Layers className="h-4 w-4" />;
    return <BadgeDollarSign className="h-4 w-4" />;
  }

  // Patients / Users
  if (key.includes("patient") || key.includes("user") || key.includes("member")) {
    return <Users className="h-4 w-4" />;
  }

  // Tone fallbacks
  if (tone === "finance") return <BadgeDollarSign className="h-4 w-4" />;
  if (tone === "success") return <CheckCircle2 className="h-4 w-4" />;
  if (tone === "warning") return <AlertTriangle className="h-4 w-4" />;
  if (tone === "danger") return <XCircle className="h-4 w-4" />;
  if (tone === "primary") return <Sparkles className="h-4 w-4" />;
  if (tone === "support") return <Headset className="h-4 w-4" />;
  if (tone === "session") return <Calendar className="h-4 w-4" />;

  // Label fallback (as a last resort)
  if (labelStr.includes("session") || labelStr.includes("جلسة") || labelStr.includes("جلسات")) {
    return <Calendar className="h-4 w-4" />;
  }
  if (labelStr.includes("wallet") || labelStr.includes("محفظة") || labelStr.includes("رصيد") || labelStr.includes("balance") || labelStr.includes("مالية") || labelStr.includes("الصافي") || labelStr.includes("الإجمالي")) {
    return <Wallet className="h-4 w-4" />;
  }
  if (labelStr.includes("support") || labelStr.includes("دعم") || labelStr.includes("تذكرة") || labelStr.includes("تذاكر")) {
    return <Headset className="h-4 w-4" />;
  }
  if (labelStr.includes("message") || labelStr.includes("رسائل") || labelStr.includes("محادثة") || labelStr.includes("محادثات")) {
    return <MessageSquare className="h-4 w-4" />;
  }

  // Generic fallback
  return <CircleDashed className="h-4 w-4" />;
}

// ─── PractitionerPageShell ───────────────────────────────────────────────────

export type PractitionerPageShellProps = {
  children: ReactNode;
  className?: string;
};

export function PractitionerPageShell({ children, className }: PractitionerPageShellProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {children}
    </div>
  );
}

// ─── PractitionerPageHeader ──────────────────────────────────────────────────

export type PractitionerPageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
};

export function PractitionerPageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: PractitionerPageHeaderProps) {
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

// ─── PractitionerStatsGrid ───────────────────────────────────────────────────

export type PractitionerStatsGridProps = {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
};

const STATS_GRID_COLS = {
  1: "grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
  6: "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
} as const;

export function PractitionerStatsGrid({
  children,
  cols = 4,
  className,
}: PractitionerStatsGridProps) {
  return (
    <section className={cn("grid gap-3", STATS_GRID_COLS[cols], className)}>
      {children}
    </section>
  );
}

// ─── PractitionerStatCard ────────────────────────────────────────────────────

export type PractitionerStatCardProps = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
  metricKey?: string;
  semantic?: string;
};

export function PractitionerStatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  className,
  metricKey,
  semantic,
}: PractitionerStatCardProps) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.neutral;
  const resolvedIcon = icon ?? getFallbackIcon({ metricKey, semantic, tone, label });

  return (
    <div
      className={cn(
        "relative flex items-center justify-between rounded-xl border p-4 transition-all hover:shadow-sm",
        styles.shell,
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className={cn("text-xs font-medium", styles.label)}>{label}</p>
        <p className={cn("text-2xl font-bold tracking-tight sm:text-3xl", styles.value)}>{value}</p>
        {hint ? <p className={cn("text-xs", styles.hint)}>{hint}</p> : null}
      </div>

      {resolvedIcon ? (
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", styles.iconShell)}>
          {resolvedIcon}
        </div>
      ) : null}
    </div>
  );
}

// ─── PractitionerFilterCard ──────────────────────────────────────────────────

export type PractitionerFilterCardProps = {
  children: ReactNode;
  title?: ReactNode;
  className?: string;
};

export function PractitionerFilterCard({
  children,
  title,
  className,
}: PractitionerFilterCardProps) {
  return (
    <div className={cn("rounded-xl border border-slate-200/80 bg-white p-4 dark:border-white/8 dark:bg-surface-secondary shadow-sm", className)}>
      {title ? (
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
          {title}
        </h3>
      ) : null}
      {children}
    </div>
  );
}

// ─── PractitionerTableSection / PractitionerListSection ──────────────────────

export type PractitionerSectionProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  flushContent?: boolean;
};

export function PractitionerTableSection({
  title,
  subtitle,
  actions,
  children,
  className,
  flushContent = false,
}: PractitionerSectionProps) {
  return (
    <div className={cn("rounded-xl border border-slate-200/80 bg-white dark:border-white/8 dark:bg-surface-secondary shadow-sm overflow-hidden", className)}>
      {title || subtitle || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
                {title}
              </h2>
            ) : null}
            {subtitle ? <p className="mt-1 text-xs text-text-muted">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn(flushContent ? "pt-0" : "p-4 sm:p-5")}>{children}</div>
    </div>
  );
}

export const PractitionerListSection = PractitionerTableSection;

// ─── PractitionerSectionCard ─────────────────────────────────────────────────

export type PractitionerSectionCardProps = {
  children: ReactNode;
  className?: string;
};

export function PractitionerSectionCard({ children, className }: PractitionerSectionCardProps) {
  return (
    <div className={cn("rounded-xl border border-slate-200/80 bg-white p-4 dark:border-white/8 dark:bg-surface-secondary shadow-sm", className)}>
      {children}
    </div>
  );
}

// ─── PractitionerEmptyState ──────────────────────────────────────────────────

export type PractitionerEmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

export function PractitionerEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: PractitionerEmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-250 bg-slate-50/50 dark:border-white/10 dark:bg-white/5 rounded-xl", className)}>
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

// ─── PractitionerTabs ────────────────────────────────────────────────────────

export type TabItem = {
  id: string;
  label: string;
  icon?: ReactNode;
};

export type PractitionerTabsProps = {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
};

export function PractitionerTabs({
  tabs,
  activeTab,
  onChange,
  className,
}: PractitionerTabsProps) {
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

// ─── PractitionerInfoGrid ───────────────────────────────────────────────────

export type PractitionerInfoGridProps = {
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

export function PractitionerInfoGrid({
  children,
  columns = 2,
  className,
}: PractitionerInfoGridProps) {
  return (
    <div className={cn("grid gap-4", GRID_COLS[columns], className)}>
      {children}
    </div>
  );
}

// ─── PractitionerInfoItem ────────────────────────────────────────────────────

export type PractitionerInfoItemProps = {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  helperText?: ReactNode;
  badge?: ReactNode;
  className?: string;
};

export function PractitionerInfoItem({
  label,
  value,
  icon,
  helperText,
  badge,
  className,
}: PractitionerInfoItemProps) {
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
        "rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:border-white/8 dark:bg-surface-secondary",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50/80 border border-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-xs font-medium text-slate-500 dark:text-white/60">
            {label}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-slate-900 dark:text-white/95 break-words leading-tight">
              {displayValue}
            </div>
            {badge ? <div className="shrink-0">{badge}</div> : null}
          </div>
          {helperText ? (
            <p className="text-xs text-slate-500 dark:text-white/40 leading-normal">
              {helperText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
