"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Building2, CircleDollarSign, Download, HandCoins, Receipt, Scale, TrendingUp } from "lucide-react";
import { AreaTrendChart, BarTrendChart } from "@/components/charts";
import { DashboardChartCard, DashboardKpiCard, DashboardSectionHeader } from "@/components/dashboard";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parsePositiveIntParam } from "@/components/ui/data-table";
import Button from "@/components/ui/button/Button";
import { parseDownloadFilename, triggerBlobDownload } from "@/lib/downloads/file-download";
import { useAdminAccountingDashboard, useDownloadAdminAccountingDashboardCsv } from "../hooks/use-admin-accounting";
import type { AccountingRecentEvent } from "../types/admin-accounting.types";

function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

function formatMoney(locale: string, value: string, currencyCode?: string | null) {
  const parsed = Number(value || "0");
  if (currencyCode) {
    return new Intl.NumberFormat(normalizeLocale(locale), {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parsed);
  }

  return new Intl.NumberFormat(normalizeLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
}

function formatDateLabel(locale: string, value: string) {
  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatDateTime(locale: string, value: string) {
  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shortId(value: string) {
  return value.length <= 16 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function parseIsoDateOnly(value: string | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return value;
}

export default function AdminAccountingDashboardScreen() {
  const t = useTranslations("admin-accounting");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const to = parseIsoDateOnly(searchParams.get("to"));
  const from = parseIsoDateOnly(searchParams.get("from"));
  const recentLimit = parsePositiveIntParam(searchParams.get("recentLimit"), 8, { min: 1, max: 20 });
  const currencyCode = searchParams.get("currencyCode")?.trim() || "";

  const dashboardQuery = useAdminAccountingDashboard({
    from: from ?? undefined,
    to: to ?? undefined,
    currencyCode: currencyCode || undefined,
    recentLimit,
  });

  const dashboard = dashboardQuery.data;
  const dashboardExportMutation = useDownloadAdminAccountingDashboardCsv();

  const categories = useMemo(
    () => (dashboard?.trends ?? []).map((point) => formatDateLabel(locale, point.date)),
    [dashboard?.trends, locale],
  );

  const revenueValues = useMemo(
    () => (dashboard?.trends ?? []).map((point) => Number(point.revenue)),
    [dashboard?.trends],
  );

  const payableValues = useMemo(
    () => (dashboard?.trends ?? []).map((point) => Number(point.payableIncrements)),
    [dashboard?.trends],
  );

  const payoutValues = useMemo(
    () => (dashboard?.trends ?? []).map((point) => Number(point.payouts)),
    [dashboard?.trends],
  );

  const refundValues = useMemo(
    () => (dashboard?.trends ?? []).map((point) => Number(point.refunds)),
    [dashboard?.trends],
  );

  const feeValues = useMemo(
    () => (dashboard?.trends ?? []).map((point) => Number(point.fees)),
    [dashboard?.trends],
  );

  const updateQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const queryString = next.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const handleExportDashboard = async () => {
    const exported = await dashboardExportMutation.mutateAsync({
      from: from ?? undefined,
      to: to ?? undefined,
      currencyCode: currencyCode || undefined,
      recentLimit,
    });
    const fileName = parseDownloadFilename(
      exported.fileNameHeader,
      "admin-accounting-dashboard.csv",
    );
    triggerBlobDownload(exported.blob, fileName);
  };

  const recentEventColumns = useMemo<ColumnDef<AccountingRecentEvent>[]>(
    () => [
      {
        id: "summary",
        header: t("dashboard.recent.columns.summary"),
        accessor: (row) => row.summary,
        cell: (row) => (
          <div>
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">{row.summary}</p>
            <p className="mt-1 font-mono text-xs text-text-muted">
              {t("dashboard.recent.columns.sourceId", { value: shortId(row.sourceId) })}
            </p>
          </div>
        ),
      },
      {
        id: "sourceType",
        header: t("dashboard.recent.columns.sourceType"),
        accessor: (row) => row.sourceType,
        cell: (row) => (
          <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-text-brand dark:bg-primary/15 dark:text-primary-light">
            {t(`common.sourceType.${row.sourceType}`)}
          </span>
        ),
      },
      {
        id: "amount",
        header: t("dashboard.recent.columns.amount"),
        accessor: (row) => Number(row.amount),
        cell: (row) => formatMoney(locale, row.amount, row.currencyCode),
      },
      {
        id: "occurredAt",
        header: t("dashboard.recent.columns.occurredAt"),
        accessor: (row) => new Date(row.occurredAt).getTime(),
        cell: (row) => formatDateTime(locale, row.occurredAt),
      },
    ],
    [locale, t],
  );

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[30px] p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              {t("dashboard.eyebrow")}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-text-primary dark:text-white/95 sm:text-3xl">
              {t("dashboard.title")}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">{t("dashboard.note")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/finance/ledger")}
            >
              {t("dashboard.actions.openLedger")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/finance/reconciliation")}
            >
              {t("dashboard.actions.openReconciliation")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/admin-operations")}
            >
              {t("dashboard.actions.openOps")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              startIcon={<Download className="h-4 w-4" />}
              onClick={handleExportDashboard}
              disabled={dashboardExportMutation.isPending}
            >
              {dashboardExportMutation.isPending
                ? t("dashboard.actions.exporting")
                : t("dashboard.actions.exportCsv")}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("dashboard.filters.from")}
            </span>
            <input
              className="app-control w-full py-3"
              type="date"
              value={from ? from.slice(0, 10) : ""}
              onChange={(event) => updateQuery({ from: event.target.value || null })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("dashboard.filters.to")}
            </span>
            <input
              className="app-control w-full py-3"
              type="date"
              value={to ? to.slice(0, 10) : ""}
              onChange={(event) => updateQuery({ to: event.target.value || null })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("dashboard.filters.currency")}
            </span>
            <input
              className="app-control w-full py-3 uppercase"
              placeholder={t("dashboard.filters.currencyPlaceholder")}
              value={currencyCode}
              onChange={(event) => updateQuery({ currencyCode: event.target.value || null })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("dashboard.filters.recentLimit")}
            </span>
            <select
              className="app-control w-full py-3"
              value={recentLimit}
              onChange={(event) => updateQuery({ recentLimit: Number(event.target.value) })}
            >
              {[5, 8, 10, 12, 15, 20].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DashboardKpiCard
          label={t("dashboard.kpis.grossInflow")}
          value={formatMoney(locale, dashboard?.kpis.grossInflow ?? "0", dashboard?.kpis.currencyCode)}
          helper={t("dashboard.kpis.grossInflowHint")}
          icon={<CircleDollarSign className="h-4 w-4" />}
          accentTone="teal"
        />
        <DashboardKpiCard
          label={t("dashboard.kpis.platformRevenue")}
          value={formatMoney(locale, dashboard?.kpis.platformRevenue ?? "0", dashboard?.kpis.currencyCode)}
          helper={t("dashboard.kpis.platformRevenueHint")}
          icon={<Building2 className="h-4 w-4" />}
          accentTone="indigo"
        />
        <DashboardKpiCard
          label={t("dashboard.kpis.practitionerPayable")}
          value={formatMoney(
            locale,
            dashboard?.kpis.practitionerPayableOutstanding ?? "0",
            dashboard?.kpis.currencyCode,
          )}
          helper={t("dashboard.kpis.practitionerPayableHint")}
          icon={<HandCoins className="h-4 w-4" />}
          accentTone="sky"
        />
        <DashboardKpiCard
          label={t("dashboard.kpis.refunds")}
          value={formatMoney(locale, dashboard?.kpis.refundsTotal ?? "0", dashboard?.kpis.currencyCode)}
          helper={t("dashboard.kpis.refundsHint")}
          icon={<Receipt className="h-4 w-4" />}
          accentTone="orange"
        />
        <DashboardKpiCard
          label={t("dashboard.kpis.vat")}
          value={formatMoney(locale, dashboard?.kpis.vatTotal ?? "0", dashboard?.kpis.currencyCode)}
          helper={t("dashboard.kpis.vatHint")}
          icon={<Scale className="h-4 w-4" />}
          accentTone="sky"
        />
        <DashboardKpiCard
          label={t("dashboard.kpis.fees")}
          value={formatMoney(locale, dashboard?.kpis.feesTotal ?? "0", dashboard?.kpis.currencyCode)}
          helper={t("dashboard.kpis.feesHint")}
          icon={<TrendingUp className="h-4 w-4" />}
          accentTone="indigo"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardChartCard
          title={t("dashboard.charts.revenue.title")}
          subtitle={t("dashboard.charts.revenue.note")}
        >
          <AreaTrendChart
            locale={locale}
            categories={categories}
            seriesName={t("dashboard.charts.revenue.series")}
            values={revenueValues}
            comparisonSeriesName={t("dashboard.charts.revenue.comparison")}
            comparisonValues={payableValues}
            color="#2F2FE4"
            comparisonColor="#89A4FF"
            height={300}
          />
        </DashboardChartCard>

        <DashboardChartCard
          title={t("dashboard.charts.refundsAndFees.title")}
          subtitle={t("dashboard.charts.refundsAndFees.note")}
        >
          <AreaTrendChart
            locale={locale}
            categories={categories}
            seriesName={t("dashboard.charts.refundsAndFees.refunds")}
            values={refundValues}
            comparisonSeriesName={t("dashboard.charts.refundsAndFees.fees")}
            comparisonValues={feeValues}
            color="#FF9013"
            comparisonColor="#C9D4E8"
            height={300}
          />
        </DashboardChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardChartCard
          title={t("dashboard.charts.payablesAndPayouts.title")}
          subtitle={t("dashboard.charts.payablesAndPayouts.note")}
          actionLabel={t("dashboard.actions.openLedger")}
          actionHref="/admin/finance/ledger"
        >
          <BarTrendChart
            locale={locale}
            categories={categories}
            seriesName={t("dashboard.charts.payablesAndPayouts.series")}
            values={payableValues.map((value, index) => Math.max(value - (payoutValues[index] ?? 0), 0))}
            currencyCode={dashboard?.kpis.currencyCode ?? undefined}
            color="#2F2FE4"
            height={280}
          />
        </DashboardChartCard>

        <article className="app-panel rounded-3xl p-5">
          <DashboardSectionHeader
            title={t("dashboard.recent.title")}
            subtitle={t("dashboard.recent.note")}
          />
          <DataTable
            data={dashboard?.recentEvents ?? []}
            columns={recentEventColumns}
            getRowId={(row) => row.journalEntryId}
            loading={dashboardQuery.isLoading}
            error={dashboardQuery.isError ? t("dashboard.states.error") : null}
            onRowClick={(row) => router.push(`/admin/finance/ledger/${row.journalEntryId}` as never)}
            emptyState={{
              title: t("dashboard.states.emptyTitle"),
              description: t("dashboard.states.emptyNote"),
            }}
            ariaLabel={t("dashboard.recent.title")}
            caption={t("dashboard.recent.title")}
          />
        </article>
      </section>
    </div>
  );
}
