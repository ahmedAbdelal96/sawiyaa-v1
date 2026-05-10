"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgeDollarSign, Receipt, WalletCards } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import {
  SurfaceActionLink,
} from "@/components/shared/SurfaceShell";
import AdminOperationalListShell, {
  AdminSummaryCard,
} from "@/components/shared/admin/AdminOperationalListShell";
import { Link } from "@/i18n/navigation";
import { formatSettlementDateTime, formatSettlementMoney } from "@/features/admin/settlements/lib/settlement-formatters";
import {
  useAdminPractitionerManualPayoutHistory,
} from "../hooks/use-admin-practitioner-payouts";
import type { AdminPractitionerManualPayout } from "../types/admin-practitioner-payouts.types";
import AdminPractitionerPayoutHistoryDetailDrawer from "./AdminPractitionerPayoutHistoryDetailDrawer";

const PAGE_SIZE = DEFAULT_PAGE_LIMIT;

function parseAmount(value: string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function AdminPractitionerPayoutHistoryScreen() {
  const t = useTranslations("admin-practitioner-payouts");
  const locale = useLocale();

  const [currencyFilter, setCurrencyFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);
  const [selectedPayout, setSelectedPayout] = useState<AdminPractitionerManualPayout | null>(null);
  const deferredCurrency = useDeferredValue(currencyFilter);

  const historyQuery = useAdminPractitionerManualPayoutHistory({
    page,
    limit,
    currency: deferredCurrency || undefined,
  });

  const items = historyQuery.data?.items ?? [];
  const pagination = historyQuery.data?.pagination;
  const summaryMetrics = useMemo(() => {
    return items.reduce(
      (accumulator, item) => {
        const amount = parseAmount(item.amountPaid);
        if (item.currencyCode === "EGP") {
          accumulator.egpTotal += amount;
          accumulator.egpCount += 1;
        }
        if (item.currencyCode === "USD") {
          accumulator.usdTotal += amount;
          accumulator.usdCount += 1;
        }
        return accumulator;
      },
      { egpTotal: 0, usdTotal: 0, egpCount: 0, usdCount: 0 },
    );
  }, [items]);

  const activeFilterChips = [
    currencyFilter
      ? { id: "currency", label: t(`currencies.${currencyFilter}` as Parameters<typeof t>[0]) }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string }>;

  const columns = useMemo<ColumnDef<AdminPractitionerManualPayout>[]>(() => [
    {
      id: "practitioner",
      header: t("history.columns.practitioner"),
      cell: (item) => (
        <div className="space-y-1">
          <Link
            href={`/admin/practitioner-payouts/${item.practitionerId}`}
            className="font-semibold text-text-primary transition hover:text-primary dark:text-white/95"
          >
            {item.practitionerName ?? item.practitionerId}
          </Link>
          <p className="text-xs text-text-secondary">{item.practitionerId}</p>
        </div>
      ),
    },
    {
      id: "currency",
      header: t("history.columns.currency"),
      cell: (item) => t(`currencies.${item.currencyCode}` as Parameters<typeof t>[0]),
    },
    {
      id: "amount",
      header: t("history.columns.amount"),
      cell: (item) => (
        <span className="font-semibold text-text-primary dark:text-white/95">
          {formatSettlementMoney(locale, item.amountPaid, item.currencyCode)}
        </span>
      ),
    },
    {
      id: "paidAt",
      header: t("history.columns.paidAt"),
      cell: (item) => formatSettlementDateTime(locale, item.paidAt),
    },
    {
      id: "reference",
      header: t("history.columns.reference"),
      cell: (item) => item.transferReference ?? "-",
    },
    {
      id: "notes",
      header: t("history.columns.notes"),
      cell: (item) => item.notes ?? "-",
      hideBelow: "xl",
    },
    {
      id: "recordedBy",
      header: t("history.columns.recordedBy"),
      cell: (item) => item.recordedByDisplayName ?? item.recordedByUserId ?? "-",
      hideBelow: "xl",
    },
  ], [locale, t]);

  return (
    <>
      <AdminOperationalListShell
        eyebrow={t("history.eyebrow")}
        title={t("history.title")}
        description={t("history.description")}
        actions={
          <SurfaceActionLink href="/admin/practitioner-payouts">
            {t("history.backToList")}
          </SurfaceActionLink>
        }
        notice={
          <section className="app-panel-soft rounded-[26px] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {pagination ? t("history.results", { count: pagination.totalItems }) : t("history.loading")}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95">
                  {formatSettlementMoney(locale, summaryMetrics.egpTotal, "EGP")}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {formatSettlementMoney(locale, summaryMetrics.usdTotal, "USD")}
                </p>
              </div>

              <div className="max-w-full sm:max-w-[30rem]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {activeFilterChips.length > 0 ? t("history.filters.currencyLabel") : t("history.description")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeFilterChips.length > 0 ? (
                    activeFilterChips.map((chip) => (
                      <span
                        key={chip.id}
                        className="app-chip rounded-full px-3 py-1.5 text-xs text-text-secondary dark:text-white/80"
                      >
                        {chip.label}
                      </span>
                    ))
                  ) : (
                    <span className="app-chip rounded-full px-3 py-1.5 text-xs text-text-secondary dark:text-white/80">
                      {t("history.filters.allCurrencies")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        }
        summaryCards={
          <>
            <AdminSummaryCard
              label={t("history.results", { count: pagination?.totalItems ?? 0 })}
              value={pagination?.totalItems ?? 0}
              hint={t("history.title")}
              tone="primary"
              icon={<Receipt className="h-4 w-4" />}
            />
            <AdminSummaryCard
              label={t("currencies.EGP")}
              value={formatSettlementMoney(locale, summaryMetrics.egpTotal, "EGP")}
              hint={`${summaryMetrics.egpCount} ${t("history.columns.currency")}`}
              tone="success"
              icon={<WalletCards className="h-4 w-4" />}
            />
            <AdminSummaryCard
              label={t("currencies.USD")}
              value={formatSettlementMoney(locale, summaryMetrics.usdTotal, "USD")}
              hint={`${summaryMetrics.usdCount} ${t("history.columns.currency")}`}
              tone="neutral"
              icon={<BadgeDollarSign className="h-4 w-4" />}
            />
          </>
        }
        filters={
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("history.filters.currencyLabel")}
              </span>
              <select
                value={currencyFilter}
                onChange={(event) => {
                  setCurrencyFilter(event.target.value);
                  setPage(1);
                }}
                className="app-control w-56 px-4 py-3"
              >
                <option value="">{t("history.filters.allCurrencies")}</option>
                <option value="EGP">{t("currencies.EGP")}</option>
                <option value="USD">{t("currencies.USD")}</option>
              </select>
            </label>

            {currencyFilter ? (
              <button
                type="button"
                onClick={() => {
                  setCurrencyFilter("");
                  setPage(1);
                }}
                className="rounded-full border border-border-light px-3 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-tertiary dark:bg-white/5"
              >
                {t("history.filters.allCurrencies")}
              </button>
            ) : null}
          </div>
        }
      >
          <DataTable
            data={items}
            columns={columns}
            getRowId={(row) => row.id}
            loading={historyQuery.isLoading}
            loadingRows={PAGE_SIZE}
            emptyState={{
              title: t("history.emptyTitle"),
              description: t("history.emptyDescription"),
            }}
            pagination={
              pagination
                ? {
                    page: pagination.page,
                    limit: pagination.limit,
                    totalItems: pagination.totalItems,
                    totalPages: pagination.totalPages,
                  }
                : undefined
            }
            onPageChange={(nextPage) => setPage(nextPage)}
            onPageSizeChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
            pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
            rowActions={(item) => (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedPayout(item)}>
                  {t("history.actions.viewDetails")}
                </Button>
              </div>
            )}
            rowActionsHeader={t("history.columns.actions")}
          />
      </AdminOperationalListShell>

      <AdminPractitionerPayoutHistoryDetailDrawer
        isOpen={Boolean(selectedPayout)}
        payout={selectedPayout}
        onClose={() => setSelectedPayout(null)}
      />
    </>
  );
}
