"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Star, Eye } from "lucide-react";
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

function formatDateTimeLines(iso: string | null, locale: string): { date: string; time: string } {
  if (!iso) return { date: "-", time: "" };
  const dateObj = new Date(iso);
  const dateStr = dateObj.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date: dateStr, time: timeStr };
}

function StarRatingInline({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-border-light dark:text-white/20"
          }`}
        />
      ))}
      <span className="ms-1 text-xs font-semibold text-text-primary dark:text-white">{rating}/5</span>
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
      id: "practitioner",
      header: t("admin.table.practitioner"),
      accessor: (row) => row.practitioner.displayName ?? t("admin.list.unknownPractitioner"),
      cell: (row) => (
        <div className="text-xs font-semibold text-text-primary dark:text-white truncate max-w-[150px]" title={row.practitioner.displayName ?? t("admin.list.unknownPractitioner")}>
          {row.practitioner.displayName ?? t("admin.list.unknownPractitioner")}
        </div>
      ),
    },
    {
      id: "patient",
      header: t("admin.table.patient"),
      accessor: (row) => row.patient.displayName ?? t("admin.detail.patientFallback"),
      cell: (row) => (
        <div className="text-xs text-text-secondary dark:text-slate-300 truncate max-w-[140px]">
          {row.patient.isAnonymous ? (
            <span className="text-text-muted italic bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded text-[11px]">
              {t("admin.detail.anonymousPatient")}
            </span>
          ) : (
            <span className="font-semibold text-text-primary dark:text-white" title={row.patient.displayName ?? t("admin.detail.patientFallback")}>
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
      cell: (row) => {
        const { date, time } = formatDateTimeLines(row.session.scheduledStartAt, locale);
        return (
          <div className="text-xs leading-normal whitespace-nowrap">
            <div className="font-medium text-text-primary dark:text-white">{date}</div>
            <div className="text-[11px] text-text-muted">{time}</div>
          </div>
        );
      },
    },
    {
      id: "overallRating",
      header: (
        <span title={t("admin.table.patientRating") || "Patient Rating"}>
          {t("admin.table.patientRating")}
        </span>
      ),
      accessor: (row) => getReviewOriginalRating(row),
      sortable: true,
      align: "start" as const,
      cell: (row) => (
        <div className="whitespace-nowrap">
          <StarRatingInline rating={getReviewOriginalRating(row)} />
        </div>
      ),
    },
    {
      id: "publicRating",
      header: (
        <span title={t("admin.table.publicRating") || "Public Rating"}>
          {t("admin.table.publicRating")}
        </span>
      ),
      accessor: (row) => row.publicRatingValue ?? getReviewOriginalRating(row),
      cell: (row) => {
        const isModified = row.publicRatingValue != null && row.publicRatingValue !== getReviewOriginalRating(row);
        const ratingToDisplay = row.publicRatingValue ?? getReviewOriginalRating(row);
        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs font-semibold text-text-primary dark:text-white">{ratingToDisplay}/5</span>
            {isModified && (
              <span className="inline-flex items-center rounded-sm bg-info-50 px-1 py-0.5 text-[10px] font-medium text-info-700 dark:bg-info-500/10 dark:text-info-400">
                {locale === "ar" ? "معدّل" : "Modified"}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "averageInclusion",
      header: (
        <span title={t("admin.table.averageInclusion") || "Counts in Average"}>
          {t("admin.table.averageInclusion")}
        </span>
      ),
      accessor: (row) => row.countsInPublicAverage,
      cell: (row) => {
        const included = row.countsInPublicAverage;
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${
            included
              ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
              : "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400"
          }`}>
            {included
              ? (locale === "ar" ? "محتسب" : "Included")
              : (locale === "ar" ? "غير محتسب" : "Excluded")}
          </span>
        );
      },
    },
    {
      id: "comment",
      header: t("admin.table.comment"),
      accessor: (row) => row.textReview ?? "",
      cell: (row) => {
        const hasComment = Boolean(row.textReview);
        return (
          <div className="min-w-[160px] max-w-[220px] text-xs overflow-hidden">
            {row.title && <div className="font-semibold text-text-primary dark:text-white truncate mb-0.5" title={row.title}>{row.title}</div>}
            <div className="line-clamp-2 text-text-secondary dark:text-slate-300 leading-normal break-words">
              {row.textReview || (locale === "ar" ? "لا يوجد تعليق" : "No comment")}
            </div>
            {hasComment && (
              <button
                onClick={() => router.push(`/admin/reviews/${row.id}` as never)}
                className="mt-1 text-[11px] font-semibold text-primary hover:underline block text-start"
              >
                {locale === "ar" ? "عرض" : "View"}
              </button>
            )}
          </div>
        );
      },
    },
    {
      id: "status",
      header: t("admin.table.publicationStatus"),
      accessor: (row) => row.status,
      sortable: true,
      cell: (row) => (
        <div className="whitespace-nowrap">
          <Badge variant="light" size="sm" color="dark">
            {t(`admin.statuses.${row.status}` as Parameters<typeof t>[0])}
          </Badge>
        </div>
      ),
    },
    {
      id: "moderationDecision",
      header: t("admin.table.moderationDecision"),
      accessor: (row) => row.moderationDecision ?? "",
      cell: (row) => {
        if (row.moderationDecision) {
          return (
            <div className="whitespace-nowrap">
              <Badge
                variant="light"
                size="sm"
                color={
                  row.moderationDecision === "REJECTED_PUBLISHING"
                    ? "error"
                    : row.moderationDecision === "EXCLUDED_FROM_PUBLIC_AVERAGE"
                      ? "warning"
                      : row.moderationDecision === "INTERNAL_NOTE_ONLY"
                        ? "info"
                        : "success"
                }
              >
                {getDecisionLabel(t, row.moderationDecision)}
              </Badge>
            </div>
          );
        }
        if (row.status === "PENDING_MODERATION") {
          return (
            <div className="whitespace-nowrap">
              <Badge variant="light" size="sm" color="warning">
                {t("admin.decisions.pending")}
              </Badge>
            </div>
          );
        }
        return <span className="text-text-muted text-xs italic">—</span>;
      },
    },
    {
      id: "actions",
      header: locale === "ar" ? "الإجراءات" : "Actions",
      align: "center" as const,
      cell: (row) => {
        const isPending = row.status === "PENDING_MODERATION";
        return (
          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
            {isPending ? (
              <button
                onClick={() => router.push(`/admin/reviews/${row.id}` as never)}
                className="text-xs font-semibold text-primary hover:underline whitespace-nowrap bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-lg"
              >
                {locale === "ar" ? "مراجعة واعتماد" : "Review & Approve"}
              </button>
            ) : (
              <button
                onClick={() => router.push(`/admin/reviews/${row.id}` as never)}
                className="text-xs font-medium text-text-secondary hover:underline whitespace-nowrap bg-surface-secondary hover:bg-surface-tertiary px-2.5 py-1 rounded-lg border border-border-light"
              >
                {locale === "ar" ? "عرض التفاصيل" : "View Details"}
              </button>
            )}
          </div>
        );
      },
    },
  ], [locale, t, router]);

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
        tableClassName="w-max table-auto"
        className="w-full max-w-full overflow-hidden always-visible-scrollbar"
        size="sm"
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
        getRowClassName={(row) =>
          row.status === "PENDING_MODERATION"
            ? "bg-warning-50/10 hover:bg-warning-50/20 dark:bg-warning-500/[0.01] dark:hover:bg-warning-500/[0.02]"
            : ""
        }
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
