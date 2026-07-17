"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { BadgeDollarSign, ClipboardList, Search } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef, SortConfig } from "@/components/ui/data-table";
import {
  buildUpdatedSearchParams,
  parseEnumParam,
  parsePositiveIntParam,
  parseTextParam,
} from "@/components/ui/data-table";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import CollapsibleHelpCenter from "@/components/shared/CollapsibleHelpCenter";
import DateField from "@/components/form/input/DateField";
import AdvancedFiltersToggleButton from "@/components/ui/filters/AdvancedFiltersToggleButton";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import { useAdminFinanceOperationEvents } from "@/features/admin/finance-operations/hooks/use-admin-finance-operations";
import { getAdminFinanceOperationsErrorKey } from "@/features/admin/finance-operations/lib/admin-finance-operations-errors";
import AdminOperationalListShell, {
  AdminSummaryCard,
} from "@/components/shared/admin/AdminOperationalListShell";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import type {
  FinanceOperationEventItem,
  FinanceOperationSortBy,
  FinanceOperationSortOrder,
  FinanceOperationType,
  ListAdminFinanceOperationEventsParams,
} from "@/features/admin/finance-operations/types/admin-finance-operations.types";
import type { PaymentProvider, PaymentStatus } from "@/features/payments/types/payments.types";
import {
  ADMIN_PAYMENT_STATUS_STYLES,
  ADMIN_REFUND_STATUS_STYLES,
} from "../lib/admin-payment-status";
import type { AdminPaymentPurpose, AdminRefundStatus } from "../types/admin-payments.types";

const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;
const DEFAULT_OPERATION_TYPE: FinanceOperationType = "PAYMENT";
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

function formatMoney(value: string, currency: string, locale: string) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return `${value} ${currency}`;
  }

  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function shortId(value: string | null) {
  if (!value) return "-";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function operationTone(type: FinanceOperationType) {
  return type === "PAYMENT"
    ? "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light"
    : "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300";
}

function getPaymentsReviewCopy(locale: string) {
  if (locale.startsWith("ar")) {
    return {
      eyebrow: "مراجعة تشغيلية للمدفوعات",
      title: "مراجعة المدفوعات",
      note:
        "هذه الصفحة للمراجعة التشغيلية فقط، وليست لدفتر القيود أو الإجماليات المحاسبية. استخدمها لفحص أحداث الدفع والاسترداد بأمان.",
      paymentIdLabel: "رقم الدفع",
      paymentIdPlaceholder: "الصق رقم الدفع",
      statusLabel: "الحالة الحالية",
      createdFromLabel: "من تاريخ",
      createdFromPlaceholder: "2026-04-01",
      createdToLabel: "إلى تاريخ",
      createdToPlaceholder: "2026-04-30",
      paymentStatusesLabel: "حالة الدفع",
      paymentPurposesLabel: "نوع الدفع",
      refundStatusesLabel: "حالة الاسترداد",
      amountUnavailable: "غير متاح",
      openPaymentAction: "فتح الدفع",
      fullDiagnosticsAction: "فتح سجل الأحداث الكامل",
    };
  }

  return {
    eyebrow: "Operational payments review",
    title: "Payments review",
    note:
      "This page is for operational review only, not accounting ledger work or totals. Use it to inspect payment and refund events safely.",
    paymentIdLabel: "Payment ID",
    paymentIdPlaceholder: "Paste a payment ID",
    statusLabel: "Current status",
    createdFromLabel: "Created from",
    createdFromPlaceholder: "2026-04-01",
    createdToLabel: "Created to",
    createdToPlaceholder: "2026-04-30",
    paymentStatusesLabel: "Payment status",
    paymentPurposesLabel: "Payment purpose",
    refundStatusesLabel: "Refund status",
    amountUnavailable: "Unavailable",
    openPaymentAction: "Open payment",
    fullDiagnosticsAction: "Open full diagnostics",
  };
}

function StatusChip({
  item,
  t,
}: {
  item: FinanceOperationEventItem;
  t: ReturnType<typeof useTranslations>;
}) {
  if (item.operationType === "PAYMENT") {
    const status = item.paymentStatus ?? "CREATED";
    return (
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ADMIN_PAYMENT_STATUS_STYLES[status]}`}>
        {t(`paymentStatuses.${status}` as Parameters<typeof t>[0])}
      </span>
    );
  }

  const status = item.refundStatus ?? "REQUESTED";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ADMIN_REFUND_STATUS_STYLES[status]}`}>
      {t(`refundStatuses.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}

function RowSummary({
  item,
  locale,
  t,
}: {
  item: FinanceOperationEventItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const actor =
    item.patientDisplayName ??
    item.practitionerDisplayName ??
    (locale.startsWith("ar") ? "بدون اسم واضح" : "No display name");

  const purpose = item.paymentPurpose
    ? t(`paymentPurposes.${item.paymentPurpose}` as Parameters<typeof t>[0])
    : null;

  const title = item.summary?.trim().length
    ? item.summary
    : item.operationType === "PAYMENT"
      ? t("types.PAYMENT")
      : t("types.REFUND");

  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">{title}</p>
      <p className="mt-1 truncate text-xs text-text-secondary">
        {actor}
        {item.externalRef ? ` • ${item.externalRef}` : ""}
      </p>
      {purpose ? <p className="mt-1 truncate text-[11px] text-text-muted">{purpose}</p> : null}
    </div>
  );
}

export default function AdminPaymentsLookupScreen() {
  const t = useTranslations("admin-finance-operations");
  const locale = useLocale();
  const copy = getPaymentsReviewCopy(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const operationType = parseEnumParam<FinanceOperationType | "ALL">(
    searchParams.get("operationType"),
    OPERATION_TYPE_FILTERS,
    DEFAULT_OPERATION_TYPE,
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
  const paymentId = parseTextParam(searchParams.get("paymentId"), { maxLength: 64 });
  const occurredFrom = parseTextParam(searchParams.get("occurredFrom"), { maxLength: 32 });
  const occurredTo = parseTextParam(searchParams.get("occurredTo"), { maxLength: 32 });

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
    operationType !== DEFAULT_OPERATION_TYPE ||
    provider !== "ALL" ||
    paymentPurpose !== "ALL" ||
    paymentStatus !== "ALL" ||
    refundStatus !== "ALL" ||
    Boolean(query) ||
    Boolean(paymentId) ||
    Boolean(occurredFrom) ||
    Boolean(occurredTo);
  const hasAdvancedFilters =
    paymentPurpose !== "ALL" ||
    refundStatus !== "ALL" ||
    Boolean(occurredFrom) ||
    Boolean(occurredTo);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(hasAdvancedFilters);

  const params = useMemo<ListAdminFinanceOperationEventsParams>(() => {
    const next: ListAdminFinanceOperationEventsParams = {
      page,
      limit,
      sortBy,
      sortOrder,
    };

    if (operationType !== "ALL" && operationType !== DEFAULT_OPERATION_TYPE) {
      next.operationType = operationType;
    }
    if (provider !== "ALL") next.provider = provider;
    if (paymentPurpose !== "ALL") next.paymentPurpose = paymentPurpose;
    if (paymentStatus !== "ALL") next.paymentStatus = paymentStatus;
    if (refundStatus !== "ALL") next.refundStatus = refundStatus;
    if (query) next.query = query;
    if (paymentId) next.paymentId = paymentId;
    if (occurredFrom) next.occurredFrom = occurredFrom;
    if (occurredTo) next.occurredTo = occurredTo;

    return next;
  }, [
    occurredFrom,
    occurredTo,
    operationType,
    page,
    paymentId,
    paymentPurpose,
    paymentStatus,
    provider,
    query,
    refundStatus,
    limit,
    sortBy,
    sortOrder,
  ]);

  const events = useAdminFinanceOperationEvents(params);
  const data = events.data;
  const errorKey = events.error ? getAdminFinanceOperationsErrorKey(events.error) : "errors.generic";

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const queryString = next.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const columns = useMemo<ColumnDef<FinanceOperationEventItem>[]>(
    () => [
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
        cell: (row) => <RowSummary item={row} locale={locale} t={t} />,
      },
      {
        id: "paymentId",
        header: copy.paymentIdLabel,
        accessor: (row) => shortId(row.paymentId),
        cell: (row) => <span className="font-mono text-xs text-text-secondary">{shortId(row.paymentId)}</span>,
        hideOnMobile: true,
      },
      {
        id: "provider",
        header: t("filters.provider"),
        accessor: (row) => row.provider ?? "",
        cell: (row) =>
          row.provider ? (
            <span className="text-sm text-text-primary dark:text-white/90">
              {t(`providers.${row.provider}` as Parameters<typeof t>[0])}
            </span>
          ) : (
            "-"
          ),
        hideOnMobile: true,
      },
      {
        id: "amount",
        header: t("list.headers.amount"),
        accessor: (row) => row.amount ?? "",
        cell: (row) =>
          row.amount && row.currencyCode ? (
            <span className="font-semibold text-text-primary dark:text-white/90">
              {formatMoney(row.amount, row.currencyCode, locale)}
            </span>
          ) : (
            <span className="text-text-muted">{copy.amountUnavailable}</span>
          ),
      },
      {
        id: "status",
        header: copy.statusLabel,
        accessor: (row) => row.paymentStatus ?? row.refundStatus ?? "",
        cell: (row) => <StatusChip item={row} t={t} />,
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
    ],
    [locale, t, copy.amountUnavailable, copy.paymentIdLabel, copy.statusLabel],
  );

  const openPaymentDetail = (row: FinanceOperationEventItem) => {
    if (row.paymentId) {
      router.push(`/admin/payments/${row.paymentId}` as never);
      return;
    }

    router.push(`/admin/admin-operations/${row.id}` as never);
  };

  return (
    <AdminOperationalListShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.note}
      actions={
        <>
          <Link
            href="/admin/admin-operations"
            className="inline-flex items-center gap-2 rounded-full border border-border-light px-4 py-2 text-xs font-semibold text-text-secondary transition hover:border-primary/30 hover:text-primary"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            {copy.fullDiagnosticsAction}
          </Link>
        </>
      }
      summaryCards={
        <AdminSummaryCard
          label={copy.title}
          value={typeof data?.pagination.totalItems === "number" ? data.pagination.totalItems : "..."}
          tone="primary"
        />
      }
      filters={
        <>
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.query")}
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={query}
                onChange={(event) => updateListQuery({ query: event.target.value || null, page: 1 })}
                placeholder={t("filters.queryPlaceholder")}
                className="app-control w-full px-11 py-3"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {copy.paymentIdLabel}
            </span>
            <input
              type="text"
              value={paymentId}
              onChange={(event) =>
                updateListQuery({ paymentId: event.target.value.trim() || null, page: 1 })
              }
              placeholder={copy.paymentIdPlaceholder}
              className="app-control w-full px-4 py-3"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.operationType")}
            </span>
            <select
              value={operationType}
              onChange={(event) =>
                updateListQuery({
                  operationType: event.target.value === DEFAULT_OPERATION_TYPE ? null : event.target.value,
                  page: 1,
                })
              }
              className="app-control w-full px-4 py-3"
            >
              <option value={DEFAULT_OPERATION_TYPE}>{t("types.PAYMENT")}</option>
              {OPERATION_TYPE_FILTERS.filter(
                (value) => value !== "ALL" && value !== DEFAULT_OPERATION_TYPE,
              ).map((value) => (
                <option key={value} value={value}>
                  {t(`types.${value}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.provider")}
            </span>
            <select
              value={provider}
              onChange={(event) =>
                updateListQuery({ provider: event.target.value === "ALL" ? null : event.target.value, page: 1 })
              }
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("filters.all")}</option>
              {PROVIDER_FILTERS.filter((value): value is PaymentProvider => value !== "ALL").map((value) => (
                <option key={value} value={value}>
                  {t(`providers.${value}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {copy.statusLabel}
            </span>
            <select
              value={paymentStatus}
              onChange={(event) =>
                updateListQuery({ paymentStatus: event.target.value === "ALL" ? null : event.target.value, page: 1 })
              }
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("filters.all")}</option>
              {PAYMENT_STATUS_FILTERS.filter((value): value is PaymentStatus => value !== "ALL").map((value) => (
                <option key={value} value={value}>
                  {t(`paymentStatuses.${value}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <AdvancedFiltersToggleButton
            expanded={showAdvancedFilters}
            hasHiddenActive={!showAdvancedFilters && hasAdvancedFilters}
            onToggle={() => setShowAdvancedFilters((prev) => !prev)}
          />

          <FilterClearButton
            disabled={!hasActiveFilters}
            onClick={() =>
              updateListQuery({
                query: null,
                paymentId: null,
                operationType: DEFAULT_OPERATION_TYPE,
                provider: null,
                paymentPurpose: null,
                paymentStatus: null,
                refundStatus: null,
                occurredFrom: null,
                occurredTo: null,
                page: 1,
              })
            }
          />
        </div>

        {showAdvancedFilters ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {copy.paymentPurposesLabel}
              </span>
              <select
                value={paymentPurpose}
                onChange={(event) =>
                  updateListQuery({
                    paymentPurpose: event.target.value === "ALL" ? null : event.target.value,
                    page: 1,
                  })
                }
                className="app-control w-full px-4 py-3"
              >
                <option value="ALL">{t("filters.all")}</option>
                {PAYMENT_PURPOSE_FILTERS.filter(
                  (value): value is AdminPaymentPurpose => value !== "ALL",
                ).map((value) => (
                  <option key={value} value={value}>
                    {t(`paymentPurposes.${value}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {copy.refundStatusesLabel}
              </span>
              <select
                value={refundStatus}
                onChange={(event) =>
                  updateListQuery({
                    refundStatus: event.target.value === "ALL" ? null : event.target.value,
                    page: 1,
                  })
                }
                className="app-control w-full px-4 py-3"
              >
                <option value="ALL">{t("filters.all")}</option>
                {REFUND_STATUS_FILTERS.filter(
                  (value): value is AdminRefundStatus => value !== "ALL",
                ).map((value) => (
                  <option key={value} value={value}>
                    {t(`refundStatuses.${value}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>

            <DateField
              label={copy.createdFromLabel}
              value={occurredFrom}
              onChange={(nextValue) => updateListQuery({ occurredFrom: nextValue || null, page: 1 })}
              placeholder={copy.createdFromPlaceholder}
            />

            <DateField
              label={copy.createdToLabel}
              value={occurredTo}
              onChange={(nextValue) => updateListQuery({ occurredTo: nextValue || null, page: 1 })}
              placeholder={copy.createdToPlaceholder}
            />
          </div>
        ) : null}
        </>
      }
    >

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        getRowId={(row) => row.id}
        loading={events.isLoading}
        error={events.isError ? t(getAdminFinanceOperationsErrorKey(events.error) as Parameters<typeof t>[0]) : null}
        errorState={{
          title: t("states.listError.heading"),
          description: t(getAdminFinanceOperationsErrorKey(events.error) as Parameters<typeof t>[0]),
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
        onRowClick={openPaymentDetail}
        rowActions={(row) => (
          <ActionIconButton
            intent="view"
            label={copy.openPaymentAction}
            icon={<BadgeDollarSign className="h-4 w-4" />}
            onClick={() => openPaymentDetail(row)}
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
          icon: <BadgeDollarSign className="h-5 w-5 text-primary" />,
          title: t("states.empty.heading"),
          description: t("states.empty.note"),
        }}
        ariaLabel={copy.title}
        caption={copy.title}
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
    </AdminOperationalListShell>
  );
}
