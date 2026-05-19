"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Star } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import AdminOperationalListShell, {
  AdminSummaryCard,
} from "@/components/shared/admin/AdminOperationalListShell";
import type { ColumnDef, SortConfig } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam } from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useAdminReviews } from "../hooks/use-reviews";
import type { AdminReviewItem, ListAdminReviewsParams, SessionReviewStatus } from "../types/reviews.types";

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
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

const STATUS_BADGE: Partial<Record<SessionReviewStatus, string>> = {
  PENDING_MODERATION:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300",
  PUBLISHED:
    "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300",
  REJECTED: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300",
  HIDDEN: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/60",
  ARCHIVED: "bg-zinc-100 text-zinc-500 dark:bg-white/8 dark:text-white/40",
  DRAFT: "bg-primary-light text-text-brand",
  SUBMITTED: "bg-primary-light text-text-brand",
};

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
      header: "Review",
      accessor: (row) => row.title ?? row.textReview ?? "",
      cell: (row) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StarRating rating={row.overallRating} />
            <p className="truncate text-sm font-medium text-text-primary dark:text-white/95">
              {row.title || row.practitioner.displayName || t("admin.list.unknownPractitioner")}
            </p>
          </div>
          {row.textReview ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">
              {row.textReview}
            </p>
          ) : null}
          <p className="mt-1.5 text-xs text-text-muted">
            {row.practitioner.displayName ?? t("admin.list.unknownPractitioner")}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => row.status,
      sortable: true,
      cell: (row) => {
        const badgeClass =
          STATUS_BADGE[row.status] ?? "bg-surface-tertiary text-text-muted dark:bg-white/10";
        return (
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass}`}>
            {t(`admin.statuses.${row.status}` as Parameters<typeof t>[0])}
          </span>
        );
      },
    },
    {
      id: "overallRating",
      header: "Rating",
      accessor: (row) => row.overallRating,
      sortable: true,
      align: "center",
      cell: (row) => <span className="text-xs text-text-secondary">{row.overallRating}/5</span>,
    },
    {
      id: "submittedAt",
      header: "Submitted",
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
            label="Avg"
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
