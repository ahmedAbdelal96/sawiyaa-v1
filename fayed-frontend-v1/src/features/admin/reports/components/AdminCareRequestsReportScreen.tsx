"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { BarChart3, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { AreaTrendChart } from "@/components/charts";
import { DataTable, buildUpdatedSearchParams, parsePositiveIntParam } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { formatCompactNumber, formatDateLabel, formatDateTime } from "../utils/report-format";
import { useCareRequestsReportOverview, useCareRequestsReportRows } from "../hooks/use-admin-reports";
import type { CareRequestsReportRow } from "../types/admin-reports.types";
import {
  ReportPageContainer,
  ReportHeader,
  ReportFilterLabel,
  ReportKpiCard,
  ReportChartCard,
  ReportTableCard,
} from "./ReportLayout";

function parseIsoDateOnly(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return value;
}

export default function AdminCareRequestsReportScreen() {
  const t = useTranslations("admin-reports");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const from = parseIsoDateOnly(searchParams.get("from"));
  const to = parseIsoDateOnly(searchParams.get("to"));
  const practitionerId = searchParams.get("practitionerId")?.trim() || "";
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1, max: 10_000 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), 10, { min: 1, max: 50 });

  const updateQuery = (patch: Record<string, string | number | null>) => {
    const next = buildUpdatedSearchParams(searchParams, patch);
    router.push(`${pathname}?${next}` as never);
  };

  const overviewQuery = useCareRequestsReportOverview({
    from,
    to,
    practitionerId: practitionerId || null,
  });
  const rowsQuery = useCareRequestsReportRows({
    from,
    to,
    practitionerId: practitionerId || null,
    page,
    limit,
  });

  const overview = overviewQuery.data;
  const trend = overview?.trend ?? [];
  const categories = trend.map((point) => formatDateLabel(locale, point.date));
  const requestedValues = trend.map((point) => Number(point.requested || "0"));
  const approvedValues = trend.map((point) => Number(point.approved || "0"));

  const columns: ColumnDef<CareRequestsReportRow>[] = useMemo(
    () => [
      {
        id: "status",
        header: t("careRequests.table.status"),
        accessor: (row) => row.status,
      },
      {
        id: "requestedAt",
        header: t("careRequests.table.requestedAt"),
        accessor: (row) => row.requestedAt,
        cell: (_row, value) => formatDateTime(locale, String(value)),
      },
      {
        id: "patientName",
        header: t("careRequests.table.patientName"),
        accessor: (row) => row.patientName ?? t("common.na"),
      },
      {
        id: "practitionerName",
        header: t("careRequests.table.practitionerName"),
        accessor: (row) => row.practitionerName ?? t("common.na"),
      },
      {
        id: "approvalRef",
        header: t("careRequests.table.approvalRef"),
        accessor: (row) => row.approvalRef,
      },
    ],
    [t, locale],
  );

  const filters = (
    <div className="flex flex-wrap items-center gap-3">
      <ReportFilterLabel label={t("filters.from")}>
        <input
          className="rounded-lg border border-border-light bg-surface-secondary px-2.5 py-1.5 text-xs text-text-brand shadow-theme-xs outline-hidden focus:border-border-focus focus:ring-2 focus:ring-primary/10"
          type="date"
          value={from ? from.slice(0, 10) : ""}
          onChange={(event) => updateQuery({ page: 1, from: event.target.value || null })}
        />
      </ReportFilterLabel>

      <ReportFilterLabel label={t("filters.to")}>
        <input
          className="rounded-lg border border-border-light bg-surface-secondary px-2.5 py-1.5 text-xs text-text-brand shadow-theme-xs outline-hidden focus:border-border-focus focus:ring-2 focus:ring-primary/10"
          type="date"
          value={to ? to.slice(0, 10) : ""}
          onChange={(event) => updateQuery({ page: 1, to: event.target.value || null })}
        />
      </ReportFilterLabel>

      <ReportFilterLabel label={t("filters.practitionerId")}>
        <input
          className="w-32 rounded-lg border border-border-light bg-surface-secondary px-2.5 py-1.5 text-xs text-text-brand shadow-theme-xs outline-hidden focus:border-border-focus focus:ring-2 focus:ring-primary/10"
          placeholder={t("filters.practitionerIdPlaceholder")}
          value={practitionerId}
          onChange={(event) => updateQuery({ page: 1, practitionerId: event.target.value || null })}
        />
      </ReportFilterLabel>
    </div>
  );

  return (
    <ReportPageContainer>
      <ReportHeader
        title={t("careRequests.title")}
        subtitle={t("careRequests.subtitle")}
        filters={filters}
      />

      <section className="px-6">
        <div className="mx-auto w-full max-w-[1120px] space-y-4">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <ReportKpiCard
              label={t("careRequests.kpis.total")}
              value={formatCompactNumber(locale, overview?.totals.totalRequests ?? "0")}
              helper={t("careRequests.kpis.totalHint")}
              icon={<BarChart3 className="h-4 w-4" />}
              accentTone="teal"
            />
            <ReportKpiCard
              label={t("careRequests.kpis.pending")}
              value={formatCompactNumber(locale, overview?.totals.pending ?? "0")}
              helper={t("careRequests.kpis.pendingHint")}
              icon={<Clock3 className="h-4 w-4" />}
              accentTone="orange"
            />
            <ReportKpiCard
              label={t("careRequests.kpis.approved")}
              value={formatCompactNumber(locale, overview?.totals.approved ?? "0")}
              helper={t("careRequests.kpis.approvedHint")}
              icon={<CheckCircle2 className="h-4 w-4" />}
              accentTone="sky"
            />
            <ReportKpiCard
              label={t("careRequests.kpis.rejected")}
              value={formatCompactNumber(locale, overview?.totals.rejected ?? "0")}
              helper={t("careRequests.kpis.rejectedHint")}
              icon={<XCircle className="h-4 w-4" />}
              accentTone="indigo"
            />
            <ReportKpiCard
              label={t("careRequests.kpis.acceptance")}
              value={
                overview?.totals.acceptanceRatePercent
                  ? `${overview.totals.acceptanceRatePercent}%`
                  : t("common.na")
              }
              helper={t("careRequests.kpis.acceptanceHint")}
              icon={<CheckCircle2 className="h-4 w-4" />}
              accentTone="teal"
            />
            <ReportKpiCard
              label={t("careRequests.kpis.pendingAging")}
              value={`${overview?.pendingAging.moreThan7 ?? "0"}`}
              helper={t("careRequests.kpis.pendingAgingHint")}
              icon={<Clock3 className="h-4 w-4" />}
              accentTone="orange"
            />
          </div>

          <ReportChartCard title={t("careRequests.charts.trend.title")} subtitle={t("careRequests.charts.trend.note")}>
            <AreaTrendChart
              locale={locale}
              categories={categories}
              seriesName={t("careRequests.charts.trend.requested")}
              values={requestedValues}
              comparisonSeriesName={t("careRequests.charts.trend.approved")}
              comparisonValues={approvedValues}
              color="#2F2FE4"
              comparisonColor="#89A4FF"
              height={220}
            />
          </ReportChartCard>

          <ReportTableCard title={t("careRequests.table.title")} subtitle={t("careRequests.table.note")}>
            <DataTable
              data={rowsQuery.data?.items ?? []}
              columns={columns}
              getRowId={(row) => row.id}
              loading={rowsQuery.isLoading}
              error={rowsQuery.isError ? t("common.error") : null}
              ariaLabel={t("careRequests.table.title")}
              caption={t("careRequests.table.title")}
              pagination={{
                page: rowsQuery.data?.pagination.page ?? page,
                limit: rowsQuery.data?.pagination.limit ?? limit,
                totalItems: rowsQuery.data?.pagination.totalItems ?? 0,
                totalPages: rowsQuery.data?.pagination.totalPages ?? 1,
              }}
              onPageChange={(nextPage) => updateQuery({ page: nextPage })}
              onPageSizeChange={(nextLimit) => updateQuery({ page: 1, limit: nextLimit })}
            />
          </ReportTableCard>
        </div>
      </section>
    </ReportPageContainer>
  );
}
