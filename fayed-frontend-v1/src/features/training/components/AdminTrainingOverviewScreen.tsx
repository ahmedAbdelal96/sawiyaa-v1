"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  BookOpenText,
  Clock3,
  CircleOff,
  Plus,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import Button from "@/components/ui/button/Button";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import AdminOperationalListShell, {
  AdminSummaryCard,
} from "@/components/shared/admin/AdminOperationalListShell";
import type { ColumnDef, SortConfig } from "@/components/ui/data-table";
import {
  buildUpdatedSearchParams,
  parseEnumParam,
  parsePositiveIntParam,
  parseTextParam,
} from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useAuthState } from "@/stores/auth-store";
import { useAdminTrainings } from "../hooks/use-training";
import {
  formatTrainingDatetime,
  getOpenSchedulesCount,
  getStatusToneClasses,
} from "./training-utils";
import AdminTrainingCreateModal from "./AdminTrainingCreateModal";
import type {
  AdminTrainingItem,
  AdminTrainingCatalogSummary,
} from "../types/training.types";

const STATUS_FILTERS = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const PAGE_LIMIT = DEFAULT_PAGE_LIMIT;
const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;
const SORTABLE_COLUMNS = [
  "title",
  "status",
  "visibility",
  "courseType",
  "schedules",
  "publishedAt",
  "updatedAt",
] as const;
type SortableTrainingColumn = (typeof SORTABLE_COLUMNS)[number];

function formatCount(locale: string, value?: number) {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US").format(value);
}

function getLifecycleTone(status: AdminTrainingItem["status"]) {
  if (status === "PUBLISHED") return "emerald" as const;
  if (status === "DRAFT") return "amber" as const;
  return "slate" as const;
}

function getAvailabilityTone(state: "open" | "closed" | "ended" | "draft") {
  if (state === "open") return "emerald" as const;
  if (state === "closed") return "amber" as const;
  return "slate" as const;
}

function getAvailabilityState(item: AdminTrainingItem) {
  const openSchedules = getOpenSchedulesCount(item);

  if (item.status === "ARCHIVED") return "ended" as const;
  if (item.status === "DRAFT") return "draft" as const;
  if (openSchedules > 0) return "open" as const;
  return "closed" as const;
}

function getAvailabilityLabel(
  t: ReturnType<typeof useTranslations>,
  item: AdminTrainingItem,
) {
  const state = getAvailabilityState(item);
  if (state === "open") return t("admin.list.availability.open");
  if (state === "closed") return t("admin.list.availability.closed");
  if (state === "ended") return t("admin.list.availability.ended");
  return t("admin.list.availability.draft");
}

function getLifecycleLabel(
  t: ReturnType<typeof useTranslations>,
  item: AdminTrainingItem,
) {
  return t(`statuses.course.${item.status}` as Parameters<typeof t>[0]);
}

export default function AdminTrainingOverviewScreen() {
  const t = useTranslations("training");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthState();
  const canManage = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const statusFilter = parseEnumParam<(typeof STATUS_FILTERS)[number]>(
    searchParams.get("status"),
    STATUS_FILTERS,
    "ALL",
  );
  const searchQuery = parseTextParam(searchParams.get("q"), { maxLength: 120 });
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), PAGE_LIMIT, {
    min: 1,
    max: 40,
  });
  const sortColumn = parseEnumParam<SortableTrainingColumn>(
    searchParams.get("sortBy"),
    SORTABLE_COLUMNS,
    "updatedAt",
  );
  const sortDirection = parseEnumParam<"asc" | "desc">(
    searchParams.get("sortDir"),
    ["asc", "desc"],
    "desc",
  );
  const sortConfig: SortConfig = { column: sortColumn, direction: sortDirection };
  const hasActiveFilters = statusFilter !== "ALL" || Boolean(searchQuery.trim());

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const listParams = {
    page,
    limit,
    ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    ...(searchQuery.trim() ? { q: searchQuery.trim() } : {}),
  };

  const trainingsQuery = useAdminTrainings(listParams);
  const data = trainingsQuery.data;
  const summary: AdminTrainingCatalogSummary | undefined = data?.summary;

  const columns: ColumnDef<AdminTrainingItem>[] = useMemo(
    () => [
      {
        id: "title",
        header: t("admin.list.columns.training"),
        accessor: (row) => row.title,
        sortable: true,
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
              {row.title}
            </p>
            <p className="mt-1 font-mono text-xs text-text-muted">{row.slug}</p>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-text-secondary">
              {row.shortDescription ?? t("admin.fallbackDescription")}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        header: t("admin.list.columns.status"),
        accessor: (row) => row.status,
        sortable: true,
        cell: (row) => (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusToneClasses(
              getLifecycleTone(row.status),
            )}`}
          >
            {getLifecycleLabel(t, row)}
          </span>
        ),
      },
      {
        id: "availability",
        header: t("admin.list.columns.availability"),
        accessor: (row) => getAvailabilityLabel(t, row),
        cell: (row) => {
          const state = getAvailabilityState(row);
          return (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusToneClasses(
                getAvailabilityTone(state),
              )}`}
            >
              {getAvailabilityLabel(t, row)}
            </span>
          );
        },
      },
      {
        id: "visibility",
        header: t("admin.list.columns.visibility"),
        accessor: (row) => row.visibility,
        sortable: true,
        hideOnMobile: true,
        cell: (row) => (
          <span className="app-chip rounded-full px-2.5 py-1 text-xs font-medium">
            {t(`statuses.visibility.${row.visibility}` as Parameters<typeof t>[0])}
          </span>
        ),
      },
      {
        id: "courseType",
        header: t("admin.list.columns.type"),
        accessor: (row) => t(`courseTypes.${row.courseType}` as Parameters<typeof t>[0]),
        sortable: true,
        hideOnMobile: true,
      },
      {
        id: "schedules",
        header: t("admin.list.columns.schedules"),
        accessor: (row) =>
          t("admin.list.scheduleSummary", {
            total: row.schedules.length,
            open: getOpenSchedulesCount(row),
          }),
        sortable: true,
        cell: (row) => (
          <div className="space-y-1">
            <p className="text-xs font-medium text-text-primary dark:text-white/90">
              {t("admin.list.scheduleSummary", {
                total: row.schedules.length,
                open: getOpenSchedulesCount(row),
              })}
            </p>
            <p className="text-xs text-text-secondary">
              {row.schedules.length > 0
                ? row.schedules
                    .slice(0, 2)
                    .map((schedule) =>
                      t("admin.cards.scheduleLine", {
                        code: schedule.scheduleCode,
                        status: t(
                          `statuses.schedule.${schedule.status}` as Parameters<typeof t>[0],
                        ),
                      }),
                    )
                    .join(" • ")
                : t("admin.list.scheduleSnapshotNone")}
            </p>
          </div>
        ),
      },
      {
        id: "publishedAt",
        header: t("admin.list.columns.published"),
        accessor: (row) => (row.publishedAt ? new Date(row.publishedAt).getTime() : null),
        sortable: true,
        hideOnMobile: true,
        cell: (row) =>
          row.publishedAt
            ? formatTrainingDatetime(row.publishedAt, locale)
            : t("admin.cards.notPublished"),
      },
      {
        id: "updatedAt",
        header: t("admin.list.columns.updated"),
        accessor: (row) => (row.updatedAt ? new Date(row.updatedAt).getTime() : null),
        sortable: true,
        hideOnMobile: true,
        cell: (row) => (row.updatedAt ? formatTrainingDatetime(row.updatedAt, locale) : "-"),
      },
    ],
    [locale, t],
  );

  const statCards = [
    {
      label: t("admin.summary.cards.total"),
      value: formatCount(locale, summary?.total),
      hint: t("admin.summary.cards.totalNote"),
      tone: "primary" as const,
      icon: <BookOpenText className="h-4 w-4" />,
    },
    {
      label: t("admin.summary.cards.openNow"),
      value: formatCount(locale, summary?.openForEnrollment),
      hint: t("admin.summary.cards.openNowNote"),
      tone: "success" as const,
      icon: <Clock3 className="h-4 w-4" />,
    },
    {
      label: t("admin.summary.cards.closed"),
      value: formatCount(locale, summary?.closedForEnrollment),
      hint: t("admin.summary.cards.closedNote"),
      tone: "warning" as const,
      icon: <CircleOff className="h-4 w-4" />,
    },
    {
      label: t("admin.summary.cards.ended"),
      value: formatCount(locale, summary?.archived),
      hint: t("admin.summary.cards.endedNote"),
      tone: "neutral" as const,
      icon: <Archive className="h-4 w-4" />,
    },
  ];
  const activeFilterChips = [
    statusFilter !== "ALL"
      ? { id: "status", label: t(`statuses.course.${statusFilter}` as Parameters<typeof t>[0]) }
      : null,
    searchQuery.trim() ? { id: "query", label: searchQuery.trim() } : null,
  ].filter(Boolean) as Array<{ id: string; label: string }>;

  return (
    <AdminOperationalListShell
      eyebrow={t("admin.eyebrow")}
      title={t("admin.title")}
      description={t("admin.note")}
      actions={
        canManage ? (
          <Button startIcon={<Plus className="h-4 w-4" />} onClick={() => setIsCreateOpen(true)}>
            {t("admin.create.open")}
          </Button>
        ) : undefined
      }
      notice={
        <section className="app-panel-soft rounded-[26px] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("admin.summary.cards.total")}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95">
                {formatCount(locale, summary?.total)}
              </p>
              <p className="mt-1 text-sm text-text-secondary">{t("admin.filters.note")}</p>
            </div>

            <div className="max-w-full sm:max-w-[34rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("admin.filters.search")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeFilterChips.length > 0 ? (
                  activeFilterChips.map((chip) => (
                    <span
                      key={chip.id}
                      className="app-chip rounded-full px-3 py-1.5 text-xs text-text-secondary dark:text-white/80"
                    >
                      {chip.label}
                    </span>
                  ))
                ) : (
                  <span className="app-chip rounded-full px-3 py-1.5 text-xs text-text-secondary dark:text-white/80">
                    {t("admin.filters.allStatuses")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      }
      summaryCards={
        <>
          {statCards.map((card) => (
            <AdminSummaryCard
              key={card.label}
              label={card.label}
              value={card.value}
              hint={card.hint}
              tone={card.tone}
              icon={card.icon}
            />
          ))}
        </>
      }
      filters={
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
                {t("admin.filters.heading")}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">{t("admin.filters.note")}</p>
            </div>
            <FilterClearButton
              disabled={!hasActiveFilters}
              onClick={() =>
                updateListQuery({
                  status: null,
                  q: null,
                  page: 1,
                })
              }
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.filters.allStatuses")}
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
                <option value="ALL">{t("admin.filters.allStatuses")}</option>
                {STATUS_FILTERS.filter((status) => status !== "ALL").map((status) => (
                  <option key={status} value={status}>
                    {t(`statuses.course.${status}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.filters.search")}
              </span>
              <input
                value={searchQuery}
                onChange={(event) =>
                  updateListQuery({
                    q: event.target.value || null,
                    page: 1,
                  })
                }
                placeholder={t("admin.filters.searchPlaceholder")}
                className="app-control w-full px-4 py-3"
              />
            </label>
          </div>
        </div>
      }
    >

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        getRowId={(row) => row.id}
        loading={trainingsQuery.isLoading}
        error={trainingsQuery.isError ? t("admin.states.error.note") : null}
        errorState={{
          title: t("admin.states.error.heading"),
          description: t("admin.states.error.note"),
          action: {
            label: t("admin.states.error.retry"),
            onClick: () => trainingsQuery.refetch(),
          },
        }}
        emptyState={{
          icon: <BookOpenText className="h-5 w-5 text-primary" />,
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
        onRowClick={(row) => router.push(`/admin/training/${row.id}` as never)}
        rowActions={(row) => (
          <ActionIconButton
            intent="manage"
            label={t("admin.list.manage")}
            icon={<BookOpenText className="h-4 w-4" />}
            onClick={() => router.push(`/admin/training/${row.id}` as never)}
          />
        )}
        rowActionsHeader={t("admin.list.actionsHeader")}
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
        ariaLabel={t("admin.title")}
        caption={t("admin.title")}
      />

      <AdminTrainingCreateModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </AdminOperationalListShell>
  );
}
