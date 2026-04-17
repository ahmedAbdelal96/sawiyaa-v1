"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ClipboardCheck, Loader2, Plus, Search } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef, SortConfig } from "@/components/ui/data-table";
import {
  buildUpdatedSearchParams,
  parseEnumParam,
  parsePositiveIntParam,
  parseTextParam,
} from "@/components/ui/data-table";
import { FormModal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { ADMIN_ASSESSMENT_STATUS_STYLES, getAdminAssessmentsErrorKey } from "../lib/admin-assessments";
import { useAdminAssessmentsList, useCreateAdminAssessment } from "../hooks/use-admin-assessments";
import type { AdminAssessmentDefinition, AdminAssessmentStatus } from "../types/admin-assessments.types";

const STATUS_OPTIONS: Array<AdminAssessmentStatus | "ALL"> = ["ALL", "DRAFT", "ACTIVE", "INACTIVE"];
const PUBLISHED_OPTIONS: Array<"ALL" | "TRUE" | "FALSE"> = ["ALL", "TRUE", "FALSE"];
const SORTABLE_COLUMNS = ["title", "slug", "status", "version", "updatedAt", "createdAt"] as const;
type SortableAssessmentsColumn = (typeof SORTABLE_COLUMNS)[number];
const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildAssessmentSlug(value: string) {
  const baseSlug = slugify(value);
  if (baseSlug.length > 0) return baseSlug;
  return `assessment-${Date.now()}`;
}

export default function AdminAssessmentsListScreen() {
  const t = useTranslations("admin-area");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchFilter = parseTextParam(searchParams.get("search"), { maxLength: 100 });
  const statusFilter = parseEnumParam<AdminAssessmentStatus | "ALL">(
    searchParams.get("status"),
    STATUS_OPTIONS,
    "ALL",
  );
  const publishedFilter = parseEnumParam<"ALL" | "TRUE" | "FALSE">(
    searchParams.get("published"),
    PUBLISHED_OPTIONS,
    "ALL",
  );
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 50,
  });
  const sortColumn = parseEnumParam<SortableAssessmentsColumn>(
    searchParams.get("sortBy"),
    SORTABLE_COLUMNS,
    "updatedAt",
  );
  const sortDirection = parseEnumParam<"asc" | "desc">(searchParams.get("sortDir"), ["asc", "desc"], "desc");
  const sortConfig: SortConfig = { column: sortColumn, direction: sortDirection };

  const [searchInput, setSearchInput] = useState(searchFilter);
  const debouncedSearch = useDebouncedValue(searchInput, 250);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    title: "",
    category: "",
    customCategory: "",
  });
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSearchInput(searchFilter);
  }, [searchFilter]);

  useEffect(() => {
    if (debouncedSearch.trim() === searchFilter) return;
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), {
      search: debouncedSearch.trim() || null,
      page: 1,
    });
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearch, pathname, router, searchFilter, searchParams]);

  const params = useMemo(() => {
    return {
      page,
      limit,
      ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      ...(publishedFilter === "TRUE" ? { isPublished: true } : {}),
      ...(publishedFilter === "FALSE" ? { isPublished: false } : {}),
      ...(searchFilter.trim() ? { search: searchFilter.trim() } : {}),
    };
  }, [limit, page, publishedFilter, searchFilter, statusFilter]);

  const listQuery = useAdminAssessmentsList(params);
  const createMutation = useCreateAdminAssessment();
  const data = listQuery.data;
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    for (const item of data?.items ?? []) {
      const category = item.category.trim();
      if (category.length > 0) categories.add(category);
    }
    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }, [data?.items]);
  const totalItems = data?.pagination.totalItems ?? 0;

  const columns = useMemo<ColumnDef<AdminAssessmentDefinition>[]>(() => [
    {
      id: "title",
      header: t("assessmentsAdmin.table.title"),
      accessor: (row) => row.title,
      sortable: true,
      cell: (row) => (
        <div>
          <p className="text-sm font-semibold text-text-primary dark:text-white/95">{row.title}</p>
          <p className="mt-1 font-mono text-xs text-text-muted">{row.slug}</p>
        </div>
      ),
    },
    {
      id: "category",
      header: t("assessmentsAdmin.table.category"),
      accessor: (row) => row.category,
    },
    {
      id: "status",
      header: t("assessmentsAdmin.table.status"),
      accessor: (row) => row.status,
      sortable: true,
      cell: (row) => (
        <div className="space-y-1">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ADMIN_ASSESSMENT_STATUS_STYLES[row.status]}`}
          >
            {t(`assessmentsAdmin.statuses.${row.status}` as Parameters<typeof t>[0])}
          </span>
          <p className="text-xs text-text-muted">
            {row.isPublished
              ? t("assessmentsAdmin.published.active")
              : t("assessmentsAdmin.published.inactive")}
          </p>
        </div>
      ),
    },
    {
      id: "version",
      header: t("assessmentsAdmin.table.version"),
      accessor: (row) => String(row.version),
      align: "center",
      sortable: true,
    },
    {
      id: "updatedAt",
      header: t("assessmentsAdmin.table.updatedAt"),
      accessor: (row) => new Date(row.updatedAt).getTime(),
      hideOnMobile: true,
      sortable: true,
      cell: (row) => formatDate(row.updatedAt, locale),
    },
    {
      id: "createdAt",
      header: t("assessmentsAdmin.table.createdAt"),
      accessor: (row) => new Date(row.createdAt).getTime(),
      hideOnMobile: true,
      sortable: true,
      cell: (row) => formatDate(row.createdAt, locale),
    },
  ], [locale, t]);

  const handleCreate = async () => {
    const resolvedCategory = useCustomCategory ? form.customCategory.trim() : form.category.trim();
    const resolvedSlug = buildAssessmentSlug(form.title);
    const nextErrors: Record<string, boolean> = {
      title: !form.title.trim(),
      category: !resolvedCategory,
    };
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      setFeedback({ tone: "error", message: t("assessmentsAdmin.feedback.validation") });
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        title: form.title.trim(),
        slug: resolvedSlug,
        category: resolvedCategory,
      });
      setFeedback({ tone: "success", message: t("assessmentsAdmin.feedback.createSuccess") });
      setIsCreateModalOpen(false);
      router.push(`/admin/assessments/${result.item.id}` as never);
    } catch (error) {
      setFeedback({
        tone: "error",
        message: t(getAdminAssessmentsErrorKey(error) as Parameters<typeof t>[0]),
      });
    }
  };

  const hasActiveFilters =
    Boolean(searchFilter.trim()) || statusFilter !== "ALL" || publishedFilter !== "ALL";

  return (
    <AdminOperationalListShell
      title={t("assessmentsAdmin.list.title")}
      actions={
        <Button
          onClick={() => {
            setForm({ title: "", category: "", customCategory: "" });
            setUseCustomCategory(false);
            setFieldErrors({});
            setIsCreateModalOpen(true);
          }}
          startIcon={<Plus className="h-4 w-4" />}
        >
          {t("assessmentsAdmin.actions.create")}
        </Button>
      }
      notice={
        feedback ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              feedback.tone === "success"
                ? "border-primary/20 bg-primary-light text-text-brand dark:border-primary/30 dark:bg-primary/10 dark:text-primary-light"
                : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/25 dark:bg-error-500/10 dark:text-error-300"
            }`}
          >
            {feedback.message}
          </div>
        ) : null
      }
      summaryCards={
        <AdminSummaryCard
          label={t("assessmentsAdmin.table.title")}
          value={typeof totalItems === "number" ? totalItems : "..."}
          tone="primary"
        />
      }
      filters={
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("assessmentsAdmin.filters.search")}
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t("assessmentsAdmin.filters.searchPlaceholder")}
                className="app-control w-full py-3 pe-4 ps-10"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("assessmentsAdmin.filters.status")}
            </span>
            <select
              value={statusFilter}
              onChange={(event) =>
                router.push(
                  `${pathname}?${buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), {
                    status: event.target.value === "ALL" ? null : event.target.value,
                    page: 1,
                  }).toString()}`,
                  { scroll: false },
                )
              }
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("assessmentsAdmin.filters.allStatuses")}</option>
              {STATUS_OPTIONS.filter((item) => item !== "ALL").map((status) => (
                <option key={status} value={status}>
                  {t(`assessmentsAdmin.statuses.${status}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("assessmentsAdmin.filters.publishState")}
            </span>
            <select
              value={publishedFilter}
              onChange={(event) =>
                router.push(
                  `${pathname}?${buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), {
                    published: event.target.value === "ALL" ? null : event.target.value,
                    page: 1,
                  }).toString()}`,
                  { scroll: false },
                )
              }
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("assessmentsAdmin.filters.allPublishStates")}</option>
              <option value="TRUE">{t("assessmentsAdmin.published.active")}</option>
              <option value="FALSE">{t("assessmentsAdmin.published.inactive")}</option>
            </select>
          </label>

          {hasActiveFilters ? (
            <div className="flex items-end md:col-span-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(pathname, { scroll: false })}
              >
                {t("assessmentsAdmin.filters.clear")}
              </Button>
            </div>
          ) : null}
        </div>
      }
    >

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        getRowId={(row) => row.id}
        loading={listQuery.isLoading}
        error={listQuery.isError ? t("assessmentsAdmin.states.error.note") : null}
        errorState={{
          title: t("assessmentsAdmin.states.error.heading"),
          description: t("assessmentsAdmin.states.error.note"),
          action: {
            label: t("assessmentsAdmin.states.error.retry"),
            onClick: () => listQuery.refetch(),
          },
        }}
        sortConfig={sortConfig}
        onSortChange={(nextSort) => {
          const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), {
            sortBy: nextSort.column,
            sortDir: nextSort.direction,
          });
          const query = next.toString();
          router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
        }}
        onRowClick={(row) => router.push(`/admin/assessments/${row.id}` as never)}
        pagination={
          data?.pagination
            ? {
                page: data.pagination.page,
                limit: data.pagination.limit,
                total: data.pagination.totalItems,
                totalPages: data.pagination.totalPages,
                hasNextPage: data.pagination.page < data.pagination.totalPages,
                hasPrevPage: data.pagination.page > 1,
              }
            : undefined
        }
        onPageChange={(nextPage) =>
          router.push(
            `${pathname}?${buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), {
              page: nextPage,
            }).toString()}`,
            { scroll: false },
          )
        }
        onPageSizeChange={(nextLimit) =>
          router.push(
            `${pathname}?${buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), {
              limit: nextLimit,
              page: 1,
            }).toString()}`,
            { scroll: false },
          )
        }
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        rowActionsHeader={t("assessmentsAdmin.table.actions")}
        rowActions={(row) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/admin/assessments/${row.id}` as never)}
          >
            {t("assessmentsAdmin.actions.open")}
          </Button>
        )}
        emptyState={{
          icon: <ClipboardCheck className="h-6 w-6 text-primary" />,
          title: t("assessmentsAdmin.states.empty.heading"),
          description: hasActiveFilters
            ? t("assessmentsAdmin.states.empty.filtered")
            : t("assessmentsAdmin.states.empty.note"),
          action: {
            label: t("assessmentsAdmin.actions.create"),
            onClick: () => setIsCreateModalOpen(true),
          },
        }}
        ariaLabel={t("assessmentsAdmin.list.title")}
        caption={t("assessmentsAdmin.list.title")}
      />

      <FormModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (createMutation.isPending) return;
          setIsCreateModalOpen(false);
        }}
        title={t("assessmentsAdmin.createModal.title")}
        description={t("assessmentsAdmin.createModal.note")}
        size="lg"
        loading={createMutation.isPending}
        onSubmit={handleCreate}
        submitLabel={
          createMutation.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("assessmentsAdmin.actions.creating")}
            </span>
          ) : (
            t("assessmentsAdmin.actions.create")
          )
        }
        cancelLabel={t("assessmentsAdmin.actions.cancel")}
      >
        <div className="grid gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text-primary dark:text-white/90">
              {t("assessmentsAdmin.form.title")}
            </span>
            <input
              value={form.title}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }));
                setFieldErrors((current) => ({ ...current, title: false }));
              }}
              className={`app-control w-full px-4 py-3 ${fieldErrors.title ? "border-error-500" : ""}`}
            />
          </label>
          <div className="rounded-xl border border-border-light bg-surface-secondary/50 px-3 py-2 text-xs text-text-muted">
            {t("assessmentsAdmin.form.slugAutoLine", { slug: slugify(form.title) || "-" })}
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text-primary dark:text-white/90">
              {t("assessmentsAdmin.form.category")}
            </span>
            <select
              value={useCustomCategory ? "__custom__" : form.category}
              onChange={(event) => {
                if (event.target.value === "__custom__") {
                  setUseCustomCategory(true);
                  setForm((current) => ({ ...current, category: "" }));
                } else {
                  setUseCustomCategory(false);
                  setForm((current) => ({ ...current, category: event.target.value }));
                }
                setFieldErrors((current) => ({ ...current, category: false }));
              }}
              className={`app-control w-full px-4 py-3 ${fieldErrors.category ? "border-error-500" : ""}`}
            >
              <option value="">{t("assessmentsAdmin.form.categoryPlaceholder")}</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
              <option value="__custom__">{t("assessmentsAdmin.form.customCategoryOption")}</option>
            </select>
          </label>
          {useCustomCategory ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-primary dark:text-white/90">
                {t("assessmentsAdmin.form.customCategoryLabel")}
              </span>
              <input
                value={form.customCategory}
                onChange={(event) => {
                  setForm((current) => ({ ...current, customCategory: event.target.value }));
                  setFieldErrors((current) => ({ ...current, category: false }));
                }}
                className={`app-control w-full px-4 py-3 ${fieldErrors.category ? "border-error-500" : ""}`}
              />
            </label>
          ) : null}
        </div>
      </FormModal>
    </AdminOperationalListShell>
  );
}
