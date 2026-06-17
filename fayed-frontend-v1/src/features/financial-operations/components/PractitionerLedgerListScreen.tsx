"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import { usePractitionerProfile } from "@/features/practitioners/hooks/use-practitioners";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam, parseTextParam } from "@/components/ui/data-table";
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
import { getPractitionerLedgerErrorKey } from "../lib/financial-operations-errors";
import { usePractitionerLedger } from "../hooks/use-financial-operations";
import { formatPractitionerOrViewerDateTime } from "@/lib/time-formatting";
import type {
  LedgerEntryType,
  PractitionerLedgerEntry,
  PractitionerLedgerListParams,
  WalletBalanceBucket,
} from "../types/financial-operations.types";

const ENTRY_TYPE_FILTERS: Array<LedgerEntryType | "ALL"> = [
  "ALL",
  "SESSION_GROSS",
  "PLATFORM_COMMISSION",
  "PRACTITIONER_EARNING",
  "COUPON_PLATFORM_SHARE",
  "COUPON_PRACTITIONER_SHARE",
  "REFUND_PLATFORM_REVERSAL",
  "REFUND_PRACTITIONER_REVERSAL",
  "MANUAL_ADJUSTMENT",
  "SETTLEMENT_PAYOUT",
  "SETTLEMENT_REVERSAL",
];

const BALANCE_BUCKET_FILTERS: Array<WalletBalanceBucket | "ALL"> = ["ALL", "AVAILABLE", "PENDING", "RESERVED"];

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

const shortId = (value: string) => {
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

function getReferenceLabel(
  entry: PractitionerLedgerEntry,
  t: ReturnType<typeof useTranslations>,
): string | null {
  if (entry.paymentId) {
    return `${t("ledger.reference.payment")}: ${shortId(entry.paymentId)}`;
  }
  if (entry.sessionId) {
    return `${t("ledger.reference.session")}: ${shortId(entry.sessionId)}`;
  }
  if (entry.settlementId) {
    return `${t("ledger.reference.settlement")}: ${shortId(entry.settlementId)}`;
  }
  if (entry.referenceType && entry.referenceId) {
    return `${t("ledger.reference.generic", { type: entry.referenceType })}: ${shortId(entry.referenceId)}`;
  }

  return null;
}

function getEntryTone(entryType: LedgerEntryType) {
  switch (entryType) {
    case "SESSION_GROSS":
    case "PRACTITIONER_EARNING":
      return "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light";
    case "PLATFORM_COMMISSION":
    case "REFUND_PLATFORM_REVERSAL":
      return "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300";
    case "SETTLEMENT_PAYOUT":
      return "bg-success-50 text-success-700 dark:bg-success-500/12 dark:text-success-300";
    default:
      return "bg-surface-tertiary text-text-muted";
  }
}

export default function PractitionerLedgerListScreen() {
  const t = useTranslations("practitioner-finance");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profileQuery = usePractitionerProfile();
  const practitionerTimeZone = profileQuery.data?.profile.timezone ?? null;

  const entryType = parseEnumParam<LedgerEntryType | "ALL">(searchParams.get("entryType"), ENTRY_TYPE_FILTERS, "ALL");
  const balanceBucket = parseEnumParam<WalletBalanceBucket | "ALL">(
    searchParams.get("balanceBucket"),
    BALANCE_BUCKET_FILTERS,
    "ALL",
  );
  const currencyCode = parseTextParam(searchParams.get("currencyCode"), { maxLength: 8 });
  const paymentId = parseTextParam(searchParams.get("paymentId"), { maxLength: 64 });
  const settlementId = parseTextParam(searchParams.get("settlementId"), { maxLength: 64 });
  const referenceType = parseTextParam(searchParams.get("referenceType"), { maxLength: 32 });
  const effectiveFrom = parseTextParam(searchParams.get("effectiveFrom"), { maxLength: 32 });
  const effectiveTo = parseTextParam(searchParams.get("effectiveTo"), { maxLength: 32 });
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 40,
  });

  const hasActiveFilters =
    entryType !== "ALL" ||
    balanceBucket !== "ALL" ||
    Boolean(currencyCode) ||
    Boolean(paymentId) ||
    Boolean(settlementId) ||
    Boolean(referenceType) ||
    Boolean(effectiveFrom) ||
    Boolean(effectiveTo);

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const params = useMemo<PractitionerLedgerListParams>(
    () => {
      const next: PractitionerLedgerListParams = { page, limit };
      if (entryType !== "ALL") next.entryType = entryType;
      if (balanceBucket !== "ALL") next.balanceBucket = balanceBucket;
      if (currencyCode) next.currencyCode = currencyCode;
      if (paymentId) next.paymentId = paymentId;
      if (settlementId) next.settlementId = settlementId;
      if (referenceType) next.referenceType = referenceType;
      if (effectiveFrom) next.effectiveFrom = effectiveFrom;
      if (effectiveTo) next.effectiveTo = effectiveTo;
      return next;
    },
    [balanceBucket, currencyCode, effectiveFrom, effectiveTo, entryType, limit, page, paymentId, referenceType, settlementId],
  );

  const ledgerQuery = usePractitionerLedger(params);
  const data = ledgerQuery.data;

  const columns = useMemo<ColumnDef<PractitionerLedgerEntry>[]>(
    () => [
      {
        id: "entryType",
        header: locale.startsWith("ar") ? "نوع القيد" : "Entry type",
        accessor: (row) => row.entryType,
        cell: (row) => (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEntryTone(row.entryType)}`}>
            {t(`ledger.entryTypes.${row.entryType}` as Parameters<typeof t>[0])}
          </span>
        ),
      },
      {
        id: "amount",
        header: locale.startsWith("ar") ? "المبلغ" : "Amount",
        accessor: (row) => Number(row.amount),
        cell: (row) => (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {formatMoney(row.amount, row.currency, locale)}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {t(`ledger.directions.${row.direction}` as Parameters<typeof t>[0])} •{" "}
              {t(`ledger.balanceBuckets.${row.balanceBucket}` as Parameters<typeof t>[0])}
            </p>
          </div>
        ),
      },
      {
        id: "reference",
        header: locale.startsWith("ar") ? "المرجع" : "Reference",
        accessor: (row) => row.paymentId ?? row.sessionId ?? row.settlementId ?? row.referenceId ?? "",
        cell: (row) => {
          const reference = getReferenceLabel(row, t);
          return reference ? (
            <span className="text-xs text-text-secondary">{reference}</span>
          ) : (
            <span className="text-xs text-text-muted">-</span>
          );
        },
        hideOnMobile: true,
      },
      {
        id: "effectiveAt",
        header: locale.startsWith("ar") ? "سريان القيد" : "Effective",
        accessor: (row) => new Date(row.effectiveAt).getTime(),
        cell: (row) =>
          formatPractitionerOrViewerDateTime(row.effectiveAt, practitionerTimeZone, {
            locale: locale === "ar" ? "ar-SA" : "en-US",
            fallbackText: "-",
          }),
      },
      {
        id: "createdAt",
        header: locale.startsWith("ar") ? "التسجيل" : "Recorded",
        accessor: (row) => new Date(row.createdAt).getTime(),
        cell: (row) =>
          formatPractitionerOrViewerDateTime(row.createdAt, practitionerTimeZone, {
            locale: locale === "ar" ? "ar-SA" : "en-US",
            fallbackText: "-",
          }),
        hideOnMobile: true,
      },
      {
        id: "description",
        header: locale.startsWith("ar") ? "الوصف" : "Description",
        accessor: (row) => row.description ?? "",
        cell: (row) => (
          <span className="text-xs text-text-secondary">
            {row.description ?? "-"}
          </span>
        ),
        hideOnMobile: true,
      },
    ],
    [locale, t],
  );

  return (
    <div className="space-y-4">
      <PractitionerPageHeader
        eyebrow={t("ledger.eyebrow")}
        title={t("ledger.title")}
        description={t("ledger.note")}
        actions={
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {data ? t("ledger.count", { value: data.pagination.totalItems }) : t("ledger.countLoading")}
          </span>
        }
      />

      <PractitionerStatsGrid cols={4}>
        <PractitionerStatCard
          label={locale.startsWith("ar") ? "إجمالي القيود" : "Entries"}
          value={data ? String(data.pagination.totalItems) : "..."}
          tone="primary"
          metricKey="ledger.entries"
        />
        <PractitionerStatCard
          label={locale.startsWith("ar") ? "القيد المدين" : "Debit focus"}
          value={t("ledger.directions.DEBIT" as Parameters<typeof t>[0])}
          tone="neutral"
          metricKey="ledger.debit"
        />
        <PractitionerStatCard
          label={locale.startsWith("ar") ? "القيود المرتبطة" : "Linked refs"}
          value={paymentId || settlementId || referenceType ? "1+" : "..."}
          tone="success"
          metricKey="ledger.linkedRefs"
        />
        <PractitionerStatCard
          label={locale.startsWith("ar") ? "الصفحة الحالية" : "Current page"}
          value={String(page)}
          tone="warning"
          metricKey="ledger.currentPage"
        />
      </PractitionerStatsGrid>

      <PractitionerFilterCard>
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-light pb-2 dark:border-white/8">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
                {locale.startsWith("ar") ? "فلاتر الدفتر" : "Ledger filters"}
              </h2>
              <p className="mt-0.5 text-xs text-text-muted">
                {locale.startsWith("ar")
                  ? "فلتر القيود حسب النوع والحجم والمرجع والتاريخ."
                  : "Filter ledger entries by type, bucket, reference, and date range."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {locale.startsWith("ar") ? "نوع القيد" : "Entry type"}
              </span>
              <select
                value={entryType}
                onChange={(event) =>
                  updateListQuery({ entryType: event.target.value === "ALL" ? null : event.target.value, page: 1 })
                }
                className="app-control w-full px-4 py-3"
              >
                <option value="ALL">{locale.startsWith("ar") ? "كل الأنواع" : "All types"}</option>
                {ENTRY_TYPE_FILTERS.filter((value) => value !== "ALL").map((value) => (
                  <option key={value} value={value}>
                    {t(`ledger.entryTypes.${value}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {locale.startsWith("ar") ? "حجم الرصيد" : "Balance bucket"}
              </span>
              <select
                value={balanceBucket}
                onChange={(event) =>
                  updateListQuery({ balanceBucket: event.target.value === "ALL" ? null : event.target.value, page: 1 })
                }
                className="app-control w-full px-4 py-3"
              >
                <option value="ALL">{locale.startsWith("ar") ? "كل الأنواع" : "All buckets"}</option>
                {BALANCE_BUCKET_FILTERS.filter((value) => value !== "ALL").map((value) => (
                  <option key={value} value={value}>
                    {t(`ledger.balanceBuckets.${value}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {locale.startsWith("ar") ? "رقم الدفع" : "Payment ID"}
              </span>
              <input
                type="text"
                value={paymentId}
                onChange={(event) => updateListQuery({ paymentId: event.target.value.trim() || null, page: 1 })}
                placeholder={locale.startsWith("ar") ? "ابحث عن الدفع" : "Search payment"}
                className="app-control w-full px-4 py-3"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {locale.startsWith("ar") ? "مرجع التسوية" : "Settlement ID"}
              </span>
              <input
                type="text"
                value={settlementId}
                onChange={(event) =>
                  updateListQuery({ settlementId: event.target.value.trim() || null, page: 1 })
                }
                placeholder={locale.startsWith("ar") ? "ابحث عن التسوية" : "Search settlement"}
                className="app-control w-full px-4 py-3"
              />
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

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {locale.startsWith("ar") ? "نوع المرجع" : "Reference type"}
              </span>
              <input
                type="text"
                value={referenceType}
                onChange={(event) => updateListQuery({ referenceType: event.target.value.trim() || null, page: 1 })}
                placeholder={locale.startsWith("ar") ? "SESSION" : "SESSION"}
                className="app-control w-full px-4 py-3"
              />
            </label>

            <DateField
              label={locale.startsWith("ar") ? "من تاريخ" : "From date"}
              value={effectiveFrom}
              onChange={(nextValue) => updateListQuery({ effectiveFrom: nextValue || null, page: 1 })}
              placeholder={locale.startsWith("ar") ? "YYYY-MM-DD" : "YYYY-MM-DD"}
            />

            <DateField
              label={locale.startsWith("ar") ? "إلى تاريخ" : "To date"}
              value={effectiveTo}
              onChange={(nextValue) => updateListQuery({ effectiveTo: nextValue || null, page: 1 })}
              placeholder={locale.startsWith("ar") ? "YYYY-MM-DD" : "YYYY-MM-DD"}
            />

            <div className="flex items-end justify-end md:col-span-2 xl:col-span-4">
              <FilterClearButton
                disabled={!hasActiveFilters}
                onClick={() =>
                  updateListQuery({
                    entryType: null,
                    balanceBucket: null,
                    currencyCode: null,
                    paymentId: null,
                    settlementId: null,
                    referenceType: null,
                    effectiveFrom: null,
                    effectiveTo: null,
                    page: 1,
                  })
                }
              />
            </div>
          </div>
        </div>
      </PractitionerFilterCard>

      <PractitionerTableSection
        title={locale.startsWith("ar") ? "سجل المعاملات" : "Transactions Log"}
        subtitle={locale.startsWith("ar") ? "قائمة تفصيلية بكل القيود المالية المسجلة لحسابك" : "Detailed list of all ledger entries recorded for your account"}
        flushContent
      >
        <DataTable
          data={data?.items ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={ledgerQuery.isLoading}
          error={ledgerQuery.isError ? t(getPractitionerLedgerErrorKey(ledgerQuery.error)) : null}
          errorState={{
            title: t("ledger.states.error.heading"),
            description: t(getPractitionerLedgerErrorKey(ledgerQuery.error)),
            action: {
              label: t("ledger.states.error.retry"),
              onClick: () => ledgerQuery.refetch(),
            },
          }}
          emptyState={{
            icon: <FileText className="h-5 w-5 text-primary" />,
            title: t("ledger.states.empty.heading"),
            description: t("ledger.states.empty.note"),
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
          ariaLabel={t("ledger.title")}
          caption={t("ledger.title")}
          size="sm"
        />
      </PractitionerTableSection>
    </div>
  );
}
