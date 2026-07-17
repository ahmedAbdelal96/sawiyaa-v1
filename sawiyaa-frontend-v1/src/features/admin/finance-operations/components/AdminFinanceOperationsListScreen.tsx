"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import CollapsibleHelpCenter from "@/components/shared/CollapsibleHelpCenter";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import AdvancedFiltersToggleButton from "@/components/ui/filters/AdvancedFiltersToggleButton";
import type { ColumnDef, SortConfig } from "@/components/ui/data-table";
import {
  buildUpdatedSearchParams,
  parseEnumParam,
  parsePositiveIntParam,
  parseTextParam,
} from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useAdminFinanceOperationEvents } from "../hooks/use-admin-finance-operations";
import { getAdminFinanceOperationsErrorKey } from "../lib/admin-finance-operations-errors";
import type {
  FinanceOperationEventItem,
  FinanceOperationSortBy,
  FinanceOperationSortOrder,
  FinanceOperationType,
  ListAdminFinanceOperationEventsParams,
} from "../types/admin-finance-operations.types";
import type { PaymentProvider, PaymentStatus } from "@/features/payments/types/payments.types";
import type {
  AdminPaymentPurpose,
  AdminRefundStatus,
} from "@/features/admin/payments/types/admin-payments.types";

const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;
const SORTABLE_COLUMNS = ["occurredAt", "createdAt"] as const;
type SortableColumn = (typeof SORTABLE_COLUMNS)[number];

const OPERATION_TYPE_FILTERS: Array<FinanceOperationType | "ALL"> = ["ALL", "PAYMENT", "REFUND"];
const PROVIDER_FILTERS: Array<PaymentProvider | "ALL"> = ["ALL", "STRIPE", "PAYMOB"];
const PAYMENT_PURPOSE_FILTERS: Array<AdminPaymentPurpose | "ALL"> = [
  "ALL",
  "SESSION_BOOKING",
  "SESSION_INSTANT_BOOKING",
  "SESSION_EXTENSION",
  "SESSION_PACKAGE_PURCHASE",
  "ACADEMY_PROGRAM_ENROLLMENT",
  "MANUAL_INVOICE",
];
const PAYMENT_STATUS_FILTERS: Array<PaymentStatus | "ALL"> = [
  "ALL",
  "CREATED",
  "PENDING",
  "REQUIRES_ACTION",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
  "REFUND_PENDING",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
];
const REFUND_STATUS_FILTERS: Array<AdminRefundStatus | "ALL"> = [
  "ALL",
  "REQUESTED",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
];

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function shortId(value: string | null) {
  if (!value) return "-";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function operationTone(type: FinanceOperationType) {
  return type === "PAYMENT"
    ? "bg-primary-light text-text-brand"
    : "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300";
}

export default function AdminFinanceOperationsListScreen() {
  const t = useTranslations("admin-finance-operations");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const operationType = parseEnumParam<FinanceOperationType | "ALL">(
    searchParams.get("operationType"),
    OPERATION_TYPE_FILTERS,
    "ALL",
  );
  const provider = parseEnumParam<PaymentProvider | "ALL">(
    searchParams.get("provider"),
    PROVIDER_FILTERS,
    "ALL",
  );
  const paymentPurpose = parseEnumParam<AdminPaymentPurpose | "ALL">(
    searchParams.get("paymentPurpose"),
    PAYMENT_PURPOSE_FILTERS,
    "ALL",
  );
  const paymentStatus = parseEnumParam<PaymentStatus | "ALL">(
    searchParams.get("paymentStatus"),
    PAYMENT_STATUS_FILTERS,
    "ALL",
  );
  const refundStatus = parseEnumParam<AdminRefundStatus | "ALL">(
    searchParams.get("refundStatus"),
    REFUND_STATUS_FILTERS,
    "ALL",
  );
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 50,
  });
  const query = parseTextParam(searchParams.get("query"), { maxLength: 120 });

  const sortBy = parseEnumParam<FinanceOperationSortBy>(
    searchParams.get("sortBy"),
    ["OCCURRED_AT", "CREATED_AT"],
    "OCCURRED_AT",
  );
  const sortOrder = parseEnumParam<FinanceOperationSortOrder>(
    searchParams.get("sortOrder"),
    ["ASC", "DESC"],
    "DESC",
  );
  const sortConfig: SortConfig = {
    column: sortBy === "CREATED_AT" ? "createdAt" : "occurredAt",
    direction: sortOrder === "ASC" ? "asc" : "desc",
  };
  const hasActiveFilters =
    operationType !== "ALL" ||
    provider !== "ALL" ||
    paymentPurpose !== "ALL" ||
    paymentStatus !== "ALL" ||
    refundStatus !== "ALL" ||
    Boolean(query);
  const hasAdvancedFilters =
    paymentPurpose !== "ALL" || paymentStatus !== "ALL" || refundStatus !== "ALL";
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(hasAdvancedFilters);

  const params = useMemo<ListAdminFinanceOperationEventsParams>(() => {
    const next: ListAdminFinanceOperationEventsParams = {
      page,
      limit,
      sortBy,
      sortOrder,
    };
    if (operationType !== "ALL") next.operationType = operationType;
    if (provider !== "ALL") next.provider = provider;
    if (paymentPurpose !== "ALL") next.paymentPurpose = paymentPurpose;
    if (paymentStatus !== "ALL") next.paymentStatus = paymentStatus;
    if (refundStatus !== "ALL") next.refundStatus = refundStatus;
    if (query) next.query = query;
    return next;
  }, [operationType, provider, paymentPurpose, paymentStatus, refundStatus, page, query, sortBy, sortOrder, limit]);

  const events = useAdminFinanceOperationEvents(params);
  const data = events.data;
  const errorKey = events.error ? getAdminFinanceOperationsErrorKey(events.error) : "errors.generic";

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const queryString = next.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const columns = useMemo<ColumnDef<FinanceOperationEventItem>[]>(() => [
    {
      id: "operationType",
      header: t("list.headers.type"),
      accessor: (row) => row.operationType,
      cell: (row) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${operationTone(row.operationType)}`}>
          {t(`types.${row.operationType}` as Parameters<typeof t>[0])}
        </span>
      ),
    },
    {
      id: "summary",
      header: t("list.headers.summary"),
      accessor: (row) => row.summary ?? "",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text-primary dark:text-white/95">
            {row.summary ?? t("list.noSummary")}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {t("list.externalRef", { value: shortId(row.externalRef) })}
          </p>
        </div>
      ),
    },
    {
      id: "paymentId",
      header: t("list.headers.payment"),
      accessor: (row) => shortId(row.paymentId),
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{shortId(row.paymentId)}</span>,
      hideOnMobile: true,
    },
    {
      id: "refundId",
      header: t("list.headers.refund"),
      accessor: (row) => shortId(row.refundId),
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{shortId(row.refundId)}</span>,
      hideOnMobile: true,
    },
    {
      id: "occurredAt",
      header: t("list.headers.occurredAt"),
      accessor: (row) => new Date(row.occurredAt).getTime(),
      sortable: true,
      cell: (row) => formatDateTime(row.occurredAt, locale),
    },
    {
      id: "createdAt",
      header: t("list.headers.createdAt"),
      accessor: (row) => new Date(row.createdAt).getTime(),
      sortable: true,
      hideOnMobile: true,
      cell: (row) => formatDateTime(row.createdAt, locale),
    },
  ], [locale, t]);

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[32px] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("list.title")}
            </h1>
          </div>
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {data ? t("list.count", { value: data.pagination.totalItems }) : t("list.countLoading")}
          </span>
        </div>
      </section>

      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.query")}
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => updateListQuery({ query: event.target.value || null, page: 1 })}
              placeholder={t("filters.queryPlaceholder")}
              className="app-control w-full px-4 py-3"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.operationType")}
            </span>
            <select
              value={operationType}
              onChange={(event) => updateListQuery({ operationType: event.target.value === "ALL" ? null : event.target.value, page: 1 })}
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("filters.all")}</option>
              {OPERATION_TYPE_FILTERS.filter((v): v is FinanceOperationType => v !== "ALL").map((value) => (
                <option key={value} value={value}>
                  {t(`types.${value}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end justify-end">
            <AdvancedFiltersToggleButton
              expanded={showAdvancedFilters}
              hasHiddenActive={!showAdvancedFilters && hasAdvancedFilters}
              onToggle={() => setShowAdvancedFilters((prev) => !prev)}
            />
          </div>

          {showAdvancedFilters ? (
            <>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.provider")}
            </span>
            <select
              value={provider}
              onChange={(event) => updateListQuery({ provider: event.target.value === "ALL" ? null : event.target.value, page: 1 })}
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("filters.all")}</option>
              {PROVIDER_FILTERS.filter((v): v is PaymentProvider => v !== "ALL").map((value) => (
                <option key={value} value={value}>
                  {t(`providers.${value}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.paymentStatus")}
            </span>
            <select
              value={paymentStatus}
              onChange={(event) => updateListQuery({ paymentStatus: event.target.value === "ALL" ? null : event.target.value, page: 1 })}
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("filters.all")}</option>
              {PAYMENT_STATUS_FILTERS.filter((v): v is PaymentStatus => v !== "ALL").map((value) => (
                <option key={value} value={value}>
                  {t(`paymentStatuses.${value}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.refundStatus")}
            </span>
            <select
              value={refundStatus}
              onChange={(event) => updateListQuery({ refundStatus: event.target.value === "ALL" ? null : event.target.value, page: 1 })}
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("filters.all")}</option>
              {REFUND_STATUS_FILTERS.filter((v): v is AdminRefundStatus => v !== "ALL").map((value) => (
                <option key={value} value={value}>
                  {t(`refundStatuses.${value}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.paymentPurpose")}
            </span>
            <select
              value={paymentPurpose}
              onChange={(event) => updateListQuery({ paymentPurpose: event.target.value === "ALL" ? null : event.target.value, page: 1 })}
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("filters.all")}</option>
              {PAYMENT_PURPOSE_FILTERS.filter((v): v is AdminPaymentPurpose => v !== "ALL").map((value) => (
                <option key={value} value={value}>
                  {t(`paymentPurposes.${value}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>
            </>
          ) : null}
          <div className="md:col-span-2 xl:col-span-3 flex justify-end">
            <FilterClearButton
              disabled={!hasActiveFilters}
              onClick={() =>
                updateListQuery({
                  query: null,
                  operationType: null,
                  provider: null,
                  paymentPurpose: null,
                  paymentStatus: null,
                  refundStatus: null,
                  page: 1,
                })
              }
            />
          </div>
        </div>
      </section>

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        getRowId={(row) => row.id}
        loading={events.isLoading}
        error={events.isError ? t(errorKey as Parameters<typeof t>[0]) : null}
        errorState={{
          title: t("states.listError.heading"),
          description: t(errorKey as Parameters<typeof t>[0]),
          action: {
            label: t("states.listError.retry"),
            onClick: () => events.refetch(),
          },
        }}
        sortConfig={sortConfig}
        onSortChange={(nextSort) =>
          updateListQuery({
            sortBy: nextSort.column === "createdAt" ? "CREATED_AT" : "OCCURRED_AT",
            sortOrder: nextSort.direction === "asc" ? "ASC" : "DESC",
          })
        }
        onRowClick={(row) => router.push(`/admin/admin-operations/${row.id}` as never)}
        rowActions={(row) => (
          <ActionIconButton
            intent="view"
            label={t("list.openAction")}
            icon={<ClipboardList className="h-4 w-4" />}
            onClick={() => router.push(`/admin/admin-operations/${row.id}` as never)}
          />
        )}
        pagination={
          data
            ? {
                page: data.pagination.page,
                limit: data.pagination.limit,
                total: data.pagination.totalItems,
                totalPages: data.pagination.totalPages,
                hasPrevPage: data.pagination.page > 1,
                hasNextPage: data.pagination.page < data.pagination.totalPages,
              }
            : undefined
        }
        onPageChange={(nextPage) => updateListQuery({ page: nextPage })}
        onPageSizeChange={(nextLimit) => updateListQuery({ limit: nextLimit, page: 1 })}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        emptyState={{
          icon: <ClipboardList className="h-5 w-5 text-primary" />,
          title: t("states.empty.heading"),
          description: t("states.empty.note"),
        }}
        ariaLabel={t("list.title")}
        caption={t("list.title")}
      />

      <CollapsibleHelpCenter
        title={t("list.eyebrow")}
        summary={t("list.note")}
        sections={[
          {
            heading: t("scope.heading"),
            items: [t("scope.items.list"), t("scope.items.detail"), t("scope.items.filters")],
          },
          {
            heading: t("boundaries.heading"),
            items: [
              t("boundaries.items.noControls"),
              t("boundaries.items.noAnalyticsSuite"),
              t("boundaries.items.noReconciliation"),
            ],
          },
        ]}
      />
    </div>
  );
}
