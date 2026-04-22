"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { BookOpenText, Plus } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import Button from "@/components/ui/button/Button";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import type { ColumnDef, SortConfig } from "@/components/ui/data-table";
import {
  buildUpdatedSearchParams,
  parseEnumParam,
  parsePositiveIntParam,
  parseTextParam,
} from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useAuthState } from "@/stores/auth-store";
import {
  useAdminTrainings,
  useCreateAdminTraining,
} from "../hooks/use-training";
import { getAdminTrainingErrorKey } from "../lib/admin-training-errors";
import {
  formatTrainingDatetime,
  getOpenSchedulesCount,
  getStatusToneClasses,
} from "./training-utils";
import type {
  AdminTrainingItem,
  CourseType,
  CourseVisibility,
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

export default function AdminTrainingOverviewScreen() {
  const t = useTranslations("training");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthState();
  const canManage = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

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
  const createMutation = useCreateAdminTraining();

  const [createForm, setCreateForm] = useState({
    locale,
    title: "",
    slug: "",
    courseType: "LIVE" as CourseType,
    visibility: "PUBLIC" as CourseVisibility,
    shortDescription: "",
    fullDescription: "",
  });
  const [createFeedback, setCreateFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  const columns: ColumnDef<AdminTrainingItem>[] = [
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
            row.status === "PUBLISHED" ? "emerald" : row.status === "DRAFT" ? "amber" : "slate",
          )}`}
        >
          {t(`statuses.course.${row.status}` as Parameters<typeof t>[0])}
        </span>
      ),
    },
    {
      id: "visibility",
      header: t("admin.list.columns.visibility"),
      accessor: (row) => row.visibility,
      sortable: true,
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
      cell: (row) =>
        row.updatedAt ? formatTrainingDatetime(row.updatedAt, locale) : "-",
    },
  ];

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateFeedback(null);

    if (!createForm.title.trim() || !createForm.slug.trim()) {
      setCreateFeedback({
        tone: "error",
        message: t("admin.create.validation.required"),
      });
      return;
    }

    if (!slugPattern.test(createForm.slug.trim())) {
      setCreateFeedback({
        tone: "error",
        message: t("admin.create.validation.slug"),
      });
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        locale: createForm.locale,
        title: createForm.title.trim(),
        slug: createForm.slug.trim(),
        courseType: createForm.courseType,
        visibility: createForm.visibility,
        shortDescription: createForm.shortDescription.trim() || undefined,
        fullDescription: createForm.fullDescription.trim() || undefined,
      });
      setCreateFeedback({
        tone: "success",
        message: t("admin.create.success"),
      });
      setCreateForm((current) => ({
        ...current,
        title: "",
        slug: "",
        shortDescription: "",
        fullDescription: "",
      }));
      router.push(`/admin/training/${result.id}` as never);
    } catch (error) {
      setCreateFeedback({
        tone: "error",
        message: t(getAdminTrainingErrorKey(error) as Parameters<typeof t>[0]),
      });
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-border-light bg-surface-primary px-6 py-5 dark:bg-white/5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("admin.eyebrow")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95">
          {t("admin.title")}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">{t("admin.note")}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] bg-surface-secondary px-5 py-4 dark:bg-white/5">
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("admin.scopeHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>{t("admin.scopeItems.visibility")}</li>
              <li>{t("admin.scopeItems.scheduleRead")}</li>
              <li>{t("admin.scopeItems.runtimeBoundary")}</li>
            </ul>
          </div>
          <div className="rounded-[24px] border border-border-light bg-surface-primary px-5 py-4 dark:bg-white/5">
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("admin.boundaryHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>{t("admin.boundaryItems.noAuthoring")}</li>
              <li>{t("admin.boundaryItems.noAnalytics")}</li>
              <li>{t("admin.boundaryItems.noCertificates")}</li>
            </ul>
          </div>
        </div>
      </section>

      {canManage ? (
        <section className="app-panel rounded-[28px] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
                {t("admin.create.heading")}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {t("admin.create.note")}
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              {t("admin.create.label")}
            </span>
          </div>

          <form onSubmit={handleCreate} className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.create.fields.locale")}
              </span>
              <select
                value={createForm.locale}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    locale: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              >
                <option value="ar">{t("admin.create.locales.ar")}</option>
                <option value="en">{t("admin.create.locales.en")}</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.create.fields.courseType")}
              </span>
              <select
                value={createForm.courseType}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    courseType: event.target.value as CourseType,
                  }))
                }
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              >
                {(["LIVE", "WORKSHOP", "COURSE"] as CourseType[]).map((type) => (
                  <option key={type} value={type}>
                    {t(`courseTypes.${type}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.create.fields.title")}
              </span>
              <input
                value={createForm.title}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder={t("admin.create.placeholders.title")}
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.create.fields.slug")}
              </span>
              <input
                value={createForm.slug}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
                }
                placeholder={t("admin.create.placeholders.slug")}
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.create.fields.visibility")}
              </span>
              <select
                value={createForm.visibility}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    visibility: event.target.value as CourseVisibility,
                  }))
                }
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              >
                {(["PUBLIC", "PRIVATE"] as CourseVisibility[]).map((value) => (
                  <option key={value} value={value}>
                    {t(`statuses.visibility.${value}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>

            <label className="block lg:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.create.fields.shortDescription")}
              </span>
              <input
                value={createForm.shortDescription}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    shortDescription: event.target.value,
                  }))
                }
                placeholder={t("admin.create.placeholders.shortDescription")}
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              />
            </label>

            <label className="block lg:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("admin.create.fields.fullDescription")}
              </span>
              <textarea
                rows={3}
                value={createForm.fullDescription}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    fullDescription: event.target.value,
                  }))
                }
                placeholder={t("admin.create.placeholders.fullDescription")}
                className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                startIcon={<Plus className="h-4 w-4" />}
              >
                {createMutation.isPending
                  ? t("admin.create.submitting")
                  : t("admin.create.submit")}
              </Button>
              <p className="text-xs text-text-muted">{t("admin.create.helper")}</p>
            </div>
          </form>

          {createFeedback ? (
            <p
              className={`mt-3 text-xs ${
                createFeedback.tone === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {createFeedback.message}
            </p>
          ) : null}
        </section>
      ) : (
        <section className="rounded-[28px] border border-border-light bg-surface-primary p-5 text-sm text-text-secondary dark:bg-white/5">
          {t("admin.create.adminOnlyNote")}
        </section>
      )}

      <section className="app-panel rounded-[28px] p-5 sm:p-6">
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
          <div className="lg:col-span-2 flex justify-end">
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
        </div>
      </section>

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
    </div>
  );
}
