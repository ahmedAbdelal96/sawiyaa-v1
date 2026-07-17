"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Banknote, BookOpenText, RefreshCcw, Scale, ShieldAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { formatMoney } from "@/lib/finance-format";
import { useAdminFinanceHubSummary } from "../hooks/use-admin-finance-summary";
import type { CurrencyGroupedAmount } from "@/lib/finance-format";

type SummaryTile = {
  title: string;
  helper: string;
  count: number;
  href: string;
  icon: ReactNode;
  amountByCurrency: CurrencyGroupedAmount[];
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
}: {
  locale: string;
  items: CurrencyGroupedAmount[];
  label: string;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-border-light/80 bg-surface-tertiary/70 px-3 py-2 dark:border-white/5 dark:bg-white/[0.03]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs leading-5 text-text-secondary">{emptyLabel}</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {items.map((item) => (
            <div key={item.currencyCode} className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-text-secondary">{item.currencyCode}</span>
              <span className="font-semibold text-text-primary">{formatMoney(locale, item.amount, item.currencyCode)}</span>
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
  return (
    <Link href={tile.href as never} className="group block h-full">
      <SurfaceCard
        variant="subtle"
        className="flex h-full flex-col justify-between gap-4 rounded-[22px] border border-border-light bg-white p-5 transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/20 dark:border-white/5 dark:bg-white/5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-text-brand dark:bg-primary/10">
            {tile.icon}
          </div>
          <span className="rounded-full border border-border-light bg-surface-tertiary px-2.5 py-1 text-xs font-semibold text-text-secondary dark:border-white/5 dark:bg-white/5">
            {openLabel}
          </span>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">{tile.title}</h3>
          <p className="text-2xl font-semibold tracking-tight text-text-primary">
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
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border-light/70 pt-3 text-xs font-semibold text-text-brand dark:border-white/5">
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
            },
            {
              title: t("hub.summary.cards.recoveries.title"),
              helper: t("hub.summary.cards.recoveries.helper"),
              count: summaryQuery.data.openPractitionerRecoveriesCount,
              href: "/admin/finance/practitioner-recoveries",
              icon: <ShieldAlert className="h-5 w-5" />,
              amountByCurrency: summaryQuery.data.openPractitionerRecoveriesAmountByCurrency,
            },
            {
              title: t("hub.summary.cards.settlements.title"),
              helper: t("hub.summary.cards.settlements.helper"),
              count: summaryQuery.data.readyPractitionerSettlementsCount,
              href: "/admin/practitioner-payouts",
              icon: <Banknote className="h-5 w-5" />,
              amountByCurrency: summaryQuery.data.readyPractitionerSettlementsAmountByCurrency,
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
