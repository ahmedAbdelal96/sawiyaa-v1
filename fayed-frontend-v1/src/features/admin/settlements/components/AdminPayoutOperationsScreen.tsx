"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BadgeDollarSign, FileText } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import DataTableActionButton from "@/components/ui/data-table/DataTableActionButton";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { formatSettlementDateTime, formatSettlementMoney } from "../lib/settlement-formatters";
import { useAdminPayoutHistory } from "../hooks/use-admin-settlements";
import type { AdminPayoutHistoryItem, SettlementPayoutMethod } from "../types/admin-settlements.types";

type CurrencyFilter = "all" | string;

const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;

export default function AdminPayoutOperationsScreen() {
  const t = useTranslations("admin-settlements");
  const locale = useLocale();
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);
  const [methodFilter, setMethodFilter] = useState<"all" | SettlementPayoutMethod>("all");
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>("all");

  const payoutsQuery = useAdminPayoutHistory({
    page,
    limit,
    payoutMethod: methodFilter === "all" ? undefined : methodFilter,
    currencyCode: currencyFilter === "all" ? undefined : currencyFilter,
  });

  const rows = useMemo(() => payoutsQuery.data?.items ?? [], [payoutsQuery.data]);

  const currencies = useMemo(() => {
    const values = new Set<string>();
    rows.forEach((row) => values.add(row.currency));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const columns = useMemo<ColumnDef<AdminPayoutHistoryItem>[]>(
    () => [
      {
        id: "practitioner",
        header: t("payouts.table.practitioner"),
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
              {row.practitionerDisplayName ?? row.practitionerSlug ?? row.practitionerId.slice(0, 8)}
            </p>
            <p className="mt-1 truncate text-xs text-text-muted">
              {row.practitionerSlug ?? row.practitionerId}
            </p>
          </div>
        ),
      },
      {
        id: "amount",
        header: t("payouts.table.amount"),
        cell: (row) => (
          <span className="text-sm font-semibold text-text-primary dark:text-white/95">
            {formatSettlementMoney(locale, row.amountPaid, row.currency)}
          </span>
        ),
      },
      {
        id: "method",
        header: t("payouts.table.method"),
        cell: (row) => (
          <span className="text-sm text-text-secondary">
            {t(`actions.payoutMethods.${row.payoutMethod}` as Parameters<typeof t>[0])}
          </span>
        ),
        hideBelow: "lg",
      },
      {
        id: "date",
        header: t("payouts.table.date"),
        cell: (row) => (
          <span className="text-sm text-text-secondary">
            {formatSettlementDateTime(locale, row.payoutDate)}
          </span>
        ),
        hideBelow: "md",
      },
      {
        id: "reference",
        header: t("payouts.table.reference"),
        cell: (row) => <span className="text-sm text-text-secondary">{row.externalReference ?? "-"}</span>,
        hideBelow: "xl",
      },
    ],
    [locale, t],
  );

  return (
    <AdminOperationalListShell
      eyebrow={t("payouts.eyebrow")}
      title={t("payouts.title")}
      description={t("payouts.note")}
      summaryCards={
        <AdminSummaryCard
          label={t("payouts.title")}
          value={
            typeof payoutsQuery.data?.pagination.totalItems === "number"
              ? payoutsQuery.data.pagination.totalItems
              : "..."
          }
          tone="primary"
        />
      }
      filters={
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("payouts.filters.method")}
            </span>
            <select
              value={methodFilter}
              onChange={(event) => {
                setMethodFilter(event.target.value as "all" | SettlementPayoutMethod);
                setPage(1);
              }}
              className="app-control w-full py-3"
            >
              <option value="all">{t("payouts.filters.allMethods")}</option>
              <option value="MANUAL_BANK_TRANSFER">
                {t("actions.payoutMethods.MANUAL_BANK_TRANSFER")}
              </option>
              <option value="WALLET_TRANSFER">{t("actions.payoutMethods.WALLET_TRANSFER")}</option>
              <option value="CASH">{t("actions.payoutMethods.CASH")}</option>
              <option value="OTHER">{t("actions.payoutMethods.OTHER")}</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("payouts.filters.currency")}
            </span>
            <select
              value={currencyFilter}
              onChange={(event) => {
                setCurrencyFilter(event.target.value as CurrencyFilter);
                setPage(1);
              }}
              className="app-control w-full py-3"
            >
              <option value="all">{t("payouts.filters.allCurrencies")}</option>
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
    >
      <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          loading={payoutsQuery.isLoading}
          error={payoutsQuery.isError ? t("payouts.states.errorNote") : null}
          errorState={{
            title: t("payouts.states.errorTitle"),
            description: t("payouts.states.errorNote"),
            action: {
              label: t("payouts.states.retry"),
              onClick: () => payoutsQuery.refetch(),
            },
          }}
          rowActionsHeader={t("payouts.table.action")}
          rowActions={(row) => (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {row.proof ? (
                <DataTableActionButton
                  intent="outline"
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() => window.open(row.proof?.downloadUrl, "_blank", "noopener,noreferrer")}
                  label={t("payouts.actions.viewProof")}
                />
              ) : null}
              <DataTableActionButton
                intent="primary"
                icon={<BadgeDollarSign className="h-4 w-4" />}
                onClick={() => router.push(`/${locale}/admin/settlements/statement/${row.practitionerId}`)}
                label={t("payouts.actions.statement")}
              />
            </div>
          )}
          pagination={
            payoutsQuery.data
              ? {
                  page: payoutsQuery.data.pagination.page,
                  limit: payoutsQuery.data.pagination.limit,
                  total: payoutsQuery.data.pagination.totalItems,
                  totalPages: payoutsQuery.data.pagination.totalPages,
                  hasPrevPage: payoutsQuery.data.pagination.page > 1,
                  hasNextPage: payoutsQuery.data.pagination.page < payoutsQuery.data.pagination.totalPages,
                }
              : undefined
          }
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          emptyState={{
            icon: <BadgeDollarSign className="h-5 w-5 text-primary" />,
            title: t("payouts.states.emptyTitle"),
            description: t("payouts.states.emptyNote"),
          }}
          ariaLabel={t("payouts.title")}
          caption={t("payouts.title")}
        />
    </AdminOperationalListShell>
  );
}
