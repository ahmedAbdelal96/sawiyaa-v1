"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Star } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import Badge from "@/components/ui/badge/Badge";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import AdminOperationalListShell, {
  AdminSummaryCard,
} from "@/components/shared/admin/AdminOperationalListShell";
import type { ColumnDef, SortConfig } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam } from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useAdminReviews } from "../hooks/use-reviews";
import type {
  AdminReviewItem,
  ListAdminReviewsParams,
  ReviewModerationDecision,
  SessionReviewStatus,
} from "../types/reviews.types";

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string | null, locale: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${
            i < rating
              ? "fill-primary text-primary"
              : "fill-transparent text-border-light dark:text-white/20"
          }`}
        />
      ))}
    </span>
  );
}

const STATUS_FILTERS: Array<{ value: SessionReviewStatus | "ALL"; labelKey: string }> = [
  { value: "ALL", labelKey: "all" },
  { value: "PENDING_MODERATION", labelKey: "PENDING_MODERATION" },
  { value: "PUBLISHED", labelKey: "PUBLISHED" },
  { value: "HIDDEN", labelKey: "HIDDEN" },
  { value: "REJECTED", labelKey: "REJECTED" },
  { value: "ARCHIVED", labelKey: "ARCHIVED" },
];

function getReviewOriginalRating(item: AdminReviewItem) {
  return item.originalRatingValue ?? item.overallRating;
}

function getDecisionLabel(t: ReturnType<typeof useTranslations>, decision: ReviewModerationDecision | null) {
  if (!decision) {
    return t("admin.decisions.pending");
  }

  return t(`admin.decisions.${decision}` as Parameters<typeof t>[0]);
}

const PAGE_LIMIT = DEFAULT_PAGE_LIMIT;
const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;
const SORTABLE_COLUMNS = ["submittedAt", "overallRating", "status"] as const;
type SortableReviewsColumn = (typeof SORTABLE_COLUMNS)[number];

export default function AdminReviewsListScreen() {
  const t = useTranslations("reviews");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const statusFilter = parseEnumParam<SessionReviewStatus | "ALL">(
    searchParams.get("status"),
    STATUS_FILTERS.map((item) => item.value),
    "ALL",
  );
  const needsModeration = searchParams.get("needsModeration") === "true";
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), PAGE_LIMIT, {
    min: 1,
    max: 40,
  });
  const sortColumn = parseEnumParam<SortableReviewsColumn>(
    searchParams.get("sortBy"),
    SORTABLE_COLUMNS,
    "submittedAt",
  );
  const sortDirection = parseEnumParam<"asc" | "desc">(
    searchParams.get("sortDir"),
    ["asc", "desc"],
    "desc",
  );
  const sortConfig: SortConfig = { column: sortColumn, direction: sortDirection };
  const hasActiveFilters = statusFilter !== "ALL" || needsModeration;

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const params = useMemo<ListAdminReviewsParams>(() => {
    const next: ListAdminReviewsParams = { page, limit };
    if (statusFilter !== "ALL") next.status = statusFilter;
    if (needsModeration) next.needsModeration = true;
    return next;
  }, [needsModeration, page, statusFilter, limit]);

  const reviews = useAdminReviews(params);
  const data = reviews.data;
  const items = data?.items ?? [];
  const moderationCount = items.filter((item) => item.status === "PENDING_MODERATION").length;
  const publishedCount = items.filter((item) => item.status === "PUBLISHED").length;
  const averageRating =
    items.length > 0
      ? (items.reduce((sum, item) => sum + item.overallRating, 0) / items.length).toFixed(1)
      : "0.0";
  const activeFilterChips = [
    statusFilter !== "ALL"
      ? {
          id: "status",
          label: t(`admin.statuses.${statusFilter}` as Parameters<typeof t>[0]),
        }
      : null,
    needsModeration ? { id: "needsModeration", label: t("admin.list.needsModeration") } : null,
  ].filter(Boolean) as Array<{ id: string; label: string }>;

  const columns = useMemo<ColumnDef<AdminReviewItem>[]>(() => [
    {
      id: "review",
      header: t("admin.table.review"),
      accessor: (row) => row.title ?? row.textReview ?? "",
      cell: (row) => (
        <div
          className={`min-w-[220px] max-w-[340px] space-y-2 rounded-2xl border p-3 ${
            row.status === "PENDING_MODERATION"
              ? "border-warning-200 bg-warning-50/60 dark:border-warning-500/20 dark:bg-warning-500/10"
              : "border-border-light bg-white dark:border-white/10 dark:bg-white/[0.03]"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="light" color="primary" size="sm">
              {t("admin.labels.originalRating", { value: getReviewOriginalRating(row) })}
            </Badge>
            {row.publicRatingValue != null ? (
              <Badge variant="light" color="info" size="sm">
                {t("admin.labels.publicRating", { value: row.publicRatingValue })}
              </Badge>
            ) : null}
            <Badge
              variant="light"
              color={row.countsInPublicAverage ? "success" : "warning"}
              size="sm"
            >
              {row.countsInPublicAverage
                ? t("admin.labels.countsInAverage")
                : t("admin.labels.excludedFromAverage")}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StarRating rating={getReviewOriginalRating(row)} />
            {row.title && (
              <span className="truncate text-xs font-semibold text-text-primary dark:text-white">
                {row.title}
              </span>
            )}
          </div>
          {row.textReview ? (
            <p className="line-clamp-2 whitespace-pre-wrap text-xs leading-relaxed text-text-secondary">
              {row.textReview}
            </p>
          ) : (
            <p className="text-[11px] italic text-text-muted">
              {t("admin.detail.noText")}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "practitioner",
      header: t("admin.table.practitioner"),
      accessor: (row) => row.practitioner.displayName ?? t("admin.list.unknownPractitioner"),
      hideOnMobile: true,
      cell: (row) => (
        <div className="text-xs font-semibold text-text-primary dark:text-white whitespace-nowrap">
          {row.practitioner.displayName ?? t("admin.list.unknownPractitioner")}
        </div>
      ),
    },
    {
      id: "patient",
      header: t("admin.table.patient"),
      accessor: (row) => row.patient.displayName ?? t("admin.detail.patientFallback"),
      hideOnMobile: true,
      cell: (row) => (
        <div className="text-xs text-text-secondary dark:text-slate-300 whitespace-nowrap">
          {row.patient.isAnonymous ? (
            <span className="text-text-muted italic bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded text-[11px]">
              {t("admin.detail.anonymousPatient")}
            </span>
          ) : (
            <span className="font-semibold text-text-primary dark:text-white">
              {row.patient.displayName ?? t("admin.detail.patientFallback")}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "session",
      header: t("admin.table.session"),
      accessor: (row) => row.session.scheduledStartAt ?? "",
      hideOnMobile: true,
      cell: (row) => (
        <div className="text-xs text-text-secondary dark:text-slate-300 whitespace-nowrap">
          {formatDateTime(row.session.scheduledStartAt, locale)}
        </div>
      ),
    },
    {
      id: "status",
      header: t("admin.table.status"),
      accessor: (row) => row.status,
      sortable: true,
      cell: (row) => {
        return (
          <div className="flex flex-wrap gap-2">
            <Badge variant="light" size="sm" color="dark">
              {t(`admin.statuses.${row.status}` as Parameters<typeof t>[0])}
            </Badge>
            {row.moderationDecision ? (
              <Badge
                variant="light"
                size="sm"
                color={
                  row.moderationDecision === "REJECT_PUBLISHING"
                    ? "error"
                    : row.moderationDecision === "EXCLUDE_FROM_PUBLIC_AVERAGE"
                      ? "warning"
                      : row.moderationDecision === "INTERNAL_NOTE_ONLY"
                        ? "info"
                        : "success"
                }
              >
                {getDecisionLabel(t, row.moderationDecision)}
              </Badge>
            ) : row.status === "PENDING_MODERATION" ? (
              <Badge variant="light" size="sm" color="warning">
                {t("admin.decisions.pending")}
              </Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "overallRating",
      header: t("admin.table.rating"),
      accessor: (row) => getReviewOriginalRating(row),
      sortable: true,
      align: "center",
      cell: (row) => (
        <div className="space-y-1 text-center">
          <span className="text-xs font-semibold text-text-primary">{getReviewOriginalRating(row)}/5</span>
          {row.publicRatingValue != null ? (
            <p className="text-[11px] text-text-muted">
              {t("admin.labels.publicRating", { value: row.publicRatingValue })}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "submittedAt",
      header: t("admin.table.submitted"),
      accessor: (row) => (row.submittedAt ? new Date(row.submittedAt).getTime() : null),
      sortable: true,
      hideOnMobile: true,
      cell: (row) => formatDate(row.submittedAt, locale),
    },
  ], [locale, t]);

  return (
    <AdminOperationalListShell
      title={t("admin.list.heading")}
      description={data?.pagination ? t("admin.list.count", { value: data.pagination.totalItems }) : undefined}
        summaryCards={
        <>
          <AdminSummaryCard
            label={t("admin.list.heading")}
            value={data?.pagination?.totalItems ?? 0}
            tone="primary"
            icon={<Star className="h-4 w-4" />}
          />
          <AdminSummaryCard
            label={t("admin.list.needsModeration")}
            value={moderationCount}
            tone="warning"
            icon={<Star className="h-4 w-4" />}
          />
          <AdminSummaryCard
            label={t("admin.statuses.PUBLISHED")}
            value={publishedCount}
            tone="success"
            icon={<Star className="h-4 w-4" />}
          />
          <AdminSummaryCard
            label={t("admin.summary.average")}
            value={`${averageRating}/5`}
            tone="neutral"
            icon={<Star className="h-4 w-4" />}
          />
        </>
      }
      filters={
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.statuses.all")}
              </span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  updateListQuery({
                    status: event.target.value === "ALL" ? null : event.target.value,
                    page: 1,
                  })
                }
                className="app-control w-full px-4 py-3"
              >
                {STATUS_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {t(`admin.statuses.${filter.labelKey}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-sm text-text-primary dark:bg-white/5 dark:text-white/90">
              <input
                type="checkbox"
                checked={needsModeration}
                onChange={(event) =>
                  updateListQuery({
                    needsModeration: event.target.checked ? "true" : null,
                    page: 1,
                  })
                }
                className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
              />
              {t("admin.list.needsModeration")}
            </label>
          </div>

          <div className="flex justify-end">
            <FilterClearButton
              disabled={!hasActiveFilters}
              onClick={() =>
                updateListQuery({
                  status: null,
                  needsModeration: null,
                  page: 1,
                })
              }
            />
          </div>
        </div>
      }
    >
      <DataTable
        data={items}
        columns={columns}
        getRowId={(row) => row.id}
        loading={reviews.isLoading}
        error={reviews.isError ? t("admin.states.listError.message") : null}
        errorState={{
          title: t("admin.states.listError.heading"),
          description: t("admin.states.listError.message"),
          action: {
            label: t("admin.states.listError.retry"),
            onClick: () => reviews.refetch(),
          },
        }}
        emptyState={{
          icon: <Star className="h-5 w-5 text-primary" />,
          title: t("admin.states.empty.heading"),
          description: t("admin.states.empty.note"),
        }}
        sortConfig={sortConfig}
        onSortChange={(nextSort) =>
          updateListQuery({
            sortBy: nextSort.column,
            sortDir: nextSort.direction,
          })
        }
        rowActions={(row) => (
          <ActionIconButton
            intent="view"
            label={locale === "ar" ? "عرض" : "Open"}
            icon={<Star className="h-4 w-4" />}
            onClick={() => router.push(`/admin/reviews/${row.id}` as never)}
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
        ariaLabel={t("admin.list.heading")}
        caption={t("admin.list.heading")}
      />
    </AdminOperationalListShell>
  );
}
