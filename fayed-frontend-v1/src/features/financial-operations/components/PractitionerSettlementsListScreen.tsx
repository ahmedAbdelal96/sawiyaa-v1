"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Layers } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import {
  buildUpdatedSearchParams,
  parseEnumParam,
  parsePositiveIntParam,
  parseTextParam,
} from "@/components/ui/data-table";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import DateField from "@/components/form/input/DateField";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import {
  PractitionerPageHeader,
  PractitionerStatsGrid,
  PractitionerStatCard,
  PractitionerFilterCard,
  PractitionerTableSection,
} from "@/components/shared/practitioner/PractitionerWorkspaceKit";
import { getPractitionerSettlementsErrorKey } from "../lib/financial-operations-errors";
import { usePractitionerSettlements } from "../hooks/use-financial-operations";
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

const STATUS_STYLES: Record<PractitionerSettlementStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70",
  READY: "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light",
  PROCESSING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  FAILED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  CANCELLED: "bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-white/60",
};

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

function shortId(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function getStatusTone(status: PractitionerSettlementStatus) {
  return STATUS_STYLES[status] ?? "app-chip";
}

export default function PractitionerSettlementsListScreen() {
  const t = useTranslations("practitioner-finance");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const settlementStatus = parseEnumParam<PractitionerSettlementStatus | "ALL">(
    searchParams.get("status"),
    STATUS_FILTERS,
    "ALL",
  );
  const currencyCode = parseTextParam(searchParams.get("currencyCode"), { maxLength: 8 });
  const createdFrom = parseTextParam(searchParams.get("createdFrom"), { maxLength: 32 });
  const createdTo = parseTextParam(searchParams.get("createdTo"), { maxLength: 32 });
  const settlementPage = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const settlementLimit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 40,
  });

  const hasSettlementFilters =
    settlementStatus !== "ALL" || Boolean(currencyCode) || Boolean(createdFrom) || Boolean(createdTo);

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const params = useMemo<PractitionerSettlementListParams>(
    () => ({
      page: settlementPage,
      limit: settlementLimit,
      status: settlementStatus === "ALL" ? undefined : settlementStatus,
      currencyCode: currencyCode || undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
    }),
    [createdFrom, createdTo, currencyCode, settlementLimit, settlementPage, settlementStatus],
  );

  const settlementsQuery = usePractitionerSettlements(params);
  const data = settlementsQuery.data;

  const columns = useMemo<ColumnDef<PractitionerSettlementItem>[]>(
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
        cell: (row) => <span className="font-semibold text-text-primary dark:text-white/95">{formatMoney(row.amountNet, row.currency, locale)}</span>,
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
        header: locale.startsWith("ar") ? "الدُفعة" : "Batch",
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
        cell: (row) => formatDateTime(row.createdAt, locale),
      },
      {
        id: "paidAt",
        header: locale.startsWith("ar") ? "صُرفت" : "Paid",
        accessor: (row) => (row.paidAt ? new Date(row.paidAt).getTime() : 0),
        cell: (row) => <span className="text-xs text-text-secondary">{formatDateTime(row.paidAt, locale)}</span>,
        hideOnMobile: true,
      },
      {
        id: "failedAt",
        header: locale.startsWith("ar") ? "فشلت" : "Failed",
        accessor: (row) => (row.failedAt ? new Date(row.failedAt).getTime() : 0),
        cell: (row) => <span className="text-xs text-text-secondary">{formatDateTime(row.failedAt, locale)}</span>,
        hideOnMobile: true,
      },
    ],
    [locale, t],
  );

  return (
    <div className="space-y-4">
      <PractitionerPageHeader
        eyebrow={t("settlements.eyebrow")}
        title={t("settlements.title")}
        description={t("settlements.note")}
        actions={
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {data ? t("settlements.count", { value: data.pagination.totalItems }) : t("settlements.countLoading")}
          </span>
        }
      />

      <PractitionerStatsGrid cols={2}>
        <PractitionerStatCard
          label={locale.startsWith("ar") ? "إجمالي التسويات" : "Settlements"}
          value={data ? String(data.pagination.totalItems) : "..."}
          tone="primary"
          metricKey="settlements.total"
        />
        <PractitionerStatCard
          label={locale.startsWith("ar") ? "الصفحة الحالية" : "Current page"}
          value={String(settlementPage)}
          tone="neutral"
          metricKey="settlements.currentPage"
        />
      </PractitionerStatsGrid>

      <PractitionerFilterCard
        title={locale.startsWith("ar") ? "فلاتر التسويات" : "Settlement filters"}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {locale.startsWith("ar") ? "الحالة" : "Status"}
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
                    ? locale.startsWith("ar")
                      ? "كل الحالات"
                      : "All statuses"
                    : t(`settlements.statuses.${status}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {locale.startsWith("ar") ? "العملة" : "Currency"}
            </span>
            <input
              type="text"
              value={currencyCode}
              onChange={(event) => updateListQuery({ currencyCode: event.target.value.trim() || null, page: 1 })}
              placeholder="EGP"
              className="app-control w-full px-4 py-3"
            />
          </label>

          <DateField
            label={locale.startsWith("ar") ? "من تاريخ" : "From date"}
            value={createdFrom}
            onChange={(nextValue) => updateListQuery({ createdFrom: nextValue || null, page: 1 })}
            placeholder={locale.startsWith("ar") ? "YYYY-MM-DD" : "YYYY-MM-DD"}
          />

          <DateField
            label={locale.startsWith("ar") ? "إلى تاريخ" : "To date"}
            value={createdTo}
            onChange={(nextValue) => updateListQuery({ createdTo: nextValue || null, page: 1 })}
            placeholder={locale.startsWith("ar") ? "YYYY-MM-DD" : "YYYY-MM-DD"}
          />

          <div className="flex items-end justify-end md:col-span-2 xl:col-span-4">
            <FilterClearButton
              disabled={!hasSettlementFilters && settlementPage === 1}
              onClick={() =>
                updateListQuery({
                  status: null,
                  currencyCode: null,
                  createdFrom: null,
                  createdTo: null,
                  page: 1,
                })
              }
            />
          </div>
        </div>
      </PractitionerFilterCard>

      <PractitionerTableSection flushContent>
        <DataTable
          data={data?.items ?? []}
          columns={columns}
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
          pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
          ariaLabel={t("settlements.title")}
          caption={t("settlements.title")}
          size="sm"
        />
      </PractitionerTableSection>
    </div>
  );
}
