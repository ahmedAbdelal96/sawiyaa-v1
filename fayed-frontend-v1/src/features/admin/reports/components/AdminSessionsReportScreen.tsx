"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { CalendarCheck, CalendarX, CalendarRange } from "lucide-react";
import { AreaTrendChart } from "@/components/charts";
import { DashboardChartCard, DashboardKpiCard } from "@/components/dashboard";
import { DataTable, buildUpdatedSearchParams, parsePositiveIntParam } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { formatCompactNumber, formatDateLabel, formatDateTime } from "../utils/report-format";
import { useSessionsReportOverview, useSessionsReportRows } from "../hooks/use-admin-reports";
import type { SessionsReportRow } from "../types/admin-reports.types";

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
        id: "patientId",
        header: t("sessions.table.patientId"),
        accessor: (row) => row.patientId,
      },
      {
        id: "practitionerId",
        header: t("sessions.table.practitionerId"),
        accessor: (row) => row.practitionerId,
      },
    ],
    [t, locale],
  );

  return (
    <div className="space-y-6">
      <section className="app-page-hero px-6 py-6">
        <div className="mx-auto w-full max-w-[1120px]">
          <h1 className="text-2xl font-semibold text-text-primary">{t("sessions.title")}</h1>
          <p className="mt-2 max-w-[78ch] text-sm text-text-muted">{t("sessions.subtitle")}</p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
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
          </div>
        </div>
      </section>

      <section className="px-6">
        <div className="mx-auto w-full max-w-[1120px] space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DashboardKpiCard
              label={t("sessions.kpis.total")}
              value={formatCompactNumber(locale, overview?.totals.totalSessions ?? "0")}
              helper={t("sessions.kpis.totalHint")}
              icon={<CalendarRange className="h-4 w-4" />}
              accentTone="teal"
            />
            <DashboardKpiCard
              label={t("sessions.kpis.completed")}
              value={formatCompactNumber(locale, overview?.totals.completed ?? "0")}
              helper={t("sessions.kpis.completedHint")}
              icon={<CalendarCheck className="h-4 w-4" />}
              accentTone="sky"
            />
            <DashboardKpiCard
              label={t("sessions.kpis.cancelled")}
              value={formatCompactNumber(locale, overview?.totals.cancelled ?? "0")}
              helper={t("sessions.kpis.cancelledHint")}
              icon={<CalendarX className="h-4 w-4" />}
              accentTone="orange"
            />
            <DashboardKpiCard
              label={t("sessions.kpis.noShow")}
              value={formatCompactNumber(locale, overview?.totals.noShow ?? "0")}
              helper={t("sessions.kpis.noShowHint")}
              icon={<CalendarX className="h-4 w-4" />}
              accentTone="indigo"
            />
          </div>

          <DashboardChartCard title={t("sessions.charts.trend.title")} subtitle={t("sessions.charts.trend.note")}>
            <AreaTrendChart
              locale={locale}
              categories={categories}
              seriesName={t("sessions.charts.trend.series")}
              values={totals}
              height={300}
              color="#3D9286"
            />
          </DashboardChartCard>

          <article className="app-panel rounded-3xl p-5">
            <h2 className="text-sm font-semibold text-text-primary">{t("sessions.table.title")}</h2>
            <p className="mt-1 text-xs text-text-muted">{t("sessions.table.note")}</p>
            <div className="mt-4">
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
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
