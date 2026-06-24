"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BadgeDollarSign, FileText, Layers, ReceiptText } from "lucide-react";
import AdminOperationalListShell, {
  AdminSummaryCard,
} from "@/components/shared/admin/AdminOperationalListShell";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import DataTableActionButton from "@/components/ui/data-table/DataTableActionButton";
import Button from "@/components/ui/button/Button";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useAdminSettlementBatches } from "../hooks/use-admin-settlements";
import type {
  ListSettlementBatchesParams,
  SettlementBatchListItem,
  SettlementBatchStatus,
} from "../types/admin-settlements.types";
import { formatSettlementDateTime, formatSettlementMoney } from "../lib/settlement-formatters";
import AdminSettlementGenerateDrawer from "./AdminSettlementGenerateDrawer";

type CurrencyFilter = "all" | string;

export default function AdminSettlementBatchesScreen() {
  const t = useTranslations("admin-settlements");
  const tAccounting = useTranslations("admin-accounting");
  const locale = useLocale();
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);
  const [status, setStatus] = useState<SettlementBatchStatus | "ALL">("ALL");
  const [currency, setCurrency] = useState<CurrencyFilter>("all");
  const [periodYear, setPeriodYear] = useState("");
  const [periodMonth, setPeriodMonth] = useState("");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const params = useMemo<ListSettlementBatchesParams>(() => {
    const next: ListSettlementBatchesParams = { page, limit };
    if (status !== "ALL") next.status = status;
    if (currency !== "all") next.currencyCode = currency;
    const parsedYear = Number.parseInt(periodYear, 10);
    if (Number.isFinite(parsedYear) && parsedYear > 0) next.periodYear = parsedYear;
    const parsedMonth = Number.parseInt(periodMonth, 10);
    if (Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) next.periodMonth = parsedMonth;
    return next;
  }, [currency, limit, page, periodMonth, periodYear, status]);

  const batchesQuery = useAdminSettlementBatches(params);
  const data = batchesQuery.data;
  const rows = useMemo(() => data?.items ?? [], [data]);

  const currencies = useMemo(() => {
    const values = new Set<string>();
    rows.forEach((row) => values.add(row.currency));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const columns = useMemo<ColumnDef<SettlementBatchListItem>[]>(
    () => [
      {
        id: "period",
        header: t("list.columns.period"),
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
              {String(row.periodYear)}-{String(row.periodMonth).padStart(2, "0")}
            </p>
            <p className="mt-1 truncate text-xs text-text-muted">{row.slug}</p>
          </div>
        ),
      },
      {
        id: "currency",
        header: t("list.columns.currency"),
        accessor: (row) => row.currency,
        hideBelow: "lg",
      },
      {
        id: "status",
        header: t("list.columns.status"),
        cell: (row) => (
          <span className="inline-flex rounded-full bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-secondary dark:bg-white/8 dark:text-white/70">
            {t(`statuses.${row.status}` as Parameters<typeof t>[0])}
          </span>
        ),
        hideBelow: "md",
      },
      {
        id: "totalAmount",
        header: t("list.columns.totalAmount"),
        cell: (row) => (
          <span className="text-sm font-semibold text-text-primary dark:text-white/95">
            {formatSettlementMoney(locale, row.totalAmount, row.currency)}
          </span>
        ),
      },
      {
        id: "items",
        header: t("list.columns.practitioners"),
        accessor: (row) => row.settlementItemsCount,
        hideBelow: "xl",
      },
      {
        id: "createdAt",
        header: t("list.columns.createdAt"),
        cell: (row) => (
          <span className="text-sm text-text-secondary">
            {formatSettlementDateTime(locale, row.createdAt)}
          </span>
        ),
        hideBelow: "2xl",
      },
    ],
    [locale, t],
  );

  const pagination = data?.pagination;

  const resetFilters = () => {
    setStatus("ALL");
    setCurrency("all");
    setPeriodYear("");
    setPeriodMonth("");
    setPage(1);
  };

  return (
    <>
      <AdminOperationalListShell
        title={t("meta.batchesTitle")}
        description={t("meta.batchesDescription")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              startIcon={<ReceiptText className="h-4 w-4" />}
              onClick={() => router.push(`/${locale}/admin/settlements/payouts`)}
            >
              {t("list.actions.payoutHistory")}
            </Button>
            <Button
              variant="outline"
              startIcon={<Layers className="h-4 w-4" />}
              onClick={() => router.push(`/${locale}/admin/finance/ledger`)}
            >
              {tAccounting("dashboard.actions.openLedger")}
            </Button>
            <Button
              variant="primary"
              startIcon={<BadgeDollarSign className="h-4 w-4" />}
              onClick={() => setIsGenerateOpen(true)}
            >
              {t("generate.submit")}
            </Button>
          </div>
        }
        summaryCards={
          <AdminSummaryCard
            label={t("list.totalLabel")}
            value={typeof pagination?.totalItems === "number" ? pagination.totalItems : "..."}
            tone="primary"
            icon={<Layers className="h-4 w-4" />}
          />
        }
        filters={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("filters.status")}
              </span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as SettlementBatchStatus | "ALL");
                  setPage(1);
                }}
                className="app-control w-full py-3"
              >
                <option value="ALL">{t("filters.allStatuses")}</option>
                {(
                  [
                    "DRAFT",
                    "GENERATED",
                    "FINALIZED",
                    "PROCESSING",
                    "COMPLETED",
                    "FAILED",
                    "CANCELLED",
                  ] as const
                ).map((value) => (
                  <option key={value} value={value}>
                    {t(`statuses.${value}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("filters.currency")}
              </span>
              <select
                value={currency}
                onChange={(event) => {
                  setCurrency(event.target.value as CurrencyFilter);
                  setPage(1);
                }}
                className="app-control w-full py-3"
              >
                <option value="all">{t("filters.allCurrencies")}</option>
                {currencies.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("filters.periodYear")}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={2000}
                max={3000}
                value={periodYear}
                onChange={(event) => {
                  setPeriodYear(event.target.value);
                  setPage(1);
                }}
                placeholder={t("generate.placeholders.periodYear")}
                className="app-control w-full px-4 py-3"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("filters.periodMonth")}
              </span>
              <select
                value={periodMonth}
                onChange={(event) => {
                  setPeriodMonth(event.target.value);
                  setPage(1);
                }}
                className="app-control w-full py-3"
              >
                <option value="">{t("filters.periodMonthPlaceholder")}</option>
                {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((value) => (
                  <option key={value} value={value}>
                    {value.padStart(2, "0")}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end justify-end">
              <Button
                type="button"
                variant="outline"
                startIcon={<FileText className="h-4 w-4" />}
                onClick={resetFilters}
                disabled={batchesQuery.isLoading}
              >
                {t("filters.clear")}
              </Button>
            </div>
          </div>
        }
      >
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          loading={batchesQuery.isLoading}
          error={batchesQuery.isError ? t("states.listError") : null}
          errorState={{
            title: t("states.listError"),
            description: t("states.listError"),
            action: {
              label: t("list.retry"),
              onClick: () => batchesQuery.refetch(),
            },
          }}
          rowActionsHeader={t("list.columns.actions")}
          rowActions={(row) => (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <DataTableActionButton
                intent="primary"
                icon={<Layers className="h-4 w-4" />}
                onClick={() => router.push(`/${locale}/admin/settlements/${row.id}`)}
                label={t("list.actions.viewDetails")}
              />
            </div>
          )}
          pagination={
            pagination
              ? {
                  page: pagination.page,
                  limit: pagination.limit,
                  total: pagination.totalItems,
                  totalPages: pagination.totalPages,
                  hasPrevPage: pagination.page > 1,
                  hasNextPage: pagination.page < pagination.totalPages,
                }
              : undefined
          }
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
          pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
          emptyState={{
            icon: <Layers className="h-5 w-5 text-primary" />,
            title: t("states.empty"),
            description: t("states.empty"),
          }}
          ariaLabel={t("meta.batchesTitle")}
          caption={t("meta.batchesTitle")}
        />
      </AdminOperationalListShell>

      <AdminSettlementGenerateDrawer
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        onGenerated={(batchId) => {
          setIsGenerateOpen(false);
          router.push(`/${locale}/admin/settlements/${batchId}`);
        }}
      />
    </>
  );
}
