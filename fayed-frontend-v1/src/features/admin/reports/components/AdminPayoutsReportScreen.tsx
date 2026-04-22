"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, HandCoins, ShieldAlert, Wallet } from "lucide-react";
import { AreaTrendChart } from "@/components/charts";
import { DashboardChartCard, DashboardKpiCard } from "@/components/dashboard";
import { DataTable, buildUpdatedSearchParams, parsePositiveIntParam } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { formatCompactNumber, formatDateLabel, formatDateTime, formatMoney } from "../utils/report-format";
import { usePayoutsReportOverview, usePayoutsReportRows } from "../hooks/use-admin-reports";
import type { PayoutsReportRow } from "../types/admin-reports.types";

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
  const currencyCode = searchParams.get("currencyCode")?.trim() || "";
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
        id: "practitionerId",
        header: t("payouts.table.practitionerId"),
        accessor: (row) => row.practitionerId,
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

  return (
    <div className="space-y-6">
      <section className="app-page-hero px-6 py-6">
        <div className="mx-auto w-full max-w-[1120px]">
          <h1 className="text-2xl font-semibold text-text-primary">{t("payouts.title")}</h1>
          <p className="mt-2 max-w-[78ch] text-sm text-text-muted">{t("payouts.subtitle")}</p>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
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
              label={t("payouts.kpis.paidAmount")}
              value={formatMoney(locale, overview?.totals.paidAmountInRange ?? "0", overview?.currencyCode)}
              helper={t("payouts.kpis.paidAmountHint")}
              icon={<HandCoins className="h-4 w-4" />}
              accentTone="teal"
            />
            <DashboardKpiCard
              label={t("payouts.kpis.payoutCount")}
              value={formatCompactNumber(locale, overview?.totals.payoutCountInRange ?? "0")}
              helper={t("payouts.kpis.payoutCountHint")}
              icon={<CheckCircle2 className="h-4 w-4" />}
              accentTone="sky"
            />
            <DashboardKpiCard
              label={t("payouts.kpis.missingProof")}
              value={formatCompactNumber(locale, overview?.totals.missingProofCountInRange ?? "0")}
              helper={t("payouts.kpis.missingProofHint")}
              icon={<ShieldAlert className="h-4 w-4" />}
              accentTone="orange"
            />
            <DashboardKpiCard
              label={t("payouts.kpis.transferFees")}
              value={formatMoney(locale, overview?.totals.transferFeesInRange ?? "0", overview?.currencyCode)}
              helper={t("payouts.kpis.transferFeesHint")}
              icon={<Wallet className="h-4 w-4" />}
              accentTone="indigo"
            />
            <DashboardKpiCard
              label={t("payouts.kpis.dueOutstanding")}
              value={formatMoney(locale, overview?.totals.dueOutstandingAsOfTo ?? "0", overview?.currencyCode)}
              helper={t("payouts.kpis.dueOutstandingHint")}
              icon={<HandCoins className="h-4 w-4" />}
              accentTone="orange"
            />
            <DashboardKpiCard
              label={t("payouts.kpis.settlementsWithDue")}
              value={formatCompactNumber(locale, overview?.totals.settlementsWithDueCount ?? "0")}
              helper={t("payouts.kpis.settlementsWithDueHint")}
              icon={<Wallet className="h-4 w-4" />}
              accentTone="indigo"
            />
          </div>

          <DashboardChartCard title={t("payouts.charts.trend.title")} subtitle={t("payouts.charts.trend.note")}>
            <AreaTrendChart
              locale={locale}
              categories={categories}
              seriesName={t("payouts.charts.trend.series")}
              values={payoutAmountValues}
              height={300}
              color="#3D9286"
            />
          </DashboardChartCard>

          <article className="app-panel rounded-3xl p-5">
            <h2 className="text-sm font-semibold text-text-primary">{t("payouts.table.title")}</h2>
            <p className="mt-1 text-xs text-text-muted">{t("payouts.table.note")}</p>
            <div className="mt-4">
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
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
