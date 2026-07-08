"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronDown,
  Filter,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Grid,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Users,
  BadgeCheck,
  ShieldCheck,
  Star,
  Calendar,
  CalendarClock,
  Clock3,
  Ban,
  XCircle,
  FileText,
  Sparkles,
  Wallet,
  ShieldAlert,
  CircleDashed,
  FilePlus2,
  Edit3,
  Wifi,
  CircleOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";

// ─── Tone System ─────────────────────────────────────────────────────────────

type Tone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "finance";

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
    shell: "border-border-light bg-surface-secondary",
    value: "text-text-primary",
    label: "text-text-secondary",
    hint: "text-text-muted",
    iconShell: "bg-primary-light text-text-brand ring-1 ring-primary/20",
    chip: "border-border-light bg-surface-tertiary text-text-secondary",
  },
  primary: {
    shell: "border-border-light bg-surface-secondary",
    value: "text-text-primary",
    label: "text-text-secondary",
    hint: "text-text-muted",
    iconShell: "bg-primary text-white ring-1 ring-primary/20",
    chip: "border-border-light bg-primary-light text-text-brand",
  },
  success: {
    shell: "border-border-light bg-surface-secondary",
    value: "text-text-primary",
    label: "text-text-secondary",
    hint: "text-text-muted",
    iconShell: "bg-status-success-soft text-status-success border border-status-success-border",
    chip: "bg-status-success-soft text-status-success border border-status-success-border",
  },
  warning: {
    shell: "border-border-light bg-surface-secondary",
    value: "text-text-primary",
    label: "text-text-secondary",
    hint: "text-text-muted",
    iconShell: "bg-status-warning-soft text-status-warning border border-status-warning-border",
    chip: "bg-status-warning-soft text-status-warning border border-status-warning-border",
  },
  danger: {
    shell: "border-border-light bg-surface-secondary",
    value: "text-text-primary",
    label: "text-text-secondary",
    hint: "text-text-muted",
    iconShell: "bg-status-danger-soft text-status-danger border border-status-danger-border",
    chip: "bg-status-danger-soft text-status-danger border border-status-danger-border",
  },
  info: {
    shell: "border-border-light bg-surface-secondary",
    value: "text-text-primary",
    label: "text-text-secondary",
    hint: "text-text-muted",
    iconShell: "bg-status-info-soft text-status-info border border-status-info-border",
    chip: "bg-status-info-soft text-status-info border border-status-info-border",
  },
  finance: {
    shell: "border-border-light bg-surface-secondary",
    value: "text-text-primary",
    label: "text-text-secondary",
    hint: "text-text-muted",
    iconShell: "bg-surface-tertiary text-text-secondary border border-border-light",
    chip: "border-border-light bg-surface-tertiary text-text-secondary",
  },
};

// ─── AdminPageShell ───────────────────────────────────────────────────────────
// Additive-only: use when a page has no outer layout wrapper controlling padding/bg.
// Do NOT nest inside route layouts that already set max-width/padding.

export type AdminPageShellProps = {
  children: ReactNode;
  className?: string;
};

export function AdminPageShell({ children, className }: AdminPageShellProps) {
  return (
    <div className={cn("min-h-screen bg-surface-page", className)}>
      <div className="mx-auto max-w-screen-2xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

// ─── AdminPageHeader ──────────────────────────────────────────────────────────

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
                !isRtl && "uppercase tracking-[0.14em]",
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">
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

// ─── AdminStatsGrid ───────────────────────────────────────────────────────────

const STATS_GRID_COLS = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  6: "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
} as const;

export type AdminStatsGridProps = {
  children: ReactNode;
  cols?: keyof typeof STATS_GRID_COLS;
  className?: string;
};

export function AdminStatsGrid({
  children,
  cols = 4,
  className,
}: AdminStatsGridProps) {
  return (
    <section className={cn("grid gap-3", STATS_GRID_COLS[cols], className)}>
      {children}
    </section>
  );
}

// ─── AdminMetricCard ──────────────────────────────────────────────────────────

export type AdminMetricCardProps = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
  metricKey?: string;
  semantic?: string;
};

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

  // Patients
  if (key === "patients.total") return <Users className="h-4 w-4" />;
  if (key === "patients.completed") return <CheckCircle2 className="h-4 w-4" />;
  if (key === "patients.incomplete") return <AlertTriangle className="h-4 w-4" />;

  // Practitioners
  if (key === "practitioners.total") return <Users className="h-4 w-4" />;
  if (key === "practitioners.online") return <Wifi className="h-4 w-4" />;
  if (key === "practitioners.verified") return <BadgeCheck className="h-4 w-4" />;
  if (key === "practitioners.rating") return <Star className="h-4 w-4" />;

  // Sessions
  if (key === "sessions.total") return <Calendar className="h-4 w-4" />;
  if (key === "sessions.live") return <Activity className="h-4 w-4" />;
  if (key === "sessions.upcoming") return <CalendarClock className="h-4 w-4" />;
  if (key === "sessions.delayed") return <AlertTriangle className="h-4 w-4" />;
  if (key === "sessions.completed") return <CheckCircle2 className="h-4 w-4" />;
  if (key === "sessions.cancelled") return <Ban className="h-4 w-4" />;

  // Practitioner Applications
  if (key === "applications.total") return <FileText className="h-4 w-4" />;
  if (key === "applications.pending") return <Clock3 className="h-4 w-4" />;
  if (key === "applications.approved") return <BadgeCheck className="h-4 w-4" />;
  if (key === "applications.rejected") return <XCircle className="h-4 w-4" />;
  if (key === "applications.editrequests") return <Edit3 className="h-4 w-4" />;

  // Featured Practitioners
  if (key === "featured.total") return <Sparkles className="h-4 w-4" />;
  if (key === "featured.active") return <Activity className="h-4 w-4" />;
  if (key === "featured.scheduled") return <Calendar className="h-4 w-4" />;
  if (key === "featured.inactive") return <Clock3 className="h-4 w-4" />;

  // Finance / reconciliation
  if (key === "finance.matched") return <ShieldCheck className="h-4 w-4" />;
  if (key === "finance.issues") return <AlertTriangle className="h-4 w-4" />;
  if (key === "finance.pending") return <Clock3 className="h-4 w-4" />;
  if (key === "finance.ledger") return <Wallet className="h-4 w-4" />;
  if (key === "finance.payouts") return <Wallet className="h-4 w-4" />;

  // Articles & Assessments
  if (key === "articles.total") return <FileText className="h-4 w-4" />;
  if (key === "assessments.total") return <FileText className="h-4 w-4" />;

  // Broad/partial key matching
  if (key.includes("total") || key.includes("count") || key.includes("all")) {
    return <Grid className="h-4 w-4" />;
  }
  if (key.includes("active")) return <Activity className="h-4 w-4" />;
  if (key.includes("inactive") || key.includes("expired")) return <CircleOff className="h-4 w-4" />;
  if (key.includes("warning") || key.includes("alert")) return <AlertTriangle className="h-4 w-4" />;
  if (key.includes("finance") || key.includes("money") || key.includes("payout")) return <Wallet className="h-4 w-4" />;

  // Label text matching (last-resort, optional fallback)
  if (typeof label === "string") {
    const labelStr = label.toLowerCase().trim();
    if (labelStr.includes("مرضى") || labelStr.includes("patient")) return <Users className="h-4 w-4" />;
    if (labelStr.includes("ممارس") || labelStr.includes("practitioner")) return <Users className="h-4 w-4" />;
    if (labelStr.includes("جلسات") || labelStr.includes("sessions") || labelStr.includes("session")) return <Calendar className="h-4 w-4" />;
    if (labelStr.includes("طلبات") || labelStr.includes("applications") || labelStr.includes("application")) return <FileText className="h-4 w-4" />;
    if (labelStr.includes("مقال") || labelStr.includes("article")) return <FileText className="h-4 w-4" />;
    if (labelStr.includes("تقييم") || labelStr.includes("rating")) return <Star className="h-4 w-4" />;
    if (labelStr.includes("إجمالي") || labelStr.includes("total") || labelStr.includes("count")) return <Grid className="h-4 w-4" />;
  }

  // Tone fallback
  if (tone === "success") return <CheckCircle2 className="h-4 w-4" />;
  if (tone === "warning") return <AlertTriangle className="h-4 w-4" />;
  if (tone === "danger") return <ShieldAlert className="h-4 w-4" />;
  if (tone === "info") return <BadgeCheck className="h-4 w-4" />;
  if (tone === "finance") return <Wallet className="h-4 w-4" />;

  // Generic fallback default icon
  return <Grid className="h-4 w-4" />;
}

export function AdminMetricCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  className,
  metricKey,
  semantic,
}: AdminMetricCardProps) {
  const styles = TONE_STYLES[tone];
  const locale = useLocale();
  const isRtl = locale === "ar";

  const resolvedIcon = icon ?? getFallbackIcon({ metricKey, semantic, tone, label });

  return (
    <article
      className={cn(
        "relative isolate overflow-hidden rounded-xl border px-4 py-3.5",
        styles.shell,
        className,
      )}
    >
      {/* Subtle decorative accent — much smaller than before */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -end-4 -top-4 h-10 w-10 rounded-full bg-current opacity-[0.06]"
      />

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-[10px] font-semibold text-current",
              styles.label,
              !isRtl && "uppercase tracking-[0.14em]",
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "mt-1.5 text-xl font-semibold tracking-tight tabular-nums",
              styles.value,
            )}
          >
            {value}
          </p>
          {hint ? (
            <p className={cn("mt-1 text-[11px] leading-4", styles.hint)}>{hint}</p>
          ) : null}
        </div>

        {resolvedIcon ? (
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              styles.iconShell,
            )}
          >
            {resolvedIcon}
          </span>
        ) : null}
      </div>
    </article>
  );
}

// ─── AdminFilterCard ──────────────────────────────────────────────────────────

export type AdminFilterCardProps = {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function AdminFilterCard({
  children,
  title,
  description,
  actions,
  className,
}: AdminFilterCardProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border-light bg-surface-secondary",
        className,
      )}
    >
      {(title || description || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-light/70 px-5 py-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            {title ? (
              <p className="text-sm font-semibold text-text-primary">{title}</p>
            ) : null}
            {description ? (
              <p className="text-xs text-text-secondary">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

// ─── AdminTableSection ────────────────────────────────────────────────────────

export type AdminTableSectionProps = {
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** When true, children render flush to the card edges (no inner padding). Ideal for DataTable or custom tables. */
  flushContent?: boolean;
  className?: string;
};

export function AdminTableSection({
  children,
  title,
  subtitle,
  actions,
  flushContent = false,
  className,
}: AdminTableSectionProps) {
  const hasHeader = Boolean(title || subtitle || actions);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border-light bg-surface-secondary",
        className,
      )}
    >
      {hasHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-light/70 px-5 py-3.5">
          <div className="min-w-0">
            {title ? (
              <div className="text-sm font-semibold text-text-primary">{title}</div>
            ) : null}
            {subtitle ? (
              <div className="mt-0.5 text-xs text-text-secondary">{subtitle}</div>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      )}
      <div className={cn(!flushContent && hasHeader && "px-5 py-4")}>
        {children}
      </div>
    </section>
  );
}

// ─── AdminSectionCard ─────────────────────────────────────────────────────────

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
  const locale = useLocale();
  const isRtl = locale === "ar";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border-light bg-surface-secondary",
        className,
      )}
    >
      {(eyebrow || title || description || actions) && (
        <div className="border-b border-border-light/70 px-5 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              {eyebrow ? (
                <p
                  className={cn(
                    "text-[10px] font-medium text-primary",
                    !isRtl && "uppercase tracking-[0.14em]",
                  )}
                >
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <h2 className="text-base font-semibold text-text-primary">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="max-w-2xl text-sm leading-5 text-text-secondary">
                  {description}
                </p>
              ) : null}
            </div>

            {actions ? (
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            ) : null}
          </div>
        </div>
      )}

      <div
        className={cn(
          (eyebrow || title || description || actions) && "px-5 py-4 sm:px-5",
        )}
      >
        {children}
      </div>
    </section>
  );
}

// ─── AdminStatusBadge ─────────────────────────────────────────────────────────

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
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
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

// ─── AdminTableTabs ───────────────────────────────────────────────────────────

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
        "inline-flex flex-wrap gap-1 rounded-2xl bg-surface-tertiary/90 p-1",
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
              "inline-flex items-center gap-1.5 rounded-[14px] px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-surface-secondary text-text-brand border border-border-light"
                : "text-text-secondary hover:bg-surface-tertiary hover:text-text-primary",
            )}
          >
            <span>{tab.label}</span>
            {tab.count ? (
              <span
                className={cn(
                  "rounded-full border px-1.5 py-px text-[10px] font-semibold",
                  active
                    ? "border-primary/15 bg-primary-light text-text-brand"
                    : "border-border-light bg-surface-tertiary text-text-secondary",
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

// ─── AdminTableToolbar ────────────────────────────────────────────────────────

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
  const t = useTranslations("common.dataTable");

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border-light bg-surface-secondary text-text-secondary">
            <Filter className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-xs font-semibold text-text-muted">{t("filters")}</p>
            <p className="text-xs text-text-secondary">{t("refineList")}</p>
          </div>
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
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
              className="app-control w-full rounded-[18px] py-2.5 pe-4 ps-11 text-sm"
            />
          </label>
        ) : null}

        <div className="flex items-center justify-start gap-2 xl:justify-end">
          {filters ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <div className="flex flex-wrap items-center gap-2">{filters}</div>
            </div>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-[18px] border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t("filters")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AdminRowActionsMenu ──────────────────────────────────────────────────────

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
  const dropdownAlignment =
    locale === "ar" ? "left-0 origin-top-left" : "right-0 origin-top-right";

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="dropdown-toggle inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-light bg-surface-secondary text-text-secondary transition hover:border-primary/25 hover:bg-primary-light/50 hover:text-text-brand"
        aria-label={label}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      <Dropdown
        isOpen={open}
        onClose={() => setOpen(false)}
        className={`${dropdownAlignment} mt-2 flex w-52 flex-col p-1.5`}
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
              "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition",
              item.danger
                ? "text-status-danger hover:bg-status-danger-soft"
                : "text-text-primary hover:bg-surface-tertiary hover:text-text-brand",
            )}
          >
            {item.icon ? (
              <span className="inline-flex h-4 w-4 items-center justify-center">
                {item.icon}
              </span>
            ) : null}
            <span>{item.label}</span>
          </DropdownItem>
        ))}
      </Dropdown>
    </div>
  );
}

export { ChevronDown };
