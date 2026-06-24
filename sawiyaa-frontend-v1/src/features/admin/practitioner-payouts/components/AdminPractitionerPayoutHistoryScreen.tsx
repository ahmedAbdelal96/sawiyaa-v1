"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgeDollarSign, CalendarClock, Receipt, Search, WalletCards } from "lucide-react";
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
import type { SettlementPayoutMethod } from "@/features/admin/settlements/types/admin-settlements.types";
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
  const [practitionerFilter, setPractitionerFilter] = useState("");
  const [payoutMethodFilter, setPayoutMethodFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);
  const [selectedPayout, setSelectedPayout] = useState<AdminPractitionerManualPayout | null>(null);
  const deferredPractitioner = useDeferredValue(practitionerFilter);
  const deferredCurrency = useDeferredValue(currencyFilter);
  const deferredMethod = useDeferredValue(payoutMethodFilter);

  const historyQuery = useAdminPractitionerManualPayoutHistory({
    page,
    limit,
    currency: deferredCurrency || undefined,
    practitionerId: deferredPractitioner.trim() || undefined,
    payoutMethod: deferredMethod ? (deferredMethod as SettlementPayoutMethod) : undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
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
    practitionerFilter ? { id: "practitioner", label: practitionerFilter } : null,
    payoutMethodFilter
      ? { id: "method", label: t(`paymentMethods.${payoutMethodFilter}` as Parameters<typeof t>[0]) }
      : null,
    createdFrom ? { id: "from", label: `${t("history.filters.from")}: ${createdFrom}` } : null,
    createdTo ? { id: "to", label: `${t("history.filters.to")}: ${createdTo}` } : null,
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
          <div className="flex flex-wrap items-center gap-2">
            <SurfaceActionLink href="/admin/practitioner-payouts">
              {t("history.backToList")}
            </SurfaceActionLink>
            <SurfaceActionLink href="/admin/finance/accounting/reconciliation">
              {t("history.actions.reconciliation")}
            </SurfaceActionLink>
          </div>
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
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("history.filters.practitionerLabel")}
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    value={practitionerFilter}
                    onChange={(event) => {
                      setPractitionerFilter(event.target.value);
                      setPage(1);
                    }}
                    placeholder={t("history.filters.practitionerPlaceholder")}
                    className="app-control w-full py-3 ps-11 pe-4"
                  />
                </div>
              </label>

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
                  className="app-control w-full px-4 py-3"
                >
                  <option value="">{t("history.filters.allCurrencies")}</option>
                  <option value="EGP">{t("currencies.EGP")}</option>
                  <option value="USD">{t("currencies.USD")}</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("history.filters.methodLabel")}
                </span>
                <select
                  value={payoutMethodFilter}
                  onChange={(event) => {
                    setPayoutMethodFilter(event.target.value);
                    setPage(1);
                  }}
                  className="app-control w-full px-4 py-3"
                >
                  <option value="">{t("history.filters.allMethods")}</option>
                  <option value="MANUAL_BANK_TRANSFER">{t("paymentMethods.MANUAL_BANK_TRANSFER")}</option>
                  <option value="WALLET_TRANSFER">{t("paymentMethods.WALLET_TRANSFER")}</option>
                  <option value="CASH">{t("paymentMethods.CASH")}</option>
                  <option value="OTHER">{t("paymentMethods.OTHER")}</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("history.filters.from")}
                  </span>
                  <div className="relative">
                    <CalendarClock className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                      type="date"
                      value={createdFrom}
                      onChange={(event) => {
                        setCreatedFrom(event.target.value);
                        setPage(1);
                      }}
                      className="app-control w-full py-3 ps-11 pe-4"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {t("history.filters.to")}
                  </span>
                  <div className="relative">
                    <CalendarClock className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                      type="date"
                      value={createdTo}
                      onChange={(event) => {
                        setCreatedTo(event.target.value);
                        setPage(1);
                      }}
                      className="app-control w-full py-3 ps-11 pe-4"
                    />
                  </div>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeFilterChips.map((chip) => (
                <span
                  key={chip.id}
                  className="inline-flex items-center rounded-full border border-primary/15 bg-primary-light/20 px-3 py-1 text-xs font-semibold text-primary dark:border-primary/20 dark:bg-primary/10"
                >
                  {chip.label}
                </span>
              ))}
              {activeFilterChips.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setCurrencyFilter("");
                    setPractitionerFilter("");
                    setPayoutMethodFilter("");
                    setCreatedFrom("");
                    setCreatedTo("");
                    setPage(1);
                  }}
                  className="rounded-full border border-border-light px-3 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-tertiary dark:bg-white/5"
                >
                  {t("history.filters.clear")}
                </button>
              ) : null}
            </div>
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
