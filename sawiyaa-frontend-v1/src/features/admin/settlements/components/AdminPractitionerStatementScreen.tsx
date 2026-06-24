"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Download, Printer, Wallet } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard, SurfaceHeader, SurfaceStatCard, SurfaceToolbar } from "@/components/shared/SurfaceShell";
import Button from "@/components/ui/button/Button";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import { parseDownloadFilename, triggerBlobDownload } from "@/lib/downloads/file-download";
import { formatUtcAuditDateTime } from "@/lib/time-formatting";
import {
  useAdminPractitionerStatement,
  useDownloadAdminPractitionerStatementCsv,
} from "../hooks/use-admin-settlements";
import { formatSettlementMoney } from "../lib/settlement-formatters";
import type {
  PractitionerStatementRow,
  PractitionerStatementRowType,
} from "../types/admin-settlements.types";

function formatIsoDate(locale: string, value: string) {
  return `UTC: ${formatUtcAuditDateTime(value, { locale })}`;
}

function formatMonthLabel(locale: string, value: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function shortId(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return value.length <= 14 ? value : `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function toStartOfDayIso(value: string | undefined) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
}

function toEndOfDayIso(value: string | undefined) {
  return value ? new Date(`${value}T23:59:59.999`).toISOString() : undefined;
}

type SummaryTone = "neutral" | "emerald" | "sky" | "amber";

function SummaryCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: SummaryTone;
  icon?: ReactNode;
}) {
  const toneMap: Record<SummaryTone, "neutral" | "brand" | "primary" | "warning"> = {
    neutral: "neutral",
    emerald: "brand",
    sky: "primary",
    amber: "warning",
  };

  return <SurfaceStatCard label={label} value={value} hint={hint} tone={toneMap[tone]} icon={icon} />;
}

export default function AdminPractitionerStatementScreen({
  practitionerId,
}: {
  practitionerId: string;
}) {
  const t = useTranslations("admin-settlements");
  const tAccounting = useTranslations("admin-accounting");
  const locale = useLocale();
  const router = useRouter();
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [rowTypeFilter, setRowTypeFilter] = useState<"ALL" | PractitionerStatementRowType>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const statementQuery = useAdminPractitionerStatement(practitionerId, {
    currencyCode: currencyFilter === "all" ? undefined : currencyFilter,
    rowType: rowTypeFilter,
    effectiveFrom: toStartOfDayIso(fromDate),
    effectiveTo: toEndOfDayIso(toDate),
  });
  const statementExportMutation = useDownloadAdminPractitionerStatementCsv();

  const statement = statementQuery.data;
  const practitioner = statement?.practitioner ?? null;

  const availableCurrencies = useMemo(() => {
    const values = new Set<string>();
    for (const row of statement?.rows ?? []) {
      values.add(row.currency);
    }
    for (const wallet of statement?.summary.walletSummaries ?? []) {
      values.add(wallet.currency);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [statement]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string, PractitionerStatementRow[]>();

    for (const row of statement?.rows ?? []) {
      const key = new Intl.DateTimeFormat(locale, {
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(row.effectiveAt));
      const bucket = groups.get(key) ?? [];
      bucket.push(row);
      groups.set(key, bucket);
    }

    return Array.from(groups.entries()).map(([monthKey, rows]) => ({
      monthKey,
      monthLabel: formatMonthLabel(locale, rows[0]?.effectiveAt ?? new Date().toISOString()),
      rows,
    }));
  }, [locale, statement]);

  const summaryCurrency =
    currencyFilter !== "all"
      ? currencyFilter
      : statement?.summary.currencySummaries.length === 1
        ? statement.summary.currencySummaries[0]?.currency ?? null
        : null;

  const canShowMoneyTotals = Boolean(summaryCurrency);
  const activeFilterLabel = [
    currencyFilter === "all" ? t("statement.filters.allCurrencies") : currencyFilter,
    t(`statement.filters.rowTypeOptions.${rowTypeFilter === "ALL" ? "all" : rowTypeFilter.toLowerCase()}`),
    fromDate || t("statement.filters.from"),
    toDate || t("statement.filters.to"),
  ].join(" | ");
  useEffect(() => {
    if (!practitioner) {
      return;
    }

    const previous = document.title;
    document.title = `${t("statement.printTitle")} - ${
      practitioner.displayName ?? practitioner.publicSlug ?? practitioner.id
    }`;

    return () => {
      document.title = previous;
    };
  }, [practitioner, t]);

  const handleExportStatementCsv = async () => {
    const exported = await statementExportMutation.mutateAsync({
      practitionerId,
      params: {
        currencyCode: currencyFilter === "all" ? undefined : currencyFilter,
        rowType: rowTypeFilter,
        effectiveFrom: toStartOfDayIso(fromDate),
        effectiveTo: toEndOfDayIso(toDate),
      },
    });
    const fileName = parseDownloadFilename(
      exported.fileNameHeader,
      "practitioner-statement-package.csv",
    );
    triggerBlobDownload(exported.blob, fileName);
  };

  return (
    <div className="space-y-6">
      <SurfaceCard as="section" variant="page" className="overflow-hidden print:rounded-none print:border-0 print:bg-white print:p-0">

        <SurfaceHeader
          className="print:hidden"
          eyebrow={t("statement.eyebrow")}
          title={t("statement.title")}
          description={t("statement.note")}
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                startIcon={<DirectionalArrowIcon direction="back" className="h-4 w-4" />}
                onClick={() => router.push(`/${locale}/admin/settlements/dues`)}
              >
                {t("statement.back")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(
                    `/${locale}/admin/finance/ledger?practitionerId=${practitionerId}`,
                  )
                }
              >
                {tAccounting("dashboard.actions.openLedger")}
              </Button>
              <Button
                type="button"
                size="sm"
                startIcon={<Printer className="h-4 w-4" />}
                onClick={() => window.print()}
              >
                {t("statement.exportPdf")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                startIcon={<Download className="h-4 w-4" />}
                onClick={handleExportStatementCsv}
                disabled={statementExportMutation.isPending}
              >
                {statementExportMutation.isPending
                  ? t("statement.exportCsvLoading")
                  : t("statement.exportCsv")}
              </Button>
            </>
          }
        />

        <SurfaceToolbar className="mt-5 print:border-0 print:bg-transparent print:p-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("statement.summaryLabel")}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-text-primary dark:text-white/95 print:text-black">
                {practitioner?.displayName ?? practitioner?.publicSlug ?? practitionerId}
              </h2>
              <p className="mt-1 text-sm text-text-secondary print:text-black/70">
                {[practitioner?.professionalTitle, practitioner?.countryCode, practitioner?.publicSlug]
                  .filter(Boolean)
                  .join(" | ")}
              </p>
            </div>
            <div className="rounded-[20px] border border-border-light bg-white px-4 py-3 text-sm text-text-secondary shadow-sm dark:border-white/8 dark:bg-white/[0.03] print:border-0 print:bg-transparent print:px-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("statement.coverage")}
              </p>
              <p className="mt-2 font-semibold text-text-primary dark:text-white/95 print:text-black">
                {statement?.summary.firstActivityAt
                  ? formatIsoDate(locale, statement.summary.firstActivityAt)
                  : t("statement.fromStart")}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {statement?.summary.lastActivityAt
                  ? formatIsoDate(locale, statement.summary.lastActivityAt)
                  : t("statement.noRows")}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label={t("statement.metrics.rows")}
              value={t("statement.metrics.rowsValue", { value: statement?.summary.rowCount ?? 0 })}
              hint={t("statement.metrics.rowsHint")}
              tone="neutral"
              icon={<CalendarDays className="h-4 w-4" />}
            />
            <SummaryCard
              label={t("statement.metrics.earned")}
              value={
                canShowMoneyTotals
                  ? formatSettlementMoney(
                      locale,
                      statement?.summary.earningTotal ?? "0.00",
                      summaryCurrency as string,
                    )
                  : t("statement.multicurrencyValue")
              }
              hint={canShowMoneyTotals ? t("statement.metrics.earnedHint") : t("statement.multicurrencyHint")}
              tone="emerald"
              icon={<ArrowUpRight className="h-4 w-4" />}
            />
            <SummaryCard
              label={t("statement.metrics.paid")}
              value={
                canShowMoneyTotals
                  ? formatSettlementMoney(
                      locale,
                      statement?.summary.payoutTotal ?? "0.00",
                      summaryCurrency as string,
                    )
                  : t("statement.multicurrencyValue")
              }
              hint={canShowMoneyTotals ? t("statement.metrics.paidHint") : t("statement.multicurrencyHint")}
              tone="sky"
              icon={<ArrowDownRight className="h-4 w-4" />}
            />
            <SummaryCard
              label={t("statement.metrics.net")}
              value={
                canShowMoneyTotals
                  ? formatSettlementMoney(
                      locale,
                      statement?.summary.netTotal ?? "0.00",
                      summaryCurrency as string,
                    )
                  : t("statement.multicurrencyValue")
              }
              hint={canShowMoneyTotals ? t("statement.metrics.netHint") : t("statement.multicurrencyHint")}
              tone="amber"
              icon={<Wallet className="h-4 w-4" />}
            />
          </div>
        </SurfaceToolbar>

        <SurfaceToolbar className="mt-4 text-sm text-text-secondary print:border-0 print:bg-transparent print:p-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("statement.walletLabel")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(statement?.summary.walletSummaries ?? []).map((wallet) => (
                  <span
                    key={wallet.currency}
                    className="rounded-full border border-border-light bg-white px-3 py-1 text-xs font-medium text-text-secondary dark:border-white/8 dark:bg-surface-secondary/40 print:border-0 print:bg-transparent"
                  >
                    {wallet.currency}: {formatSettlementMoney(locale, wallet.availableBalance, wallet.currency)}
                  </span>
                ))}
              </div>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:bg-primary/15 dark:text-primary-foreground print:bg-transparent print:px-0">
              {activeFilterLabel}
            </span>
          </div>
        </SurfaceToolbar>

        <SurfaceToolbar className="mt-4 text-sm text-text-secondary print:border-0 print:bg-transparent print:p-0">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_0.75fr_0.75fr]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("statement.filters.currency")}
              </span>
              <select
                value={currencyFilter}
                onChange={(event) => setCurrencyFilter(event.target.value)}
                className="app-control w-full py-3"
              >
                <option value="all">{t("statement.filters.allCurrencies")}</option>
                {availableCurrencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("statement.filters.rowType")}
              </span>
              <select
                value={rowTypeFilter}
                onChange={(event) =>
                  setRowTypeFilter(event.target.value as "ALL" | PractitionerStatementRowType)
                }
                className="app-control w-full py-3"
              >
                <option value="ALL">{t("statement.filters.rowTypeOptions.all")}</option>
                <option value="EARNING">{t("statement.filters.rowTypeOptions.earning")}</option>
                <option value="PAYOUT">{t("statement.filters.rowTypeOptions.payout")}</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("statement.filters.from")}
              </span>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="app-control w-full py-3"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("statement.filters.to")}
              </span>
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="app-control w-full py-3"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-text-muted">{t("statement.filterNote")}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              startIcon={<CalendarDays className="h-4 w-4" />}
              onClick={() => {
                setCurrencyFilter("all");
                setRowTypeFilter("ALL");
                setFromDate("");
                setToDate("");
              }}
            >
              {t("statement.clearFilters")}
            </Button>
          </div>
        </SurfaceToolbar>

        {statementQuery.isLoading ? (
          <div className="mt-5">
            <ListStateSkeleton items={3} heightClass="h-20" />
          </div>
        ) : statementQuery.isError ? (
          <div className="mt-5">
            <StateCard
              icon={<Wallet className="h-5 w-5 text-primary" />}
              title={t("statement.errorHeading")}
              note={t("statement.errorNote")}
              action={{
                label: t("statement.retry"),
                onClick: () => statementQuery.refetch(),
              }}
              className="rounded-[28px]"
            />
          </div>
        ) : practitioner ? (
          <div className="mt-5 space-y-4">
            {groupedRows.length ? (
              groupedRows.map((group) => (
                <SurfaceCard
                  as="section"
                  key={group.monthKey}
                  variant="compact"
                  className="print:border-0 print:bg-transparent print:p-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-text-primary dark:text-white/95 print:text-black">
                      {group.monthLabel}
                    </h3>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 print:bg-transparent print:px-0">
                      {t("statement.rowsCount", { value: group.rows.length })}
                    </span>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-[18px] border border-border-light dark:border-white/8">
                    <table className="min-w-full divide-y divide-border-light dark:divide-white/8">
                      <thead className="bg-surface-secondary/80 dark:bg-white/[0.03]">
                        <tr>
                          <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                            {t("statement.columns.date")}
                          </th>
                          <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                            {t("statement.columns.type")}
                          </th>
                          <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                            {t("statement.columns.reference")}
                          </th>
                          <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                            {t("statement.columns.notes")}
                          </th>
                          <th className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                            {t("statement.columns.amount")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-light bg-surface dark:divide-white/8 dark:bg-surface-secondary/30">
                        {group.rows.map((row) => {
                          const isEarning = row.rowType === "EARNING";
                          const referenceValue = isEarning
                            ? [row.paymentId, row.sessionId]
                                .filter(Boolean)
                                .map((value) => shortId(value))
                                .join(" / ")
                            : [row.externalReference, row.settlementId]
                                .filter(Boolean)
                                .map((value) => shortId(value))
                                .join(" / ");

                          return (
                            <tr key={row.id} className="align-top transition-colors hover:bg-primary/3 dark:hover:bg-white/[0.03]">
                              <td className="px-4 py-4 text-sm text-text-secondary">
                                <p className="font-medium text-text-primary dark:text-white/95">
                                  {formatIsoDate(locale, row.effectiveAt)}
                                </p>
                                <p className="mt-1 text-xs text-text-muted">
                                  {formatMonthLabel(locale, row.effectiveAt)}
                                </p>
                              </td>
                              <td className="px-4 py-4 text-sm">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                    isEarning
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                      : "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-foreground"
                                  }`}
                                >
                                  {isEarning
                                    ? t("statement.rowTypes.earning")
                                    : t("statement.rowTypes.payout")}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-text-secondary">
                                <p className="font-medium text-text-primary dark:text-white/95">
                                  {row.description ?? t("statement.noDescription")}
                                </p>
                                <p className="mt-1 font-mono text-xs text-text-muted">
                                  {referenceValue || t("statement.noReference")}
                                </p>
                              </td>
                              <td className="px-4 py-4 text-sm text-text-secondary">
                                {row.notes ? (
                                  <p className="leading-6">{row.notes}</p>
                                ) : (
                                  <span className="text-text-muted">{t("statement.noNotes")}</span>
                                )}
                                {row.processedByDisplayName ? (
                                  <p className="mt-1 text-xs text-text-muted">
                                    {t("statement.processedBy", {
                                      name: row.processedByDisplayName,
                                    })}
                                  </p>
                                ) : null}
                              </td>
                              <td className="px-4 py-4 text-end text-sm font-semibold">
                                <div
                                  className={`inline-flex flex-col items-end rounded-[16px] px-3 py-2 ${
                                    isEarning
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                      : "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light"
                                  }`}
                                >
                                  <span className="tabular-nums">
                                    {isEarning ? "+" : "-"}
                                    {formatSettlementMoney(locale, row.amount, row.currency)}
                                  </span>
                                  <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] opacity-75">
                                    {row.currency}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </SurfaceCard>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-border-light bg-surface-secondary/50 p-5 text-sm text-text-secondary dark:border-white/10 dark:bg-white/[0.02]">
                <p className="font-semibold text-text-primary dark:text-white/95">
                  {t("statement.noRowsTitle")}
                </p>
                <p className="mt-2 leading-6">{t("statement.noRowsNote")}</p>
              </div>
            )}
          </div>
        ) : (
          <StateCard
            icon={<Wallet className="h-5 w-5 text-primary" />}
            title={t("statement.noSelectionTitle")}
            note={t("statement.noSelectionNote")}
            className="mt-5 rounded-[28px]"
          />
        )}
      </SurfaceCard>
    </div>
  );
}
