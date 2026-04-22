"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { BarChart3, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { AreaTrendChart } from "@/components/charts";
import { DashboardChartCard, DashboardKpiCard } from "@/components/dashboard";
import { DataTable, buildUpdatedSearchParams, parsePositiveIntParam } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { formatCompactNumber, formatDateLabel, formatDateTime } from "../utils/report-format";
import { useCareRequestsReportOverview, useCareRequestsReportRows } from "../hooks/use-admin-reports";
import type { CareRequestsReportRow } from "../types/admin-reports.types";

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
        id: "patientId",
        header: t("careRequests.table.patientId"),
        accessor: (row) => row.patientId,
      },
      {
        id: "practitionerId",
        header: t("careRequests.table.practitionerId"),
        accessor: (row) => row.practitionerId,
      },
      {
        id: "approvalRef",
        header: t("careRequests.table.approvalRef"),
        accessor: (row) => row.approvalRef,
      },
    ],
    [t, locale],
  );

  return (
    <div className="space-y-6">
      <section className="app-page-hero px-6 py-6">
        <div className="mx-auto w-full max-w-[1120px]">
          <h1 className="text-2xl font-semibold text-text-primary">{t("careRequests.title")}</h1>
          <p className="mt-2 max-w-[78ch] text-sm text-text-muted">{t("careRequests.subtitle")}</p>

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
                {t("filters.practitionerId")}
              </span>
              <input
                className="app-control w-full py-3"
                placeholder={t("filters.practitionerIdPlaceholder")}
                value={practitionerId}
                onChange={(event) => updateQuery({ page: 1, practitionerId: event.target.value || null })}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="px-6">
        <div className="mx-auto w-full max-w-[1120px] space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DashboardKpiCard
              label={t("careRequests.kpis.total")}
              value={formatCompactNumber(locale, overview?.totals.totalRequests ?? "0")}
              helper={t("careRequests.kpis.totalHint")}
              icon={<BarChart3 className="h-4 w-4" />}
              accentTone="teal"
            />
            <DashboardKpiCard
              label={t("careRequests.kpis.pending")}
              value={formatCompactNumber(locale, overview?.totals.pending ?? "0")}
              helper={t("careRequests.kpis.pendingHint")}
              icon={<Clock3 className="h-4 w-4" />}
              accentTone="orange"
            />
            <DashboardKpiCard
              label={t("careRequests.kpis.approved")}
              value={formatCompactNumber(locale, overview?.totals.approved ?? "0")}
              helper={t("careRequests.kpis.approvedHint")}
              icon={<CheckCircle2 className="h-4 w-4" />}
              accentTone="sky"
            />
            <DashboardKpiCard
              label={t("careRequests.kpis.rejected")}
              value={formatCompactNumber(locale, overview?.totals.rejected ?? "0")}
              helper={t("careRequests.kpis.rejectedHint")}
              icon={<XCircle className="h-4 w-4" />}
              accentTone="indigo"
            />
            <DashboardKpiCard
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
            <DashboardKpiCard
              label={t("careRequests.kpis.pendingAging")}
              value={`${overview?.pendingAging.moreThan7 ?? "0"}`}
              helper={t("careRequests.kpis.pendingAgingHint")}
              icon={<Clock3 className="h-4 w-4" />}
              accentTone="orange"
            />
          </div>

          <DashboardChartCard title={t("careRequests.charts.trend.title")} subtitle={t("careRequests.charts.trend.note")}>
            <AreaTrendChart
              locale={locale}
              categories={categories}
              seriesName={t("careRequests.charts.trend.requested")}
              values={requestedValues}
              comparisonSeriesName={t("careRequests.charts.trend.approved")}
              comparisonValues={approvedValues}
              color="#2F2FE4"
              comparisonColor="#89A4FF"
              height={300}
            />
          </DashboardChartCard>

          <article className="app-panel rounded-3xl p-5">
            <h2 className="text-sm font-semibold text-text-primary">{t("careRequests.table.title")}</h2>
            <p className="mt-1 text-xs text-text-muted">{t("careRequests.table.note")}</p>
            <div className="mt-4">
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
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
