"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, BadgeDollarSign, Clock3, Layers, ShieldCheck, Wallet, WalletCards } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam } from "@/components/ui/data-table";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import {
  PractitionerPageHeader,
  PractitionerStatsGrid,
  PractitionerStatCard,
  PractitionerFilterCard,
  PractitionerTableSection,
  PractitionerSectionCard,
  PractitionerEmptyState,
} from "@/components/shared/practitioner/PractitionerWorkspaceKit";
import { getPractitionerSettlementsErrorKey, getPractitionerWalletErrorKey } from "../lib/financial-operations-errors";
import { usePractitionerSettlements, usePractitionerWallet } from "../hooks/use-financial-operations";
import type {
  PractitionerSettlementItem,
  PractitionerSettlementListParams,
  PractitionerSettlementStatus,
} from "../types/financial-operations.types";

const STATUS_FILTERS: Array<PractitionerSettlementStatus | "ALL"> = [
  "ALL",
  "DRAFT",
  "READY",
  "PROCESSING",
  "PAID",
  "FAILED",
  "CANCELLED",
];

function formatMoney(value: string, currency: string, locale: string) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return `${value} ${currency}`;

  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function formatDate(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function shortId(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

const STATUS_STYLES: Record<PractitionerSettlementStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70",
  READY: "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light",
  PROCESSING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  FAILED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  CANCELLED: "bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-white/60",
};

function getStatusTone(status: PractitionerSettlementStatus) {
  return STATUS_STYLES[status] ?? "app-chip";
}

export default function PractitionerWalletSummaryScreen() {
  const t = useTranslations("practitioner-finance");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const walletQuery = usePractitionerWallet();

  const settlementStatus = parseEnumParam<PractitionerSettlementStatus | "ALL">(
    searchParams.get("status"),
    STATUS_FILTERS,
    "ALL",
  );
  const settlementPage = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const settlementLimit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 40,
  });

  const settlementParams = useMemo<PractitionerSettlementListParams>(
    () => ({
      page: settlementPage,
      limit: settlementLimit,
      status: settlementStatus === "ALL" ? undefined : settlementStatus,
    }),
    [settlementLimit, settlementPage, settlementStatus],
  );

  const settlementsQuery = usePractitionerSettlements(settlementParams);
  const wallet = walletQuery.data;
  const settlements = settlementsQuery.data;

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const hasSettlementFilters = settlementStatus !== "ALL";

  const summary = useMemo(() => {
    if (!wallet) return null;

    return {
      currency: wallet.currency,
      available: formatMoney(wallet.availableBalance, wallet.currency, locale),
      pending: formatMoney(wallet.pendingBalance, wallet.currency, locale),
      reserved: formatMoney(wallet.reservedBalance, wallet.currency, locale),
      totalEarned: formatMoney(wallet.totalEarned, wallet.currency, locale),
      lifetimePaidOut: formatMoney(wallet.lifetimePaidOut, wallet.currency, locale),
      lastLedgerEntryAt: formatDateTime(wallet.lastLedgerEntryAt, locale),
      updatedAt: formatDateTime(wallet.updatedAt, locale),
    };
  }, [locale, wallet]);

  const settlementColumns = useMemo<ColumnDef<PractitionerSettlementItem>[]>(
    () => [
      {
        id: "status",
        header: locale.startsWith("ar") ? "الحالة" : "Status",
        accessor: (row) => row.status,
        cell: (row) => (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(row.status)}`}>
            {t(`settlements.statuses.${row.status}` as Parameters<typeof t>[0])}
          </span>
        ),
      },
      {
        id: "amountNet",
        header: locale.startsWith("ar") ? "الصافي" : "Net",
        accessor: (row) => Number(row.amountNet),
        cell: (row) => (
          <span className="font-semibold text-text-primary dark:text-white/95">
            {formatMoney(row.amountNet, row.currency, locale)}
          </span>
        ),
      },
      {
        id: "amountGross",
        header: locale.startsWith("ar") ? "الإجمالي" : "Gross",
        accessor: (row) => Number(row.amountGross),
        cell: (row) => <span className="text-sm text-text-secondary">{formatMoney(row.amountGross, row.currency, locale)}</span>,
        hideOnMobile: true,
      },
      {
        id: "amountAdjustments",
        header: locale.startsWith("ar") ? "التعديلات" : "Adjustments",
        accessor: (row) => Number(row.amountAdjustments),
        cell: (row) => <span className="text-sm text-text-secondary">{formatMoney(row.amountAdjustments, row.currency, locale)}</span>,
        hideOnMobile: true,
      },
      {
        id: "batchId",
        header: locale.startsWith("ar") ? "الدفعة" : "Batch",
        accessor: (row) => row.batchId,
        cell: (row) => <span className="font-mono text-xs text-text-secondary">{shortId(row.batchId)}</span>,
        hideOnMobile: true,
      },
      {
        id: "externalPayoutRef",
        header: locale.startsWith("ar") ? "مرجع الصرف" : "Reference",
        accessor: (row) => row.externalPayoutRef ?? "",
        cell: (row) =>
          row.externalPayoutRef ? (
            <span className="font-mono text-xs text-text-secondary">{shortId(row.externalPayoutRef)}</span>
          ) : (
            <span className="text-xs text-text-muted">-</span>
          ),
        hideOnMobile: true,
      },
      {
        id: "createdAt",
        header: locale.startsWith("ar") ? "أُنشئت" : "Created",
        accessor: (row) => new Date(row.createdAt).getTime(),
        cell: (row) => formatDate(row.createdAt, locale),
      },
      {
        id: "paidAt",
        header: locale.startsWith("ar") ? "صُرفت" : "Paid",
        accessor: (row) => (row.paidAt ? new Date(row.paidAt).getTime() : 0),
        cell: (row) => <span className="text-xs text-text-secondary">{formatDateTime(row.paidAt, locale)}</span>,
        hideOnMobile: true,
      },
    ],
    [locale, t],
  );

  if (walletQuery.isLoading) {
    return (
      <div className="space-y-4">
        <PractitionerSectionCard>
          <p className="text-sm text-text-muted">{t("summary.note")}</p>
        </PractitionerSectionCard>
        <PractitionerSectionCard>
          <p className="text-sm text-text-muted">{t("settlements.countLoading")}</p>
        </PractitionerSectionCard>
      </div>
    );
  }

  if (walletQuery.isError) {
    return (
      <div className="space-y-4">
        <PractitionerSectionCard>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-2xl">
            {t("summary.title")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">{t(getPractitionerWalletErrorKey(walletQuery.error))}</p>
        </PractitionerSectionCard>
      </div>
    );
  }

  if (!summary) {
    return (
      <PractitionerEmptyState
        title={t("states.empty.heading")}
        description={t("states.empty.note")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PractitionerPageHeader
        eyebrow={t("summary.eyebrow")}
        title={t("summary.title")}
        description={t("summary.note")}
        actions={
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {t("summary.currency", { currency: summary.currency })}
          </span>
        }
      />

      <PractitionerStatsGrid cols={5}>
        <PractitionerStatCard
          label={t("summary.cards.available")}
          value={summary.available}
          tone="primary"
          metricKey="wallet.available"
        />
        <PractitionerStatCard
          label={t("summary.cards.pending")}
          value={summary.pending}
          tone="warning"
          metricKey="wallet.pending"
        />
        <PractitionerStatCard
          label={t("summary.cards.reserved")}
          value={summary.reserved}
          tone="neutral"
          metricKey="wallet.reserved"
        />
        <PractitionerStatCard
          label={t("summary.cards.totalEarned")}
          value={summary.totalEarned}
          tone="neutral"
          metricKey="wallet.totalEarned"
        />
        <PractitionerStatCard
          label={t("summary.cards.lifetimePaidOut")}
          value={summary.lifetimePaidOut}
          tone="success"
          metricKey="wallet.lifetimePaidOut"
        />
      </PractitionerStatsGrid>

      <PractitionerFilterCard>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="block min-w-[220px]">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("settlements.filters.allStatuses")}
            </span>
            <select
              value={settlementStatus}
              onChange={(event) =>
                updateListQuery({ status: event.target.value === "ALL" ? null : event.target.value, page: 1 })
              }
              className="app-control w-full px-4 py-3"
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL"
                    ? t("settlements.filters.allStatuses")
                    : t(`settlements.statuses.${status}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <FilterClearButton
            disabled={!hasSettlementFilters && settlementPage === 1}
            onClick={() =>
              updateListQuery({
                status: null,
                page: 1,
              })
            }
          />
        </div>
      </PractitionerFilterCard>

      <PractitionerTableSection
        title={t("settlements.eyebrow")}
        subtitle={t("settlements.note")}
        flushContent
      >
        <DataTable
          data={settlements?.items ?? []}
          columns={settlementColumns}
          getRowId={(row) => row.id}
          loading={settlementsQuery.isLoading}
          error={settlementsQuery.isError ? t(getPractitionerSettlementsErrorKey(settlementsQuery.error)) : null}
          errorState={{
            title: t("settlements.states.error.heading"),
            description: t(getPractitionerSettlementsErrorKey(settlementsQuery.error)),
            action: {
              label: t("settlements.states.error.retry"),
              onClick: () => settlementsQuery.refetch(),
            },
          }}
          emptyState={{
            icon: <Layers className="h-5 w-5 text-primary" />,
            title: t("settlements.states.empty.heading"),
            description: t("settlements.states.empty.note"),
          }}
          pagination={
            settlements
              ? {
                  page: settlements.pagination.page,
                  limit: settlements.pagination.limit,
                  total: settlements.pagination.totalItems,
                  totalPages: settlements.pagination.totalPages,
                  hasPrevPage: settlements.pagination.page > 1,
                  hasNextPage: settlements.pagination.page < settlements.pagination.totalPages,
                }
              : undefined
          }
          onPageChange={(nextPage) => updateListQuery({ page: nextPage })}
          onPageSizeChange={(nextLimit) => updateListQuery({ limit: nextLimit, page: 1 })}
          pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
          ariaLabel={t("settlements.title")}
          caption={t("settlements.title")}
          size="sm"
        />
      </PractitionerTableSection>

      <PractitionerSectionCard>
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-white/95">
          <WalletCards className="h-4 w-4 text-primary" />
          {t("summary.detailsHeading")}
        </div>
        <div className="mt-4">
          <div className="flex items-start justify-between gap-4 border-b border-border-light py-3 last:border-b-0 dark:border-white/8">
            <span className="text-xs font-medium text-text-muted">{t("summary.details.lastLedgerEntryAt")}</span>
            <span className="text-sm text-text-primary dark:text-white/90">{summary.lastLedgerEntryAt}</span>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-border-light py-3 last:border-b-0 dark:border-white/8">
            <span className="text-xs font-medium text-text-muted">{t("summary.details.updatedAt")}</span>
            <span className="text-sm text-text-primary dark:text-white/90">{summary.updatedAt}</span>
          </div>
        </div>
      </PractitionerSectionCard>
    </div>
  );
}
