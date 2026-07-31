"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Banknote, BookOpenText, RefreshCcw, Scale, ShieldAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { formatAdminMoneyForLocale as formatMoney } from "@/features/admin/finance/lib/finance-formatters";
import { useAdminFinanceHubSummary } from "../hooks/use-admin-finance-summary";
import type { CurrencyGroupedAmount } from "@/lib/finance-format";

type SummaryTile = {
  title: string;
  helper: string;
  count: number;
  href: string;
  icon: ReactNode;
  amountByCurrency: CurrencyGroupedAmount[];
  colorTheme: "warning" | "danger" | "success" | "info";
};

const themeStyles = {
  warning: {
    border: "border-warning-border/40 hover:border-warning/50 dark:border-warning-border/20 dark:hover:border-warning/40",
    bg: "bg-gradient-to-br from-white to-warning-soft/30 dark:from-surface-secondary dark:to-warning-soft/[0.02]",
    iconBg: "bg-warning-soft text-warning border border-warning-border/30 dark:bg-warning-soft/10 dark:text-warning-border dark:border-warning-border/20",
    countText: "text-warning",
    badgeBg: "bg-warning-soft text-warning border border-warning-border/30 dark:bg-warning-soft/10 dark:text-warning-border dark:border-warning-border/20",
    footerText: "text-warning",
    amountBg: "bg-warning-soft/40 border-warning-border/20 dark:bg-warning-soft/5 dark:border-warning-border/10",
    amountLabel: "text-warning/80 dark:text-warning-border/80",
  },
  danger: {
    border: "border-danger-border/40 hover:border-danger/50 dark:border-danger-border/20 dark:hover:border-danger/40",
    bg: "bg-gradient-to-br from-white to-danger-soft/20 dark:from-surface-secondary dark:to-danger-soft/[0.02]",
    iconBg: "bg-danger-soft text-danger border border-danger-border/30 dark:bg-danger-soft/10 dark:text-danger-border dark:border-danger-border/20",
    countText: "text-danger dark:text-danger-border",
    badgeBg: "bg-danger-soft text-danger border border-danger-border/30 dark:bg-danger-soft/10 dark:text-danger-border dark:border-danger-border/20",
    footerText: "text-danger dark:text-danger-border",
    amountBg: "bg-danger-soft/40 border-danger-border/20 dark:bg-danger-soft/5 dark:border-danger-border/10",
    amountLabel: "text-danger/80 dark:text-danger-border/80",
  },
  success: {
    border: "border-success-border/40 hover:border-success/50 dark:border-success-border/20 dark:hover:border-success/40",
    bg: "bg-gradient-to-br from-white to-success-soft/20 dark:from-surface-secondary dark:to-success-soft/[0.02]",
    iconBg: "bg-success-soft text-success border border-success-border/30 dark:bg-success-soft/10 dark:text-success-border dark:border-success-border/20",
    countText: "text-success",
    badgeBg: "bg-success-soft text-success border border-success-border/30 dark:bg-success-soft/10 dark:text-success-border dark:border-success-border/20",
    footerText: "text-success",
    amountBg: "bg-success-soft/40 border-success-border/20 dark:bg-success-soft/5 dark:border-success-border/10",
    amountLabel: "text-success/80 dark:text-success-border/80",
  },
  info: {
    border: "border-info-border/40 hover:border-info/50 dark:border-info-border/20 dark:hover:border-info/40",
    bg: "bg-gradient-to-br from-white to-info-soft/20 dark:from-surface-secondary dark:to-info-soft/[0.02]",
    iconBg: "bg-info-soft text-info border border-info-border/30 dark:bg-info-soft/10 dark:text-info-border dark:border-info-border/20",
    countText: "text-info",
    badgeBg: "bg-info-soft text-info border border-info-border/30 dark:bg-info-soft/10 dark:text-info-border dark:border-info-border/20",
    footerText: "text-info",
    amountBg: "bg-info-soft/40 border-info-border/20 dark:bg-info-soft/5 dark:border-info-border/10",
    amountLabel: "text-info/80 dark:text-info-border/80",
  },
};

function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

function formatCount(locale: string, value: number) {
  return new Intl.NumberFormat(normalizeLocale(locale)).format(value);
}

function AmountByCurrencyList({
  locale,
  items,
  label,
  emptyLabel,
  theme,
}: {
  locale: string;
  items: CurrencyGroupedAmount[];
  label: string;
  emptyLabel: string;
  theme: "warning" | "danger" | "success" | "info";
}) {
  const styles = themeStyles[theme];
  return (
    <div className={`rounded-2xl border ${styles.amountBg} px-3 py-2 transition-colors duration-250`}>
      <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${styles.amountLabel}`}>
        {label}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs leading-5 text-text-secondary">{emptyLabel}</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {items.map((item) => (
            <div key={item.currencyCode} className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-text-secondary">{item.currencyCode}</span>
              <span className="font-bold text-text-primary">{formatMoney(locale, item.amount, item.currencyCode)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryLoadingCard() {
  return (
    <div className="animate-pulse rounded-[22px] border border-border-light bg-surface-secondary p-5 dark:border-white/5 dark:bg-white/5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="h-3 w-28 rounded-full bg-surface-tertiary" />
          <div className="h-8 w-20 rounded-2xl bg-surface-tertiary" />
        </div>
        <div className="h-10 w-10 rounded-2xl bg-surface-tertiary" />
      </div>
      <div className="mt-5 space-y-2">
        <div className="h-3 w-3/4 rounded-full bg-surface-tertiary" />
        <div className="h-3 w-1/2 rounded-full bg-surface-tertiary" />
      </div>
    </div>
  );
}

function SummaryTileCard({
  tile,
  locale,
  openLabel,
  amountsLabel,
  amountsEmptyLabel,
}: {
  tile: SummaryTile;
  locale: string;
  openLabel: string;
  amountsLabel: string;
  amountsEmptyLabel: string;
}) {
  const styles = themeStyles[tile.colorTheme];
  return (
    <Link href={tile.href as never} className="group block h-full">
      <SurfaceCard
        variant="subtle"
        className={`flex h-full flex-col justify-between gap-4 rounded-[22px] border p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg ${styles.border} ${styles.bg}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${styles.iconBg}`}>
            {tile.icon}
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles.badgeBg}`}>
            {openLabel}
          </span>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">{tile.title}</h3>
          <p className={`text-3xl font-extrabold tracking-tight ${styles.countText}`}>
            {formatCount(locale, tile.count)}
          </p>
          <p className="max-w-2xl text-xs leading-5 text-text-secondary">
            {tile.helper}
          </p>
          <AmountByCurrencyList
            locale={locale}
            items={tile.amountByCurrency}
            label={amountsLabel}
            emptyLabel={amountsEmptyLabel}
            theme={tile.colorTheme}
          />
        </div>

        <div className={`flex items-center justify-between gap-3 border-t border-border-light/70 pt-3 text-xs font-semibold transition-colors duration-250 ${styles.footerText} dark:border-white/5`}>
          <span>{openLabel}</span>
          <ArrowUpRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </SurfaceCard>
    </Link>
  );
}

export default function AdminFinanceSummarySection() {
  const t = useTranslations("admin-accounting");
  const locale = useLocale();
  const summaryQuery = useAdminFinanceHubSummary();

  const tiles = useMemo<SummaryTile[]>(
    () =>
      summaryQuery.data
        ? [
            {
              title: t("hub.summary.cards.sessionReviews.title"),
              helper: t("hub.summary.cards.sessionReviews.helper"),
              count: summaryQuery.data.pendingSessionEarningReviewsCount,
              href: "/admin/finance/session-earning-reviews",
              icon: <BookOpenText className="h-5 w-5" />,
              amountByCurrency: summaryQuery.data.pendingSessionEarningReviewsAmountByCurrency,
              colorTheme: "warning",
            },
            {
              title: t("hub.summary.cards.recoveries.title"),
              helper: t("hub.summary.cards.recoveries.helper"),
              count: summaryQuery.data.openPractitionerRecoveriesCount,
              href: "/admin/finance/practitioner-recoveries",
              icon: <ShieldAlert className="h-5 w-5" />,
              amountByCurrency: summaryQuery.data.openPractitionerRecoveriesAmountByCurrency,
              colorTheme: "danger",
            },
            {
              title: t("hub.summary.cards.settlements.title"),
              helper: t("hub.summary.cards.settlements.helper"),
              count: summaryQuery.data.readyPractitionerSettlementsCount,
              href: "/admin/practitioner-payouts",
              icon: <Banknote className="h-5 w-5" />,
              amountByCurrency: summaryQuery.data.readyPractitionerSettlementsAmountByCurrency,
              colorTheme: "success",
            },
            {
              title: t("hub.summary.cards.reconciliation.title"),
              helper: t("hub.summary.cards.reconciliation.helper", {
                reviews: summaryQuery.data.pendingReconciliationReviewsCount,
                issues: summaryQuery.data.openAccountingIssuesCount,
              }),
              count:
                summaryQuery.data.pendingReconciliationReviewsCount +
                summaryQuery.data.openAccountingIssuesCount,
              href: "/admin/finance/accounting/reconciliation",
              icon: <Scale className="h-5 w-5" />,
              amountByCurrency: [],
              colorTheme: "info",
            },
          ]
        : [],
    [summaryQuery.data, t],
  );

  return (
    <SurfaceCard variant="section" className="space-y-5 rounded-[30px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            {t("hub.summary.eyebrow")}
          </p>
          <h2 className="text-xl font-semibold text-text-primary">
            {t("hub.summary.title")}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-text-secondary">
            {t("hub.summary.description")}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          startIcon={<RefreshCcw className="h-4 w-4" />}
          onClick={() => summaryQuery.refetch()}
          disabled={summaryQuery.isFetching}
        >
          {summaryQuery.isFetching
            ? t("hub.summary.actions.refreshing")
            : t("hub.summary.actions.refresh")}
        </Button>
      </div>

      {summaryQuery.isError ? (
        <div className="rounded-[22px] border border-status-danger-border bg-status-danger-soft/30 p-5 text-sm text-status-danger">
          <p className="font-semibold">{t("hub.summary.states.errorTitle")}</p>
          <p className="mt-1 text-text-secondary">
            {t("hub.summary.states.errorDescription")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => summaryQuery.refetch()}
          >
            {t("hub.summary.states.retry")}
          </Button>
        </div>
      ) : summaryQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SummaryLoadingCard key={index} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tiles.map((tile) => (
            <SummaryTileCard
              key={tile.href}
              tile={tile}
              locale={locale}
              openLabel={t("hub.openLabel")}
              amountsLabel={t("hub.summary.amountsLabel")}
              amountsEmptyLabel={t("hub.summary.amountsEmpty")}
            />
          ))}
        </div>
      )}
    </SurfaceCard>
  );
}
