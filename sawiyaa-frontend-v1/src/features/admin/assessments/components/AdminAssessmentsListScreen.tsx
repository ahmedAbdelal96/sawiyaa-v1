"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FileEdit,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
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
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useDebouncedValue } from "@/hooks/use-debounce";
import {
  ADMIN_ASSESSMENT_STATUS_STYLES,
  ASSESSMENT_CATEGORY_CONFIG,
  getAdminAssessmentsErrorKey,
  getAssessmentCategoryInfo,
} from "../lib/admin-assessments";
import { useAdminAssessmentsList, useCreateAdminAssessment } from "../hooks/use-admin-assessments";
import type { AdminAssessmentDefinition, AdminAssessmentStatus } from "../types/admin-assessments.types";

const STATUS_OPTIONS: Array<AdminAssessmentStatus | "ALL"> = ["ALL", "ACTIVE", "DRAFT", "INACTIVE"];
const PUBLISHED_OPTIONS: Array<"ALL" | "TRUE" | "FALSE"> = ["ALL", "TRUE", "FALSE"];
const SORTABLE_COLUMNS = ["title", "slug", "status", "version", "updatedAt", "createdAt"] as const;
type SortableAssessmentsColumn = (typeof SORTABLE_COLUMNS)[number];
const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
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
  const categoryFilter = searchParams.get("category") || "ALL";

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
    category: "depression",
    customCategory: "",
    description: "",
    estimatedDurationMinutes: 5,
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

  const updateFilters = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

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

  // Categories available in current dataset + presets
  const availableCategories = useMemo(() => {
    const categories = new Set<string>(Object.keys(ASSESSMENT_CATEGORY_CONFIG));
    for (const item of data?.items ?? []) {
      const category = item.category?.trim().toLowerCase();
      if (category && category.length > 0) categories.add(category);
    }
    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }, [data?.items]);

  // Client-side category filtering if active
  const displayedItems = useMemo(() => {
    const rawItems = data?.items ?? [];
    if (categoryFilter === "ALL") return rawItems;
    return rawItems.filter(
      (item) => item.category?.trim().toLowerCase() === categoryFilter.trim().toLowerCase(),
    );
  }, [categoryFilter, data?.items]);

  const totalItems = data?.pagination.totalItems ?? 0;
  const publishedCount = useMemo(() => {
    return (data?.items ?? []).filter((item) => item.isPublished).length;
  }, [data?.items]);
  const draftsCount = useMemo(() => {
    return (data?.items ?? []).filter((item) => item.status === "DRAFT").length;
  }, [data?.items]);

  const columns = useMemo<ColumnDef<AdminAssessmentDefinition>[]>(() => [
    {
      id: "title",
      header: t("assessmentsAdmin.table.title"),
      accessor: (row) => row.title,
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2 py-0.5 text-start">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/assessments/${row.id}` as never);
            }}
            className="font-semibold text-xs md:text-sm text-text-primary hover:text-primary transition-colors text-start dark:text-white"
          >
            {row.title}
          </button>
          <span className="font-mono text-[10px] text-text-muted bg-surface-tertiary px-1.5 py-0.5 rounded border border-border-light/70 dark:bg-surface-tertiary/60 shrink-0">
            {row.slug}
          </span>
          {row.estimatedDurationMinutes ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-text-muted shrink-0">
              <Clock className="h-2.5 w-2.5 text-text-muted" />
              <span>{t("assessmentsAdmin.table.duration", { minutes: row.estimatedDurationMinutes })}</span>
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "category",
      header: t("assessmentsAdmin.table.category"),
      accessor: (row) => row.category,
      cell: (row) => {
        const catInfo = getAssessmentCategoryInfo(row.category, locale);
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${catInfo.badgeClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${catInfo.dotClass}`} />
            <span>{catInfo.label}</span>
          </span>
        );
      },
    },
    {
      id: "status",
      header: t("assessmentsAdmin.table.status"),
      accessor: (row) => row.status,
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-start whitespace-nowrap">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${ADMIN_ASSESSMENT_STATUS_STYLES[row.status]}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                row.status === "ACTIVE"
                  ? "bg-emerald-500"
                  : row.status === "DRAFT"
                    ? "bg-amber-500"
                    : "bg-slate-400"
              }`}
            />
            {t(`assessmentsAdmin.statuses.${row.status}` as Parameters<typeof t>[0])}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
              row.isPublished
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-surface-tertiary text-text-muted border border-border-light"
            }`}
          >
            {row.isPublished ? (
              <>
                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                {t("assessmentsAdmin.published.active")}
              </>
            ) : (
              <>
                <EyeOff className="h-2.5 w-2.5 text-text-muted" />
                {t("assessmentsAdmin.published.inactive")}
              </>
            )}
          </span>
        </div>
      ),
    },
    {
      id: "version",
      header: t("assessmentsAdmin.table.version"),
      accessor: (row) => String(row.version),
      align: "center",
      sortable: true,
      cell: (row) => (
        <span className="inline-flex items-center rounded border border-border-light bg-surface-tertiary px-1.5 py-0.5 font-mono text-[11px] font-semibold text-text-primary dark:text-white">
          v{row.version}
        </span>
      ),
    },
    {
      id: "updatedAt",
      header: t("assessmentsAdmin.table.updatedAt"),
      accessor: (row) => new Date(row.updatedAt).getTime(),
      hideOnMobile: true,
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-text-secondary whitespace-nowrap">
          {formatDate(row.updatedAt, locale)}
        </span>
      ),
    },
    {
      id: "createdAt",
      header: t("assessmentsAdmin.table.createdAt"),
      accessor: (row) => new Date(row.createdAt).getTime(),
      hideOnMobile: true,
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-text-muted whitespace-nowrap">
          {formatDate(row.createdAt, locale)}
        </span>
      ),
    },
  ], [locale, router, t]);

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
        description: form.description.trim() || undefined,
        estimatedDurationMinutes: Number(form.estimatedDurationMinutes) || 5,
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
    Boolean(searchFilter.trim()) ||
    statusFilter !== "ALL" ||
    publishedFilter !== "ALL" ||
    categoryFilter !== "ALL";

  const clearAllFilters = () => {
    setSearchInput("");
    router.push(pathname, { scroll: false });
  };

  return (
    <AdminOperationalListShell
      eyebrow={t("assessmentsAdmin.list.eyebrow")}
      title={t("assessmentsAdmin.list.title")}
      description={t("assessmentsAdmin.list.note")}
      actions={
        <Button
          onClick={() => {
            setForm({
              title: "",
              category: availableCategories[0] || "depression",
              customCategory: "",
              description: "",
              estimatedDurationMinutes: 5,
            });
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
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
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
        <>
          <AdminSummaryCard
            label={t("assessmentsAdmin.stats.total")}
            value={typeof totalItems === "number" ? totalItems : "..."}
            tone="primary"
            icon={<ClipboardCheck className="h-4 w-4" />}
            hint={t("assessmentsAdmin.stats.totalHint")}
          />
          <AdminSummaryCard
            label={t("assessmentsAdmin.stats.published")}
            value={publishedCount}
            tone="success"
            icon={<CheckCircle2 className="h-4 w-4" />}
            hint={t("assessmentsAdmin.stats.publishedHint")}
          />
          <AdminSummaryCard
            label={t("assessmentsAdmin.stats.drafts")}
            value={draftsCount}
            tone="warning"
            icon={<FileEdit className="h-4 w-4" />}
            hint={t("assessmentsAdmin.stats.draftsHint")}
          />
          <AdminSummaryCard
            label={t("assessmentsAdmin.stats.categories")}
            value={availableCategories.length}
            tone="info"
            icon={<Sparkles className="h-4 w-4" />}
            hint={t("assessmentsAdmin.stats.categoriesHint")}
          />
        </>
      }
      filtersTitle={t("assessmentsAdmin.filters.title")}
      filters={
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search Input */}
            <div className="sm:col-span-2 lg:col-span-2">
              <span className="text-text-secondary mb-1.5 block text-xs font-semibold tracking-wider uppercase">
                {t("assessmentsAdmin.filters.search")}
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <InputField
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={t("assessmentsAdmin.filters.searchPlaceholder")}
                  className="ps-9"
                />
              </div>
            </div>

            {/* Status Select */}
            <div>
              <span className="text-text-secondary mb-1.5 block text-xs font-semibold tracking-wider uppercase">
                {t("assessmentsAdmin.filters.status")}
              </span>
              <Select
                defaultValue={statusFilter}
                onChange={(value) =>
                  updateFilters({
                    status: value === "ALL" ? null : value,
                    page: 1,
                  })
                }
                options={[
                  { value: "ALL", label: t("assessmentsAdmin.filters.allStatuses") },
                  ...STATUS_OPTIONS.filter((s) => s !== "ALL").map((status) => ({
                    value: status,
                    label: t(`assessmentsAdmin.statuses.${status}` as Parameters<typeof t>[0]),
                  })),
                ]}
              />
            </div>

            {/* Publish State Select */}
            <div>
              <span className="text-text-secondary mb-1.5 block text-xs font-semibold tracking-wider uppercase">
                {t("assessmentsAdmin.filters.publishState")}
              </span>
              <Select
                defaultValue={publishedFilter}
                onChange={(value) =>
                  updateFilters({
                    published: value === "ALL" ? null : value,
                    page: 1,
                  })
                }
                options={[
                  { value: "ALL", label: t("assessmentsAdmin.filters.allPublishStates") },
                  { value: "TRUE", label: t("assessmentsAdmin.published.active") },
                  { value: "FALSE", label: t("assessmentsAdmin.published.inactive") },
                ]}
              />
            </div>
          </div>

          {/* Quick Category Chips + Reset button row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-light/60">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-text-muted me-1">
                {t("assessmentsAdmin.filters.category")}:
              </span>
              <button
                type="button"
                onClick={() => updateFilters({ category: null, page: 1 })}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  categoryFilter === "ALL"
                    ? "bg-primary text-white shadow-2xs"
                    : "bg-surface-tertiary text-text-secondary hover:bg-border-light/70"
                }`}
              >
                {t("assessmentsAdmin.categories.all")}
              </button>
              {availableCategories.map((catKey) => {
                const info = getAssessmentCategoryInfo(catKey, locale);
                const isSelected = categoryFilter.toLowerCase() === catKey.toLowerCase();
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => updateFilters({ category: catKey, page: 1 })}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-white shadow-2xs"
                        : "bg-surface-tertiary text-text-secondary hover:bg-border-light/70"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : info.dotClass}`} />
                    <span>{info.label}</span>
                  </button>
                );
              })}
            </div>

            <FilterClearButton
              disabled={!hasActiveFilters}
              onClick={clearAllFilters}
            />
          </div>
        </div>
      }
      tableTitle={t("assessmentsAdmin.table.sectionTitle")}
      tableSubtitle={t("assessmentsAdmin.table.sectionSubtitle", { count: totalItems })}
    >
      <DataTable
        size="sm"
        data={displayedItems}
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
          updateFilters({
            sortBy: nextSort.column,
            sortDir: nextSort.direction,
          });
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
        onPageChange={(nextPage) => updateFilters({ page: nextPage })}
        onPageSizeChange={(nextLimit) => updateFilters({ limit: nextLimit, page: 1 })}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        rowActionsHeader={t("assessmentsAdmin.table.actions")}
        rowActions={(row) => (
          <div className="flex items-center gap-1.5 justify-end py-0.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs font-medium"
              startIcon={<Pencil className="h-3 w-3" />}
              onClick={() => router.push(`/admin/assessments/${row.id}` as never)}
            >
              {t("assessmentsAdmin.actions.open")}
            </Button>
            {row.isPublished ? (
              <a
                href={`/${locale}/patient/assessments/${row.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border-light bg-surface-primary text-text-muted hover:text-primary hover:border-primary/40 transition-colors shadow-2xs"
                title={t("assessmentsAdmin.table.previewPatient")}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        )}
        emptyState={{
          icon: <ClipboardCheck className="h-8 w-8 text-primary" />,
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
        <div className="grid gap-4 text-start">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-primary dark:text-white/90">
              {t("assessmentsAdmin.form.title")} *
            </span>
            <InputField
              value={form.title}
              placeholder="مثال: مقياس اضطراب النوم (ISI) أو فحص الاكتئاب"
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }));
                setFieldErrors((current) => ({ ...current, title: false }));
              }}
              error={fieldErrors.title}
            />
          </label>

          <div className="rounded-xl border border-border-light bg-surface-secondary/70 px-3.5 py-2 text-xs text-text-muted flex items-center justify-between">
            <span className="font-mono text-[11px]">
              {t("assessmentsAdmin.form.slugAutoLine", { slug: slugify(form.title) || "-" })}
            </span>
            <span className="text-[10px] text-text-muted uppercase tracking-wider">URL SLUG</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-text-primary dark:text-white/90">
                {t("assessmentsAdmin.form.category")} *
              </span>
              <Select
                defaultValue={useCustomCategory ? "__custom__" : form.category}
                onChange={(value) => {
                  if (value === "__custom__") {
                    setUseCustomCategory(true);
                    setForm((current) => ({ ...current, category: "" }));
                  } else {
                    setUseCustomCategory(false);
                    setForm((current) => ({ ...current, category: value }));
                  }
                  setFieldErrors((current) => ({ ...current, category: false }));
                }}
                options={[
                  ...availableCategories.map((category) => {
                    const info = getAssessmentCategoryInfo(category, locale);
                    return {
                      value: category,
                      label: `${info.label} (${category})`,
                    };
                  }),
                  { value: "__custom__", label: t("assessmentsAdmin.form.customCategoryOption") },
                ]}
                error={fieldErrors.category}
              />
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-semibold text-text-primary dark:text-white/90">
                {t("assessmentsAdmin.form.estimatedDuration")}
              </span>
              <InputField
                type="number"
                min="1"
                max="60"
                value={form.estimatedDurationMinutes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    estimatedDurationMinutes: Number(event.target.value) || 5,
                  }))
                }
              />
            </div>
          </div>

          {useCustomCategory ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-text-primary dark:text-white/90">
                {t("assessmentsAdmin.form.customCategoryLabel")} *
              </span>
              <InputField
                value={form.customCategory}
                placeholder="مثال: adhd أو trauma"
                onChange={(event) => {
                  setForm((current) => ({ ...current, customCategory: event.target.value }));
                  setFieldErrors((current) => ({ ...current, category: false }));
                }}
                error={fieldErrors.category}
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-primary dark:text-white/90">
              {t("assessmentsAdmin.form.description")} (اختياري)
            </span>
            <textarea
              value={form.description}
              rows={3}
              placeholder="وصف موجز يوضح للمريض هدف التقييم ومجاله..."
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="app-control w-full p-3 text-xs md:text-sm"
            />
          </label>
        </div>
      </FormModal>
    </AdminOperationalListShell>
  );
}
