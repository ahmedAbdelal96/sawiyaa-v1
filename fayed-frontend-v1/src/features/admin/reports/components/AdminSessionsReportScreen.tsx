"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { CalendarCheck, CalendarX, CalendarRange } from "lucide-react";
import { AreaTrendChart } from "@/components/charts";
import { DataTable, buildUpdatedSearchParams, parsePositiveIntParam } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { formatCompactNumber, formatDateLabel, formatDateTime } from "../utils/report-format";
import { useSessionsReportOverview, useSessionsReportRows } from "../hooks/use-admin-reports";
import type { SessionsReportRow } from "../types/admin-reports.types";
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

export default function AdminSessionsReportScreen() {
  const t = useTranslations("admin-reports");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const from = parseIsoDateOnly(searchParams.get("from"));
  const to = parseIsoDateOnly(searchParams.get("to"));
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1, max: 10_000 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), 10, { min: 1, max: 50 });

  const updateQuery = (patch: Record<string, string | number | null>) => {
    const next = buildUpdatedSearchParams(searchParams, patch);
    router.push(`${pathname}?${next}` as never);
  };

  const overviewQuery = useSessionsReportOverview({ from, to });
  const rowsQuery = useSessionsReportRows({ from, to, page, limit });

  const overview = overviewQuery.data;
  const trend = overview?.trend ?? [];
  const categories = trend.map((point) => formatDateLabel(locale, point.date));
  const totals = trend.map((point) => Number(point.total || "0"));

  const columns: ColumnDef<SessionsReportRow>[] = useMemo(
    () => [
      {
        id: "sessionCode",
        header: t("sessions.table.sessionCode"),
        accessor: (row) => row.sessionCode,
      },
      {
        id: "status",
        header: t("sessions.table.status"),
        accessor: (row) => row.status,
      },
      {
        id: "scheduledStartAt",
        header: t("sessions.table.scheduledStartAt"),
        accessor: (row) => row.scheduledStartAt,
        cell: (row) =>
          row.scheduledStartAt
            ? formatDateTime(locale, row.scheduledStartAt)
            : t("common.na"),
      },
      {
        id: "patientName",
        header: t("sessions.table.patientName"),
        accessor: (row) => row.patientName ?? t("common.na"),
      },
      {
        id: "practitionerName",
        header: t("sessions.table.practitionerName"),
        accessor: (row) => row.practitionerName ?? t("common.na"),
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
    </div>
  );

  return (
    <ReportPageContainer>
      <ReportHeader
        title={t("sessions.title")}
        subtitle={t("sessions.subtitle")}
        filters={filters}
      />

      <section className="px-6">
        <div className="mx-auto w-full max-w-[1120px] space-y-4">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <ReportKpiCard
              label={t("sessions.kpis.total")}
              value={formatCompactNumber(locale, overview?.totals.totalSessions ?? "0")}
              helper={t("sessions.kpis.totalHint")}
              icon={<CalendarRange className="h-4 w-4" />}
              accentTone="teal"
            />
            <ReportKpiCard
              label={t("sessions.kpis.completed")}
              value={formatCompactNumber(locale, overview?.totals.completed ?? "0")}
              helper={t("sessions.kpis.completedHint")}
              icon={<CalendarCheck className="h-4 w-4" />}
              accentTone="sky"
            />
            <ReportKpiCard
              label={t("sessions.kpis.cancelled")}
              value={formatCompactNumber(locale, overview?.totals.cancelled ?? "0")}
              helper={t("sessions.kpis.cancelledHint")}
              icon={<CalendarX className="h-4 w-4" />}
              accentTone="orange"
            />
            <ReportKpiCard
              label={t("sessions.kpis.noShow")}
              value={formatCompactNumber(locale, overview?.totals.noShow ?? "0")}
              helper={t("sessions.kpis.noShowHint")}
              icon={<CalendarX className="h-4 w-4" />}
              accentTone="indigo"
            />
          </div>

          <ReportChartCard title={t("sessions.charts.trend.title")} subtitle={t("sessions.charts.trend.note")}>
            <AreaTrendChart
              locale={locale}
              categories={categories}
              seriesName={t("sessions.charts.trend.series")}
              values={totals}
              height={220}
              color="#3D9286"
            />
          </ReportChartCard>

          <ReportTableCard title={t("sessions.table.title")} subtitle={t("sessions.table.note")}>
            <DataTable
              data={rowsQuery.data?.items ?? []}
              columns={columns}
              getRowId={(row) => row.id}
              loading={rowsQuery.isLoading}
              error={rowsQuery.isError ? t("common.error") : null}
              ariaLabel={t("sessions.table.title")}
              caption={t("sessions.table.title")}
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
