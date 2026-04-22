"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { CircleDollarSign, HandCoins, Receipt, Scale, TrendingUp } from "lucide-react";
import { AreaTrendChart } from "@/components/charts";
import { DashboardChartCard, DashboardKpiCard } from "@/components/dashboard";
import { DataTable, buildUpdatedSearchParams, parsePositiveIntParam } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { formatDateLabel, formatDateTime, formatMoney } from "../utils/report-format";
import { usePaymentsRevenueReportOverview, usePaymentsRevenueReportRows } from "../hooks/use-admin-reports";
import type { PaymentsRevenueReportRow } from "../types/admin-reports.types";

function parseIsoDateOnly(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return value;
}

export default function AdminPaymentsRevenueReportScreen() {
  const t = useTranslations("admin-reports");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const from = parseIsoDateOnly(searchParams.get("from"));
  const to = parseIsoDateOnly(searchParams.get("to"));
  const currencyCode = searchParams.get("currencyCode")?.trim() || "";
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1, max: 10_000 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), 10, { min: 1, max: 50 });

  const updateQuery = (patch: Record<string, string | number | null>) => {
    const next = buildUpdatedSearchParams(searchParams, patch);
    router.push(`${pathname}?${next}` as never);
  };

  const overviewQuery = usePaymentsRevenueReportOverview({
    from,
    to,
    currencyCode: currencyCode || null,
  });
  const rowsQuery = usePaymentsRevenueReportRows({
    from,
    to,
    currencyCode: currencyCode || null,
    page,
    limit,
  });

  const overview = overviewQuery.data;
  const trend = overview?.trend ?? [];
  const categories = trend.map((point) => formatDateLabel(locale, point.date));
  const revenueValues = trend.map((point) => Number(point.revenue || "0"));
  const grossValues = trend.map((point) => Number(point.grossInflow || "0"));
  const refundsValues = trend.map((point) => Number(point.refunds || "0"));
  const feesValues = trend.map((point) => Number(point.fees || "0"));

  const columns: ColumnDef<PaymentsRevenueReportRow>[] = useMemo(
    () => [
      {
        id: "occurredAt",
        header: t("paymentsRevenue.table.occurredAt"),
        accessor: (row) => row.occurredAt,
        cell: (_row, value) => formatDateTime(locale, String(value)),
      },
      {
        id: "summary",
        header: t("paymentsRevenue.table.summary"),
        accessor: (row) => row.summary,
      },
      {
        id: "sourceId",
        header: t("paymentsRevenue.table.sourceId"),
        accessor: (row) => row.sourceId,
      },
      {
        id: "amount",
        header: t("paymentsRevenue.table.amount"),
        accessor: (row) => row.amount,
        cell: (row) => formatMoney(locale, row.amount, row.currencyCode),
      },
      {
        id: "journalEntryId",
        header: t("paymentsRevenue.table.journalEntryId"),
        accessor: (row) => row.journalEntryId,
      },
    ],
    [t, locale],
  );

  return (
    <div className="space-y-6">
      <section className="app-page-hero px-6 py-6">
        <div className="mx-auto w-full max-w-[1120px]">
          <h1 className="text-2xl font-semibold text-text-primary">{t("paymentsRevenue.title")}</h1>
          <p className="mt-2 max-w-[78ch] text-sm text-text-muted">{t("paymentsRevenue.subtitle")}</p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("filters.from")}
              </span>
              <input
                className="app-control w-full py-3"
                type="date"
                value={from ? from.slice(0, 10) : ""}
                onChange={(event) => updateQuery({ page: 1, from: event.target.value || null })}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("filters.to")}
              </span>
              <input
                className="app-control w-full py-3"
                type="date"
                value={to ? to.slice(0, 10) : ""}
                onChange={(event) => updateQuery({ page: 1, to: event.target.value || null })}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("filters.currency")}
              </span>
              <input
                className="app-control w-full py-3 uppercase"
                placeholder={t("filters.currencyPlaceholder")}
                value={currencyCode}
                onChange={(event) => updateQuery({ page: 1, currencyCode: event.target.value || null })}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="px-6">
        <div className="mx-auto w-full max-w-[1120px] space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DashboardKpiCard
              label={t("paymentsRevenue.kpis.grossInflow")}
              value={formatMoney(locale, overview?.kpis.grossInflow ?? "0", overview?.currencyCode)}
              helper={t("paymentsRevenue.kpis.grossInflowHint")}
              icon={<CircleDollarSign className="h-4 w-4" />}
              accentTone="teal"
            />
            <DashboardKpiCard
              label={t("paymentsRevenue.kpis.platformRevenue")}
              value={formatMoney(locale, overview?.kpis.platformRevenue ?? "0", overview?.currencyCode)}
              helper={t("paymentsRevenue.kpis.platformRevenueHint")}
              icon={<TrendingUp className="h-4 w-4" />}
              accentTone="sky"
            />
            <DashboardKpiCard
              label={t("paymentsRevenue.kpis.practitionerPayable")}
              value={formatMoney(locale, overview?.kpis.practitionerPayableOutstanding ?? "0", overview?.currencyCode)}
              helper={t("paymentsRevenue.kpis.practitionerPayableHint")}
              icon={<HandCoins className="h-4 w-4" />}
              accentTone="indigo"
            />
            <DashboardKpiCard
              label={t("paymentsRevenue.kpis.refunds")}
              value={formatMoney(locale, overview?.kpis.refundsTotal ?? "0", overview?.currencyCode)}
              helper={t("paymentsRevenue.kpis.refundsHint")}
              icon={<Receipt className="h-4 w-4" />}
              accentTone="orange"
            />
            <DashboardKpiCard
              label={t("paymentsRevenue.kpis.vat")}
              value={formatMoney(locale, overview?.kpis.vatTotal ?? "0", overview?.currencyCode)}
              helper={t("paymentsRevenue.kpis.vatHint")}
              icon={<Scale className="h-4 w-4" />}
              accentTone="sky"
            />
            <DashboardKpiCard
              label={t("paymentsRevenue.kpis.fees")}
              value={formatMoney(locale, overview?.kpis.feesTotal ?? "0", overview?.currencyCode)}
              helper={t("paymentsRevenue.kpis.feesHint")}
              icon={<TrendingUp className="h-4 w-4" />}
              accentTone="orange"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DashboardChartCard title={t("paymentsRevenue.charts.revenue.title")} subtitle={t("paymentsRevenue.charts.revenue.note")}>
              <AreaTrendChart
                locale={locale}
                categories={categories}
                seriesName={t("paymentsRevenue.charts.revenue.series")}
                values={revenueValues}
                comparisonSeriesName={t("paymentsRevenue.charts.revenue.comparison")}
                comparisonValues={grossValues}
                color="#2F2FE4"
                comparisonColor="#89A4FF"
                height={300}
              />
            </DashboardChartCard>

            <DashboardChartCard title={t("paymentsRevenue.charts.refundsFees.title")} subtitle={t("paymentsRevenue.charts.refundsFees.note")}>
              <AreaTrendChart
                locale={locale}
                categories={categories}
                seriesName={t("paymentsRevenue.charts.refundsFees.refunds")}
                values={refundsValues}
                comparisonSeriesName={t("paymentsRevenue.charts.refundsFees.fees")}
                comparisonValues={feesValues}
                color="#FF9013"
                comparisonColor="#C9D4E8"
                height={300}
              />
            </DashboardChartCard>
          </div>

          <article className="app-panel rounded-3xl p-5">
            <h2 className="text-sm font-semibold text-text-primary">{t("paymentsRevenue.table.title")}</h2>
            <p className="mt-1 text-xs text-text-muted">{t("paymentsRevenue.table.note")}</p>
            <div className="mt-4">
              <DataTable
                data={rowsQuery.data?.items ?? []}
                columns={columns}
                getRowId={(row) => row.journalEntryId}
                loading={rowsQuery.isLoading}
                error={rowsQuery.isError ? t("common.error") : null}
                ariaLabel={t("paymentsRevenue.table.title")}
                caption={t("paymentsRevenue.table.title")}
                pagination={{
                  page: rowsQuery.data?.pagination.page ?? page,
                  limit: rowsQuery.data?.pagination.limit ?? limit,
                  totalItems: rowsQuery.data?.pagination.totalItems ?? 0,
                  totalPages: rowsQuery.data?.pagination.totalPages ?? 1,
                }}
                onPageChange={(nextPage) => updateQuery({ page: nextPage })}
                onPageSizeChange={(nextLimit) => updateQuery({ page: 1, limit: nextLimit })}
              />
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
