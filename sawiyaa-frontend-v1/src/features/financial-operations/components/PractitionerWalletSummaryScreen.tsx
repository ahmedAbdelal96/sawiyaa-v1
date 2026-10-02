"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, BadgeDollarSign, Clock, Layers, ShieldCheck, Wallet, AlertTriangle, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam } from "@/components/ui/data-table";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import {
  SurfaceCard,
  SurfaceHeader,
} from "@/components/shared/SurfaceShell";
import {
  PractitionerFinancialStatCard,
} from "@/components/shared/practitioner/PractitionerWorkspaceKit";
import { EmptyState } from "@/components/shared/EmptyStates";
import { Skeleton, TableSkeleton } from "@/components/shared/LoadingStates";
import { AdminStatusBadge } from "@/components/shared/admin/AdminDashboardKit";
import { usePractitionerProfile } from "@/features/practitioners/hooks/use-practitioners";
import {
  formatPractitionerOrViewerDateTime,
  formatPractitionerOrViewerDate,
  formatTimeZoneLabel,
} from "@/lib/time-formatting";
import { formatMoney } from "@/lib/finance-format";
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

const STATUS_TONES: Record<PractitionerSettlementStatus, "neutral" | "primary" | "warning" | "success" | "danger"> = {
  DRAFT: "neutral",
  UNDER_REVIEW: "warning",
  APPROVED: "primary",
  REJECTED: "danger",
  CREDITED: "success",
  PAID_OUT: "success",
  READY: "primary",
  PROCESSING: "warning",
  PAID: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
};

function formatDateTime(value: string | null, locale: string, timeZone: string | null = null) {
  if (!value) return "-";
  return formatPractitionerOrViewerDateTime(value, timeZone, {
    locale: locale === "ar" ? "ar-SA" : "en-US",
    fallbackText: "-",
  });
}

function formatDate(value: string | null, locale: string, timeZone: string | null = null) {
  if (!value) return "-";
  return formatPractitionerOrViewerDate(value, timeZone, {
    locale: locale === "ar" ? "ar-SA" : "en-US",
    fallbackText: "-",
  });
}

function formatMoneyWithSmallCurrency(
  locale: string,
  amount: string | number,
  currencyCode?: string | null,
  valueClassName = "text-2xl sm:text-3xl font-bold"
) {
  const numeric = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(numeric)) return String(amount);

  const formattedAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);

  const currency = currencyCode?.trim().toUpperCase() || "EGP";
  const isArabic = locale.toLowerCase().startsWith("ar");
  const currencyLabel = isArabic
    ? (currency === "USD" ? "دولار" : "جنيه")
    : (currency === "USD" ? "USD" : "EGP");

  return (
    <span className="font-semibold text-text-primary dark:text-white/95">
      <span className={valueClassName}>{formattedAmount}</span>
      <span className="text-xs font-normal text-text-secondary dark:text-white/50 ms-1 select-none">
        {currencyLabel}
      </span>
    </span>
  );
}

function WalletLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-[22px] border border-border-light bg-surface-secondary px-4 py-5 shadow-sm sm:px-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-8 w-32" />
              </div>
              <Skeleton variant="circular" className="h-10 w-10 bg-surface-tertiary" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="rounded-xl border border-border-light bg-surface-secondary p-4 shadow-sm animate-pulse">
        <Skeleton className="h-10 w-64" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border border-border-light bg-surface-secondary p-4 shadow-sm animate-pulse">
        <TableSkeleton rows={5} columns={5} />
      </div>
    </div>
  );
}

export default function PractitionerWalletSummaryScreen() {
  const t = useTranslations("practitioner-finance");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profileQuery = usePractitionerProfile();
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
  const practitionerTimeZone = profileQuery.data?.profile.timezone ?? null;
  const practitionerTimeZoneLabel = practitionerTimeZone
    ? formatTimeZoneLabel(practitionerTimeZone, { locale })
    : null;

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
      available: formatMoneyWithSmallCurrency(locale, wallet.availableBalance, wallet.currency),
      pending: formatMoneyWithSmallCurrency(locale, wallet.pendingBalance, wallet.currency),
      reserved: formatMoneyWithSmallCurrency(locale, wallet.reservedBalance, wallet.currency),
      totalEarned: formatMoneyWithSmallCurrency(locale, wallet.totalEarned, wallet.currency),
      lifetimePaidOut: formatMoneyWithSmallCurrency(locale, wallet.lifetimePaidOut, wallet.currency),
      lastLedgerEntryAt: formatDateTime(wallet.lastLedgerEntryAt, locale, practitionerTimeZone),
      updatedAt: formatDateTime(wallet.updatedAt, locale, practitionerTimeZone),
    };
  }, [locale, wallet, practitionerTimeZone]);

  const settlementColumns = useMemo<ColumnDef<PractitionerSettlementItem>[]>(
    () => [
      {
        id: "status",
        header: t("ui.statusLabel"),
        accessor: (row) => row.status,
        cell: (row) => (
          <AdminStatusBadge tone={STATUS_TONES[row.status]}>
            {t(`settlements.statuses.${row.status}` as Parameters<typeof t>[0])}
          </AdminStatusBadge>
        ),
      },
      {
        id: "amountAdded",
        header: t("settlements.columns.net"),
        accessor: (row) => Number(row.amountAdded),
        cell: (row) => formatMoneyWithSmallCurrency(locale, row.amountAdded, row.currency, "text-sm font-semibold"),
      },
      /*
      {
        id: "amountGross",
        header: t("settlements.columns.gross"),
        accessor: (row) => Number(row.amountGross),
        cell: (row) => formatMoneyWithSmallCurrency(locale, row.amountGross, row.currency, "text-sm font-normal text-text-secondary"),
        hideOnMobile: true,
      },
      {
        id: "amountAdjustments",
        header: t("settlements.columns.adjustments"),
        accessor: (row) => Number(row.amountAdjustments),
        cell: (row) => formatMoneyWithSmallCurrency(locale, row.amountAdjustments, row.currency, "text-sm font-normal text-text-secondary"),
        hideOnMobile: true,
      },
      {
        id: "batchId",
        header: t("settlements.columns.batch"),
        accessor: (row) => row.batchId,
        cell: (row) => <span className="font-mono text-xs text-text-secondary">{shortId(row.batchId)}</span>,
        hideOnMobile: true,
      },
      {
        id: "externalPayoutRef",
        header: t("settlements.columns.reference"),
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
        header: t("settlements.columns.created"),
        accessor: (row) => new Date(row.createdAt).getTime(),
        cell: (row) => formatDate(row.createdAt, locale, practitionerTimeZone),
      },
      {
        id: "paidAt",
        header: t("settlements.columns.paidAt"),
        accessor: (row) => (row.paidAt ? new Date(row.paidAt).getTime() : 0),
        cell: (row) => <span className="text-xs text-text-secondary">{formatDateTime(row.paidAt, locale, practitionerTimeZone)}</span>,
        hideOnMobile: true,
      },
      */
      {
        id: "date",
        header: t("ui.date"),
        accessor: (row) => row.date ? new Date(row.date).getTime() : 0,
        cell: (row) => formatDate(row.date, locale, practitionerTimeZone),
      },
      {
        id: "payoutStatus",
        header: t("ui.payoutStatus"),
        accessor: (row) => row.payoutStatus,
        cell: (row) => <span className="text-xs text-text-secondary">{row.payoutStatus}</span>,
        hideOnMobile: true,
      },
    ],
    [locale, t, practitionerTimeZone],
  );

  if (walletQuery.isLoading) {
    return <WalletLoadingSkeleton />;
  }

  if (walletQuery.isError) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-10 w-10 text-danger" />}
        title={t("states.error.heading")}
        description={t(getPractitionerWalletErrorKey(walletQuery.error))}
        action={{
          label: t("states.error.retry"),
          onClick: () => walletQuery.refetch(),
          icon: <RefreshCw size={14} />,
        }}
      />
    );
  }

  if (!summary) {
    return (
      <EmptyState
        title={t("states.empty.heading")}
        description={t("states.empty.note")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SurfaceHeader
        title={t("summary.title")}
        description={t("summary.note")}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            {practitionerTimeZoneLabel ? (
              <span className="inline-flex items-center rounded-full bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-secondary dark:bg-white/5">
                {t("summary.timezoneLabel")}: {practitionerTimeZoneLabel}
              </span>
            ) : null}
            <span className="inline-flex items-center rounded-full bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-secondary dark:bg-white/5">
              {t("summary.currency", { currency: summary.currency })}
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PractitionerFinancialStatCard
          label={t("summary.cards.available")}
          value={summary.available}
          tone="primary"
          icon={<Wallet className="h-4 w-4" />}
        />
        <PractitionerFinancialStatCard
          label={t("summary.cards.pending")}
          value={summary.pending}
          tone="warning"
          icon={<Clock className="h-4 w-4" />}
        />
        <PractitionerFinancialStatCard
          label={t("summary.cards.reserved")}
          value={summary.reserved}
          tone="neutral"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <PractitionerFinancialStatCard
          label={t("summary.cards.totalEarned")}
          value={summary.totalEarned}
          tone="neutral"
          icon={<BadgeDollarSign className="h-4 w-4" />}
        />
        <PractitionerFinancialStatCard
          label={t("summary.cards.lifetimePaidOut")}
          value={summary.lifetimePaidOut}
          tone="success"
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
      </div>

      <SurfaceCard variant="compact" className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-text-secondary">
            {t("ui.filterStatus")}
          </span>
          <select
            value={settlementStatus}
            onChange={(event) =>
              updateListQuery({ status: event.target.value === "ALL" ? null : event.target.value, page: 1 })
            }
            className="app-control min-w-[180px] px-3 py-1.5 text-sm"
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === "ALL"
                  ? t("settlements.filters.allStatuses")
                  : t(`settlements.statuses.${status}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
        </div>

        <FilterClearButton
          disabled={!hasSettlementFilters && settlementPage === 1}
          onClick={() =>
            updateListQuery({
              status: null,
              page: 1,
            })
          }
        />
      </SurfaceCard>

      <SurfaceCard variant="section" className="overflow-hidden">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("settlements.eyebrow")}
          </h2>
          <p className="mt-1 text-xs text-text-muted">{t("settlements.note")}</p>
        </div>

        <DataTable
          data={settlements?.items ?? []}
          columns={settlementColumns}
          getRowId={(row) => row.sessionId ?? `${row.date ?? "undated"}-${row.amountAdded}-${row.currency}-${row.status}`}
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
      </SurfaceCard>

      <SurfaceCard variant="subtle" className="mt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-text-muted">{t("summary.details.lastLedgerEntryAt")}</span>
            <span className="text-text-primary dark:text-white/90">
              {summary.lastLedgerEntryAt}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-text-muted">{t("summary.details.updatedAt")}</span>
            <span className="text-text-primary dark:text-white/90">
              {summary.updatedAt}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-text-muted">{t("summary.timezoneLabel")}</span>
            <span className="text-text-primary dark:text-white/90">
              {practitionerTimeZoneLabel || "-"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-text-muted">{t("ui.currency")}</span>
            <span className="text-text-primary dark:text-white/90 font-medium">
              {summary.currency}
            </span>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
