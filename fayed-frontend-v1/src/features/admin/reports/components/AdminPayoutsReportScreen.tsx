"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, HandCoins, ShieldAlert, Wallet } from "lucide-react";
import { AreaTrendChart } from "@/components/charts";
import { DataTable, buildUpdatedSearchParams, parsePositiveIntParam } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { formatCompactNumber, formatDateLabel, formatDateTime, formatMoney } from "../utils/report-format";
import { usePayoutsReportOverview, usePayoutsReportRows } from "../hooks/use-admin-reports";
import type { PayoutsReportRow } from "../types/admin-reports.types";
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

export default function AdminPayoutsReportScreen() {
  const t = useTranslations("admin-reports");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const from = parseIsoDateOnly(searchParams.get("from"));
  const to = parseIsoDateOnly(searchParams.get("to"));
  const currencyCode = searchParams.get("currencyCode")?.trim() || "EGP";
  const practitionerId = searchParams.get("practitionerId")?.trim() || "";
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1, max: 10_000 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), 10, { min: 1, max: 50 });

  const updateQuery = (patch: Record<string, string | number | null>) => {
    const next = buildUpdatedSearchParams(searchParams, patch);
    router.push(`${pathname}?${next}` as never);
  };

  const overviewQuery = usePayoutsReportOverview({
    from,
    to,
    currencyCode: currencyCode || null,
    practitionerId: practitionerId || null,
  });
  const rowsQuery = usePayoutsReportRows({
    from,
    to,
    currencyCode: currencyCode || null,
    practitionerId: practitionerId || null,
    page,
    limit,
  });

  const overview = overviewQuery.data;
  const trend = overview?.trend ?? [];
  const categories = trend.map((point) => formatDateLabel(locale, point.date));
  const payoutAmountValues = trend.map((point) => Number(point.payoutAmount || "0"));

  const columns: ColumnDef<PayoutsReportRow>[] = useMemo(
    () => [
      {
        id: "effectiveAt",
        header: t("payouts.table.effectiveAt"),
        accessor: (row) => row.effectiveAt,
        cell: (_row, value) => formatDateTime(locale, String(value)),
      },
      {
        id: "practitionerName",
        header: t("payouts.table.practitionerName"),
        accessor: (row) => row.practitionerName ?? t("common.na"),
      },
      {
        id: "amountPaid",
        header: t("payouts.table.amountPaid"),
        accessor: (row) => row.amountPaid,
        cell: (row) => formatMoney(locale, row.amountPaid, row.currencyCode),
      },
      {
        id: "payoutMethod",
        header: t("payouts.table.payoutMethod"),
        accessor: (row) => row.payoutMethod,
      },
      {
        id: "proofUploaded",
        header: t("payouts.table.proof"),
        accessor: (row) => row.proofUploaded,
        cell: (row) => (row.proofUploaded ? t("common.yes") : t("common.no")),
      },
      {
        id: "externalPayoutRef",
        header: t("payouts.table.externalRef"),
        accessor: (row) => row.externalPayoutRef,
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

      <ReportFilterLabel label={t("filters.currency")}>
        <input
          className="w-16 rounded-lg border border-border-light bg-surface-secondary px-2.5 py-1.5 text-xs uppercase text-text-brand shadow-theme-xs outline-hidden focus:border-border-focus focus:ring-2 focus:ring-primary/10"
          placeholder={t("filters.currencyPlaceholder")}
          value={currencyCode}
          onChange={(event) => updateQuery({ page: 1, currencyCode: event.target.value || null })}
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
        title={t("payouts.title")}
        subtitle={t("payouts.subtitle")}
        filters={filters}
      />

      <section className="px-6">
        <div className="mx-auto w-full max-w-[1120px] space-y-4">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <ReportKpiCard
              label={t("payouts.kpis.paidAmount")}
              value={formatMoney(locale, overview?.totals.paidAmountInRange ?? "0", overview?.currencyCode)}
              helper={t("payouts.kpis.paidAmountHint")}
              icon={<HandCoins className="h-4 w-4" />}
              accentTone="teal"
            />
            <ReportKpiCard
              label={t("payouts.kpis.payoutCount")}
              value={formatCompactNumber(locale, overview?.totals.payoutCountInRange ?? "0")}
              helper={t("payouts.kpis.payoutCountHint")}
              icon={<CheckCircle2 className="h-4 w-4" />}
              accentTone="sky"
            />
            <ReportKpiCard
              label={t("payouts.kpis.missingProof")}
              value={formatCompactNumber(locale, overview?.totals.missingProofCountInRange ?? "0")}
              helper={t("payouts.kpis.missingProofHint")}
              icon={<ShieldAlert className="h-4 w-4" />}
              accentTone="orange"
            />
            <ReportKpiCard
              label={t("payouts.kpis.transferFees")}
              value={formatMoney(locale, overview?.totals.transferFeesInRange ?? "0", overview?.currencyCode)}
              helper={t("payouts.kpis.transferFeesHint")}
              icon={<Wallet className="h-4 w-4" />}
              accentTone="indigo"
            />
            <ReportKpiCard
              label={t("payouts.kpis.dueOutstanding")}
              value={formatMoney(locale, overview?.totals.dueOutstandingAsOfTo ?? "0", overview?.currencyCode)}
              helper={t("payouts.kpis.dueOutstandingHint")}
              icon={<HandCoins className="h-4 w-4" />}
              accentTone="orange"
            />
            <ReportKpiCard
              label={t("payouts.kpis.settlementsWithDue")}
              value={formatCompactNumber(locale, overview?.totals.settlementsWithDueCount ?? "0")}
              helper={t("payouts.kpis.settlementsWithDueHint")}
              icon={<Wallet className="h-4 w-4" />}
              accentTone="indigo"
            />
          </div>

          <ReportChartCard title={t("payouts.charts.trend.title")} subtitle={t("payouts.charts.trend.note")}>
            <AreaTrendChart
              locale={locale}
              categories={categories}
              seriesName={t("payouts.charts.trend.series")}
              values={payoutAmountValues}
              height={220}
              color="#3D9286"
            />
          </ReportChartCard>

          <ReportTableCard title={t("payouts.table.title")} subtitle={t("payouts.table.note")}>
            <DataTable
              data={rowsQuery.data?.items ?? []}
              columns={columns}
              getRowId={(row) => row.payoutId}
              loading={rowsQuery.isLoading}
              error={rowsQuery.isError ? t("common.error") : null}
              ariaLabel={t("payouts.table.title")}
              caption={t("payouts.table.title")}
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
