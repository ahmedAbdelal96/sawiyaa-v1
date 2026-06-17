"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Building2, CircleDollarSign, Download, HandCoins, Receipt, Scale, TrendingUp } from "lucide-react";
import { AreaTrendChart, BarTrendChart } from "@/components/charts";
import { DashboardChartCard, DashboardSectionHeader } from "@/components/dashboard";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parsePositiveIntParam } from "@/components/ui/data-table";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import InputField from "@/components/form/input/InputField";
import { parseDownloadFilename, triggerBlobDownload } from "@/lib/downloads/file-download";
import { formatMoney as formatFinanceMoney } from "@/lib/finance-format";
import { formatUtcAuditDateTime } from "@/lib/time-formatting";
import { useAdminAccountingDashboard, useDownloadAdminAccountingDashboardCsv } from "../hooks/use-admin-accounting";
import type { AccountingRecentEvent } from "../types/admin-accounting.types";

function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

function formatDateLabel(locale: string, value: string) {
  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatDateTime(locale: string, value: string) {
  return `UTC: ${formatUtcAuditDateTime(value, { locale })}`;
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

interface CustomKpiCardProps {
  label: string;
  valueObj: { value: string; currency: string; helper: string | null };
  icon: React.ReactNode;
  defaultHelper: string;
  accentClass: string;
  drilldownHref?: string;
}

const CustomKpiCard: React.FC<CustomKpiCardProps> = ({
  label,
  valueObj,
  icon,
  defaultHelper,
  accentClass,
  drilldownHref,
}) => {
  const t = useTranslations("admin-accounting");

  return (
    <article className="app-panel rounded-[24px] border border-border-light bg-surface-secondary p-5 flex flex-col justify-between h-full dark:border-white/10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-text-secondary truncate">{label}</p>
            {valueObj.currency && (
              <span className="inline-flex items-center rounded-md bg-surface-tertiary px-1.5 py-0.5 text-[10px] font-semibold text-text-muted ring-1 ring-inset ring-border-light dark:bg-white/5 dark:ring-white/10">
                {valueObj.currency}
              </span>
            )}
          </div>
          <p className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 mt-1.5">
            {valueObj.value}
          </p>
        </div>
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${accentClass}`}>
          {icon}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-2 border-t border-border-light/40 pt-3 dark:border-white/5">
        <p className="text-xs text-text-muted flex-1 min-w-0 truncate">
          {valueObj.helper || defaultHelper}
        </p>
        {drilldownHref && valueObj.value !== "—" && (
          <Link
            href={drilldownHref as never}
            className="text-xs font-semibold text-text-brand hover:underline flex items-center gap-1 shrink-0"
          >
            <span>{t("dashboard.actions.viewDetails") || "عرض التفاصيل"}</span>
            <span>&rarr;</span>
          </Link>
        )}
      </div>
    </article>
  );
};

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
  const effectiveCurrencyCode = currencyCode || "EGP";

  const dashboardQuery = useAdminAccountingDashboard({
    from: from ?? undefined,
    to: to ?? undefined,
    currencyCode: effectiveCurrencyCode,
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
      currencyCode: effectiveCurrencyCode,
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
        accessor: (row) => row.amount,
        cell: (row) =>
          formatFinanceMoney(normalizeLocale(locale), row.amount, row.currencyCode, {
            fallbackText: t("common.notAvailable"),
          }),
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

  const currencyOptions = useMemo(
    () => [
      { value: "EGP", label: "EGP — الجنيه المصري" },
      { value: "USD", label: "USD — الدولار الأمريكي" },
    ],
    [],
  );

  const limitOptions = useMemo(
    () => [
      { value: "5", label: "5" },
      { value: "8", label: "8" },
      { value: "10", label: "10" },
      { value: "12", label: "12" },
      { value: "15", label: "15" },
      { value: "20", label: "20" },
    ],
    [],
  );

  const kpiCurrency = dashboard?.kpis?.currencyCode;

  function renderKpiValue(valueStr: string | undefined) {
    if (!kpiCurrency) {
      return {
        value: "—",
        currency: "",
        helper: "لم يتم تحديد العملة من الباك اند",
      };
    }
    return {
      value: formatFinanceMoney(normalizeLocale(locale), valueStr ?? "0", kpiCurrency),
      currency: kpiCurrency,
      helper: null,
    };
  }

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[30px] p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              {t("dashboard.eyebrow") || "العمليات المالية"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-text-primary dark:text-white/95 sm:text-3xl">
              {"لوحة المالية"}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              {"نظرة عامة على العمليات المحاسبية، الحسابات الجارية، والتسويات المالية للمعالجين والمنصة."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/finance/ledger")}
            >
              {t("dashboard.actions.openLedger") || "فتح مستكشف القيود"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/finance/accounting/reconciliation")}
            >
              {t("dashboard.actions.openReconciliation") || "فتح مراجعة الحسابات المالية"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/practitioner-payouts")}
            >
              {"فتح مستحقات المعالجين"}
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
                ? (t("dashboard.actions.exporting") || "جاري التصدير...")
                : (t("dashboard.actions.exportCsv") || "تصدير CSV")}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("dashboard.filters.from")}
            </span>
            <InputField
              type="date"
              value={from ? from.slice(0, 10) : ""}
              onChange={(event) => updateQuery({ from: event.target.value || null })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("dashboard.filters.to")}
            </span>
            <InputField
              type="date"
              value={to ? to.slice(0, 10) : ""}
              onChange={(event) => updateQuery({ to: event.target.value || null })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("dashboard.filters.currency")}
            </span>
            <Select
              options={currencyOptions}
              placeholder="اختر العملة"
              defaultValue={effectiveCurrencyCode}
              onChange={(value) => updateQuery({ currencyCode: value || "EGP" })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("dashboard.filters.recentLimit")}
            </span>
            <Select
              options={limitOptions}
              placeholder="العدد"
              defaultValue={String(recentLimit)}
              onChange={(value) => updateQuery({ recentLimit: Number(value) || 8 })}
            />
          </label>
        </div>
      </section>

      {/* Currency Scope Notice */}
      <div className="rounded-[22px] border border-status-info-border bg-status-info-soft p-4 text-sm text-status-info flex items-start gap-3">
        <CircleDollarSign className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">
            {locale === "ar" ? `تنبيه العملة (${effectiveCurrencyCode})` : `Currency Scope (${effectiveCurrencyCode})`}
          </p>
          <p className="mt-1 text-xs sm:text-sm">{t("dashboard.currencyScopeNotice")}</p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <CustomKpiCard
          label={t("dashboard.kpis.grossInflow")}
          valueObj={renderKpiValue(dashboard?.kpis.grossInflow)}
          icon={<CircleDollarSign className="h-4 w-4" />}
          defaultHelper={t("dashboard.kpis.grossInflowHint")}
          accentClass="bg-primary-light text-text-brand border border-primary/20"
          drilldownHref="/admin/finance/ledger?sourceType=PAYMENT_CAPTURED"
        />
        <CustomKpiCard
          label={t("dashboard.kpis.platformRevenue")}
          valueObj={renderKpiValue(dashboard?.kpis.platformRevenue)}
          icon={<Building2 className="h-4 w-4" />}
          defaultHelper={t("dashboard.kpis.platformRevenueHint")}
          accentClass="bg-status-info-soft text-status-info border border-status-info-border"
          drilldownHref="/admin/finance/ledger"
        />
        <CustomKpiCard
          label={t("dashboard.kpis.practitionerPayable")}
          valueObj={renderKpiValue(dashboard?.kpis.practitionerPayableOutstanding)}
          icon={<HandCoins className="h-4 w-4" />}
          defaultHelper={t("dashboard.kpis.practitionerPayableHint")}
          accentClass="bg-primary-light text-text-brand border border-primary/20"
          drilldownHref="/admin/practitioner-payouts"
        />
        <CustomKpiCard
          label={t("dashboard.kpis.refunds")}
          valueObj={renderKpiValue(dashboard?.kpis.refundsTotal)}
          icon={<Receipt className="h-4 w-4" />}
          defaultHelper={t("dashboard.kpis.refundsHint")}
          accentClass="bg-status-warning-soft text-status-warning border border-status-warning-border"
          drilldownHref="/admin/finance/accounting/reconciliation?sourceType=REFUND_SUCCEEDED"
        />
        <CustomKpiCard
          label={t("dashboard.kpis.vat")}
          valueObj={renderKpiValue(dashboard?.kpis.vatTotal)}
          icon={<Scale className="h-4 w-4" />}
          defaultHelper={t("dashboard.kpis.vatHint")}
          accentClass="bg-status-info-soft text-status-info border border-status-info-border"
          drilldownHref="/admin/finance/ledger"
        />
        <CustomKpiCard
          label={t("dashboard.kpis.fees")}
          valueObj={renderKpiValue(dashboard?.kpis.feesTotal)}
          icon={<TrendingUp className="h-4 w-4" />}
          defaultHelper={t("dashboard.kpis.feesHint")}
          accentClass="bg-status-danger-soft text-status-danger border border-status-danger-border"
          drilldownHref="/admin/finance/ledger"
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
            color="#3ba89f"
            comparisonColor="#53b1fd"
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
            color="#f97066"
            comparisonColor="#fec84b"
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
            currencyCode={dashboard?.kpis?.currencyCode ?? effectiveCurrencyCode}
            color="#3ba89f"
            height={280}
          />
        </DashboardChartCard>

        <article className="app-panel rounded-3xl p-5 border border-border-light bg-surface-secondary dark:border-white/10">
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
              title: t("dashboard.states.emptyTitle") || "لا توجد بيانات",
              description: "لا توجد أحداث مالية ضمن الفلاتر الحالية",
            }}
            ariaLabel={t("dashboard.recent.title")}
            caption={t("dashboard.recent.title")}
          />
        </article>
      </section>
    </div>
  );
}
