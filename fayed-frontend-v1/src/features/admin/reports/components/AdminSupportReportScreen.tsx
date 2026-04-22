"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { LifeBuoy, Timer, Ticket, TicketCheck } from "lucide-react";
import { AreaTrendChart } from "@/components/charts";
import { DashboardChartCard, DashboardKpiCard } from "@/components/dashboard";
import { DataTable, buildUpdatedSearchParams, parsePositiveIntParam } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { formatCompactNumber, formatDateLabel, formatDateTime } from "../utils/report-format";
import { useSupportReportOverview, useSupportReportRows } from "../hooks/use-admin-reports";
import type { SupportReportRow } from "../types/admin-reports.types";

function parseIsoDateOnly(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return value;
}

export default function AdminSupportReportScreen() {
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

  const overviewQuery = useSupportReportOverview({ from, to });
  const rowsQuery = useSupportReportRows({ from, to, page, limit });

  const overview = overviewQuery.data;
  const trend = overview?.trend ?? [];
  const categories = trend.map((point) => formatDateLabel(locale, point.date));
  const createdValues = trend.map((point) => Number(point.created || "0"));
  const resolvedValues = trend.map((point) => Number(point.resolvedOrClosed || "0"));

  const columns: ColumnDef<SupportReportRow>[] = useMemo(
    () => [
      {
        id: "subject",
        header: t("support.table.subject"),
        accessor: (row) => row.subject,
      },
      {
        id: "status",
        header: t("support.table.status"),
        accessor: (row) => row.status,
      },
      {
        id: "priority",
        header: t("support.table.priority"),
        accessor: (row) => row.priority,
      },
      {
        id: "createdAt",
        header: t("support.table.createdAt"),
        accessor: (row) => row.createdAt,
        cell: (_row, value) => formatDateTime(locale, String(value)),
      },
      {
        id: "resolvedAt",
        header: t("support.table.resolvedAt"),
        accessor: (row) => row.closedAt ?? row.resolvedAt,
        cell: (row) =>
          row.closedAt || row.resolvedAt
            ? formatDateTime(locale, row.closedAt ?? row.resolvedAt ?? "")
            : t("common.na"),
      },
      {
        id: "publicTicketRef",
        header: t("support.table.publicRef"),
        accessor: (row) => row.publicTicketRef,
      },
    ],
    [t, locale],
  );

  return (
    <div className="space-y-6">
      <section className="app-page-hero px-6 py-6">
        <div className="mx-auto w-full max-w-[1120px]">
          <h1 className="text-2xl font-semibold text-text-primary">{t("support.title")}</h1>
          <p className="mt-2 max-w-[78ch] text-sm text-text-muted">{t("support.subtitle")}</p>

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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DashboardKpiCard
              label={t("support.kpis.total")}
              value={formatCompactNumber(locale, overview?.totals.totalTickets ?? "0")}
              helper={t("support.kpis.totalHint")}
              icon={<LifeBuoy className="h-4 w-4" />}
              accentTone="teal"
            />
            <DashboardKpiCard
              label={t("support.kpis.open")}
              value={formatCompactNumber(locale, overview?.totals.openTickets ?? "0")}
              helper={t("support.kpis.openHint")}
              icon={<Ticket className="h-4 w-4" />}
              accentTone="sky"
            />
            <DashboardKpiCard
              label={t("support.kpis.overdue")}
              value={formatCompactNumber(locale, overview?.totals.overdueOpenTickets ?? "0")}
              helper={t("support.kpis.overdueHint")}
              icon={<Timer className="h-4 w-4" />}
              accentTone="orange"
            />
            <DashboardKpiCard
              label={t("support.kpis.resolved")}
              value={formatCompactNumber(locale, overview?.totals.resolvedTickets ?? "0")}
              helper={t("support.kpis.resolvedHint")}
              icon={<TicketCheck className="h-4 w-4" />}
              accentTone="indigo"
            />
            <DashboardKpiCard
              label={t("support.kpis.closed")}
              value={formatCompactNumber(locale, overview?.totals.closedTickets ?? "0")}
              helper={t("support.kpis.closedHint")}
              icon={<TicketCheck className="h-4 w-4" />}
              accentTone="indigo"
            />
            <DashboardKpiCard
              label={t("support.kpis.avgClose")}
              value={overview?.totals.avgCloseHours ? `${overview.totals.avgCloseHours}h` : t("common.na")}
              helper={t("support.kpis.avgCloseHint")}
              icon={<Timer className="h-4 w-4" />}
              accentTone="orange"
            />
          </div>

          <DashboardChartCard title={t("support.charts.trend.title")} subtitle={t("support.charts.trend.note")}>
            <AreaTrendChart
              locale={locale}
              categories={categories}
              seriesName={t("support.charts.trend.created")}
              values={createdValues}
              comparisonSeriesName={t("support.charts.trend.resolved")}
              comparisonValues={resolvedValues}
              color="#2F2FE4"
              comparisonColor="#89A4FF"
              height={300}
            />
          </DashboardChartCard>

          <article className="app-panel rounded-3xl p-5">
            <h2 className="text-sm font-semibold text-text-primary">{t("support.table.title")}</h2>
            <p className="mt-1 text-xs text-text-muted">{t("support.table.note")}</p>
            <div className="mt-4">
              <DataTable
                data={rowsQuery.data?.items ?? []}
                columns={columns}
                getRowId={(row) => row.id}
                loading={rowsQuery.isLoading}
                error={rowsQuery.isError ? t("common.error") : null}
                ariaLabel={t("support.table.title")}
                caption={t("support.table.title")}
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
