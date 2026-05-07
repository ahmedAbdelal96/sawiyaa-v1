"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { Skeleton } from "@/components/shared/LoadingStates";
import {
  SurfaceActionLink,
  SurfaceCard,
  SurfaceHeader,
  SurfaceToolbar,
} from "@/components/shared/SurfaceShell";
import { Link } from "@/i18n/navigation";
import { formatSettlementDateTime, formatSettlementMoney } from "@/features/admin/settlements/lib/settlement-formatters";
import {
  useAdminPractitionerManualPayoutHistory,
} from "../hooks/use-admin-practitioner-payouts";
import type { AdminPractitionerManualPayout } from "../types/admin-practitioner-payouts.types";
import AdminPractitionerPayoutHistoryDetailDrawer from "./AdminPractitionerPayoutHistoryDetailDrawer";

const PAGE_SIZE = DEFAULT_PAGE_LIMIT;

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
    <div className="space-y-6">
      <SurfaceCard variant="page">
        <SurfaceHeader
          eyebrow={t("history.eyebrow")}
          title={t("history.title")}
          description={t("history.description")}
          actions={
            <SurfaceActionLink href="/admin/practitioner-payouts">
              {t("history.backToList")}
            </SurfaceActionLink>
          }
        />

        <div className="mt-6 space-y-4">
          <SurfaceToolbar>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
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
                    className="app-control w-56 py-3 px-4"
                  >
                    <option value="">{t("history.filters.allCurrencies")}</option>
                    <option value="EGP">{t("currencies.EGP")}</option>
                    <option value="USD">{t("currencies.USD")}</option>
                  </select>
                </label>
              </div>

              <div className="text-sm text-text-secondary">
                {pagination
                  ? t("history.results", { count: pagination.totalItems })
                  : t("history.loading")}
              </div>
            </div>
          </SurfaceToolbar>

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
        </div>
      </SurfaceCard>

      <AdminPractitionerPayoutHistoryDetailDrawer
        isOpen={Boolean(selectedPayout)}
        payout={selectedPayout}
        onClose={() => setSelectedPayout(null)}
      />
    </div>
  );
}
