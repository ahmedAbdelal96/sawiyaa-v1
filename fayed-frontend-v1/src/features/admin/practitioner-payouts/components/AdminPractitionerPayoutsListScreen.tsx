"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgeDollarSign, Package, Search, Users } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Skeleton } from "@/components/shared/LoadingStates";
import {
  SurfaceActionLink,
} from "@/components/shared/SurfaceShell";
import AdminOperationalListShell, {
  AdminSummaryCard,
} from "@/components/shared/admin/AdminOperationalListShell";
import { Link } from "@/i18n/navigation";
import { formatSettlementDateTime, formatSettlementMoney } from "@/features/admin/settlements/lib/settlement-formatters";
import {
  useAdminPractitionerPayoutSummaries,
} from "../hooks/use-admin-practitioner-payouts";
import type { AdminPractitionerPayoutSummary } from "../types/admin-practitioner-payouts.types";
import AdminPractitionerPayoutDrawer, {
  type AdminPractitionerPayoutDrawerTarget,
} from "./AdminPractitionerPayoutDrawer";

type CurrencyCode = "EGP" | "USD";
type BalanceFilter = "ALL" | "HAS_PAYABLE" | "HAS_PACKAGE";
type CurrencyFilter = "ALL" | CurrencyCode;

function parseAmount(value: string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getLatestPayoutAt(values: Array<string | null | undefined>) {
  const timestamps = values.filter(Boolean).map((value) => new Date(value as string).getTime());
  if (timestamps.length === 0) return null;

  const latest = Math.max(...timestamps);
  return Number.isFinite(latest) ? new Date(latest).toISOString() : null;
}

function hasPackageMoney(summary: AdminPractitionerPayoutSummary | null) {
  return (
    Number(summary?.egp.packageReleasedPayableAmount ?? 0) > 0 ||
    Number(summary?.egp.packageHeldAmount ?? 0) > 0 ||
    Number(summary?.usd.packageReleasedPayableAmount ?? 0) > 0 ||
    Number(summary?.usd.packageHeldAmount ?? 0) > 0
  );
}

function hasPayableMoney(summary: AdminPractitionerPayoutSummary | null) {
  return (
    Number(summary?.egp.totalPayableAmount ?? 0) > 0 ||
    Number(summary?.usd.totalPayableAmount ?? 0) > 0
  );
}

function BalanceBreakdown({
  balance,
  locale,
  t,
  currency,
  isLoading,
}: {
  balance: AdminPractitionerPayoutSummary["egp"] | null;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  currency: CurrencyCode;
  isLoading: boolean;
}) {
  if (isLoading && !balance) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-36" />
      </div>
    );
  }

  if (!balance) {
    return <span className="text-text-muted">-</span>;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-text-primary dark:text-white/95">
          {formatSettlementMoney(locale, balance.totalPayableAmount, currency)}
        </span>
        <span className="rounded-full bg-brand-25 px-2.5 py-1 text-[11px] font-semibold text-primary dark:bg-primary/10">
          {t("list.payableNow")}
        </span>
      </div>
      <p className="text-xs leading-5 text-text-secondary">
        {t("list.normalSessionsShort")}{" "}
        {formatSettlementMoney(locale, balance.normalSessionPayableAmount, currency)}
      </p>
      <p className="text-xs leading-5 text-text-secondary">
        {t("list.packageReleasedShort")}{" "}
        {formatSettlementMoney(locale, balance.packageReleasedPayableAmount, currency)}
      </p>
      <p className="text-xs leading-5 text-text-secondary">
        {t("list.packageHeldShort")}{" "}
        {formatSettlementMoney(locale, balance.packageHeldAmount, currency)}
      </p>
    </div>
  );
}

export default function AdminPractitionerPayoutsListScreen() {
  const t = useTranslations("admin-practitioner-payouts");
  const locale = useLocale();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);
  const [drawerPractitioner, setDrawerPractitioner] =
    useState<AdminPractitionerPayoutDrawerTarget | null>(null);
  const [drawerDefaultCurrency, setDrawerDefaultCurrency] = useState<CurrencyCode>("EGP");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("ALL");
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>("ALL");

  const summariesQuery = useAdminPractitionerPayoutSummaries({
    search: deferredSearch || undefined,
    page,
    limit,
  });

  const summaries = useMemo(
    () => summariesQuery.data?.items ?? [],
    [summariesQuery.data?.items],
  );
  const pagination = summariesQuery.data?.pagination;

  const visibleRows = useMemo(
    () =>
      summaries.filter((summary) => {
        const anyPayable = hasPayableMoney(summary);
        const anyPackage = hasPackageMoney(summary);

        const currencyMatches =
          currencyFilter === "ALL"
            ? true
            : currencyFilter === "EGP"
              ? Number(summary.egp.totalPayableAmount ?? 0) > 0 ||
                Number(summary.egp.packageHeldAmount ?? 0) > 0 ||
                Number(summary.egp.packageReleasedPayableAmount ?? 0) > 0
              : Number(summary.usd.totalPayableAmount ?? 0) > 0 ||
                Number(summary.usd.packageHeldAmount ?? 0) > 0 ||
                Number(summary.usd.packageReleasedPayableAmount ?? 0) > 0;

        const balanceMatches =
          balanceFilter === "ALL"
            ? true
            : balanceFilter === "HAS_PAYABLE"
              ? anyPayable
              : anyPackage;

        return currencyMatches && balanceMatches;
      }),
    [balanceFilter, currencyFilter, summaries],
  );

  const handleOpenPay = (target: AdminPractitionerPayoutDrawerTarget, defaultCurrency: CurrencyCode) => {
    setDrawerPractitioner(target);
    setDrawerDefaultCurrency(defaultCurrency);
  };

  const summaryMetrics = useMemo(() => {
    return visibleRows.reduce(
      (accumulator, summary) => {
        const egpPayable = parseAmount(summary.egp.totalPayableAmount);
        const usdPayable = parseAmount(summary.usd.totalPayableAmount);
        const egpHeld = parseAmount(summary.egp.packageHeldAmount);
        const usdHeld = parseAmount(summary.usd.packageHeldAmount);

        return {
          practitioners: accumulator.practitioners + 1,
          payableCount: accumulator.payableCount + (egpPayable > 0 || usdPayable > 0 ? 1 : 0),
          packageCount: accumulator.packageCount + (egpHeld > 0 || usdHeld > 0 ? 1 : 0),
          egpPayable: accumulator.egpPayable + egpPayable,
          usdPayable: accumulator.usdPayable + usdPayable,
        };
      },
      {
        practitioners: 0,
        payableCount: 0,
        packageCount: 0,
        egpPayable: 0,
        usdPayable: 0,
      },
    );
  }, [visibleRows]);

  const activeFilterChips = [
    deferredSearch ? { id: "search", label: `${t("list.searchLabel")}: ${deferredSearch}` } : null,
    balanceFilter !== "ALL"
      ? {
          id: "balance",
          label:
            balanceFilter === "HAS_PAYABLE"
              ? t("list.filters.hasPayable")
              : t("list.filters.hasPackage"),
        }
      : null,
    currencyFilter !== "ALL"
      ? {
          id: "currency",
          label: t(`currencies.${currencyFilter}` as Parameters<typeof t>[0]),
        }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string }>;

  const columns = useMemo<ColumnDef<AdminPractitionerPayoutSummary>[]>(() => [
    {
      id: "practitioner",
      header: t("list.columns.practitioner"),
      cell: (summary) => (
        <div className="space-y-1">
          <p className="font-semibold text-text-primary dark:text-white/95">
            {summary.practitionerName ?? summary.practitionerSlug ?? summary.practitionerId}
          </p>
          <p className="text-xs text-text-secondary">{summary.practitionerSlug ?? summary.practitionerId}</p>
        </div>
      ),
    },
    {
      id: "egp",
      header: t("list.columns.payableEgp"),
      cell: (summary) => (
        <BalanceBreakdown
          balance={summary.egp}
          locale={locale}
          t={t}
          currency="EGP"
          isLoading={false}
        />
      ),
    },
    {
      id: "usd",
      header: t("list.columns.payableUsd"),
      cell: (summary) => (
        <BalanceBreakdown
          balance={summary.usd}
          locale={locale}
          t={t}
          currency="USD"
          isLoading={false}
        />
      ),
    },
    {
      id: "lastPayout",
      header: t("list.columns.lastPayout"),
      cell: (summary) => {
        const latestPayoutAt = getLatestPayoutAt([summary.egp.lastPayoutAt, summary.usd.lastPayoutAt]);

        return (
          <div className="space-y-1 text-sm text-text-secondary">
            <p className="font-medium text-text-primary dark:text-white/95">
              {latestPayoutAt ? formatSettlementDateTime(locale, latestPayoutAt) : "-"}
            </p>
            <p className="text-xs leading-5 text-text-muted">
              {t("list.packageHint", {
                egp: formatSettlementMoney(locale, summary.egp.packageHeldAmount, "EGP"),
                usd: formatSettlementMoney(locale, summary.usd.packageHeldAmount, "USD"),
              })}
            </p>
          </div>
        );
      },
    },
  ], [locale, t]);

  return (
    <>
      <AdminOperationalListShell
        eyebrow={t("list.eyebrow")}
        title={t("list.title")}
        description={t("list.description")}
        actions={
          <SurfaceActionLink href="/admin/practitioner-payouts/history">
            {t("list.actions.history")}
          </SurfaceActionLink>
        }
        notice={
          <section className="app-panel-soft rounded-[26px] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {pagination ? t("list.results", { count: visibleRows.length }) : t("list.loading")}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95">
                  {formatSettlementMoney(locale, summaryMetrics.egpPayable, "EGP")}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {formatSettlementMoney(locale, summaryMetrics.usdPayable, "USD")}
                </p>
              </div>

              <div className="max-w-full sm:max-w-[34rem]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {activeFilterChips.length > 0 ? t("list.filters.all") : t("list.note")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeFilterChips.length > 0 ? (
                    activeFilterChips.map((chip) => (
                      <span
                        key={chip.id}
                        className="app-chip rounded-full px-3 py-1.5 text-xs text-text-secondary dark:text-white/80"
                      >
                        {chip.label}
                      </span>
                    ))
                  ) : (
                    <span className="app-chip rounded-full px-3 py-1.5 text-xs text-text-secondary dark:text-white/80">
                      {t("list.note")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        }
        summaryCards={
          <>
            <AdminSummaryCard
              label={t("list.columns.practitioner")}
              value={summaryMetrics.practitioners}
              hint={pagination ? t("list.results", { count: visibleRows.length }) : t("list.loading")}
              tone="primary"
              icon={<Users className="h-4 w-4" />}
            />
            <AdminSummaryCard
              label={t("list.filters.hasPayable")}
              value={summaryMetrics.payableCount}
              hint={formatSettlementMoney(locale, summaryMetrics.egpPayable, "EGP")}
              tone="success"
              icon={<BadgeDollarSign className="h-4 w-4" />}
            />
            <AdminSummaryCard
              label={t("list.filters.hasPackage")}
              value={summaryMetrics.packageCount}
              hint={t("list.packageHeldShort")}
              tone="warning"
              icon={<Package className="h-4 w-4" />}
            />
            <AdminSummaryCard
              label={t("list.columns.payableUsd")}
              value={formatSettlementMoney(locale, summaryMetrics.usdPayable, "USD")}
              hint={t("list.payableNow")}
              tone="neutral"
              icon={<BadgeDollarSign className="h-4 w-4" />}
            />
          </>
        }
        filters={
          <div className="space-y-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <label className="relative block w-full xl:max-w-md">
                <span className="sr-only">{t("list.searchLabel")}</span>
                <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t("list.searchPlaceholder")}
                  className="app-control w-full py-3 ps-11 pe-4"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                {search || balanceFilter !== "ALL" || currencyFilter !== "ALL" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setBalanceFilter("ALL");
                      setCurrencyFilter("ALL");
                      setPage(1);
                    }}
                    className="rounded-full border border-border-light px-3 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-tertiary dark:bg-white/5"
                  >
                    {t("list.filters.all")}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-[24px] bg-surface-secondary/70 p-4 dark:bg-white/[0.03]">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["ALL", t("list.filters.all")],
                    ["HAS_PAYABLE", t("list.filters.hasPayable")],
                    ["HAS_PACKAGE", t("list.filters.hasPackage")],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setBalanceFilter(value);
                      setPage(1);
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      balanceFilter === value
                        ? "border-primary/25 bg-primary-light/45 text-primary dark:bg-primary/15"
                        : "border-border-light bg-white text-text-secondary hover:border-primary/20 hover:text-text-primary dark:border-white/8 dark:bg-surface-secondary dark:text-white/75"
                    }`}
                  >
                    {label}
                  </button>
                ))}

                {(
                  [
                    ["ALL", t("list.filters.allCurrencies")],
                    ["EGP", t("currencies.EGP")],
                    ["USD", t("currencies.USD")],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setCurrencyFilter(value);
                      setPage(1);
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      currencyFilter === value
                        ? "border-primary/25 bg-primary-light/45 text-primary dark:bg-primary/15"
                        : "border-border-light bg-white text-text-secondary hover:border-primary/20 hover:text-text-primary dark:border-white/8 dark:bg-surface-secondary dark:text-white/75"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
      >
          <DataTable
            data={visibleRows}
            columns={columns}
            getRowId={(row) => row.practitionerId}
            loading={summariesQuery.isLoading}
            loadingRows={limit}
            emptyState={{
              title: t("list.emptyTitle"),
              description: t("list.emptyDescription"),
            }}
            pagination={
              pagination
                ? {
                    page: pagination.page,
                    limit: pagination.limit,
                    totalItems: pagination.totalItems,
                    totalPages: pagination.totalPages,
                  }
                : undefined
            }
            onPageChange={(nextPage) => setPage(nextPage)}
            onPageSizeChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
            pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
            rowActions={(summary) => {
              const canPayEgp = Number(summary.egp.totalPayableAmount ?? 0) > 0;
              const canPayUsd = Number(summary.usd.totalPayableAmount ?? 0) > 0;
              const defaultCurrency: CurrencyCode = canPayEgp ? "EGP" : canPayUsd ? "USD" : "EGP";

              return (
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/practitioner-payouts/${summary.practitionerId}`}
                    className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:bg-brand-25 dark:bg-surface-secondary dark:text-white/95 dark:hover:bg-surface-tertiary"
                  >
                    {t("list.actions.viewDetails")}
                  </Link>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!canPayEgp && !canPayUsd}
                    onClick={() =>
                      handleOpenPay(
                        {
                          practitionerId: summary.practitionerId,
                          practitionerName:
                            summary.practitionerName ?? summary.practitionerSlug ?? summary.practitionerId,
                          practitionerSlug: summary.practitionerSlug ?? summary.practitionerId,
                        },
                        defaultCurrency,
                      )
                    }
                  >
                    {t("list.actions.pay")}
                  </Button>
                </div>
              );
            }}
            rowActionsHeader={t("list.columns.actions")}
          />

          <p className="text-xs leading-6 text-text-secondary">{t("list.note")}</p>
      </AdminOperationalListShell>

      <AdminPractitionerPayoutDrawer
        isOpen={Boolean(drawerPractitioner)}
        practitioner={drawerPractitioner}
        defaultCurrency={drawerDefaultCurrency}
        onClose={() => setDrawerPractitioner(null)}
        onSuccess={() => {
          summariesQuery.refetch();
        }}
      />
    </>
  );
}
