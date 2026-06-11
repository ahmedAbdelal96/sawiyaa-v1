"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Archive, FileText, Globe, Pencil, Plus, Send } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import Button from "@/components/ui/button/Button";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import type { ColumnDef, SortConfig } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam, parseTextParam } from "@/components/ui/data-table";
import { DestructiveConfirmModal } from "@/components/ui/modal";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import {
  useAdminArticles,
  useCreateAdminArticle,
  useArchiveAdminArticle,
  usePublishAdminArticle,
  useUpdateAdminArticle,
} from "../hooks/use-admin-articles";
import type { AdminArticleItem, AdminArticleListParams, ArticleStatus } from "../types/admin-articles.types";
import { getAdminArticleErrorKey } from "../lib/admin-articles-errors";
import AdminArticleFormModal from "./AdminArticleFormModal";

const STATUS_FILTERS: Array<ArticleStatus | "ALL"> = [
  "ALL",
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
  "PUBLISHED",
  "ARCHIVED",
];

const STATUS_STYLES: Record<ArticleStatus, string> = {
  DRAFT: "bg-surface-tertiary text-text-secondary",
  SUBMITTED: "bg-primary-light text-text-brand",
  IN_REVIEW: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300",
  CHANGES_REQUESTED: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300",
  APPROVED: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300",
  REJECTED: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300",
  PUBLISHED: "bg-primary-light text-text-brand",
  ARCHIVED: "bg-surface-tertiary text-text-muted",
};

const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;
const SORTABLE_COLUMNS = ["title", "status", "updatedAt", "publishedAt", "locale"] as const;
type SortableArticlesColumn = (typeof SORTABLE_COLUMNS)[number];

function formatDate(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatId(value: string) {
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function AdminArticlesListScreen() {
  const t = useTranslations("admin-articles");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const statusFilter = parseEnumParam<ArticleStatus | "ALL">(
    searchParams.get("status"),
    STATUS_FILTERS,
    "ALL",
  );
  const searchQuery = parseTextParam(searchParams.get("q"), { maxLength: 120 });
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 50,
  });
  const sortColumn = parseEnumParam<SortableArticlesColumn>(
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

  const [actionFeedback, setActionFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<AdminArticleItem | null>(null);
  const [pendingArchiveArticle, setPendingArchiveArticle] = useState<{
    id: string;
    title: string;
    slug: string;
  } | null>(null);

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const params = useMemo<AdminArticleListParams>(() => {
    const next: AdminArticleListParams = {
      page,
      limit,
      locale: locale === "ar" ? "ar" : "en",
    };
    if (statusFilter !== "ALL") next.status = statusFilter;
    if (searchQuery.trim()) next.q = searchQuery.trim();
    return next;
  }, [limit, locale, page, searchQuery, statusFilter]);

  const listQuery = useAdminArticles(params);
  const publishMutation = usePublishAdminArticle();
  const archiveMutation = useArchiveAdminArticle();
  const createMutation = useCreateAdminArticle();
  const updateMutation = useUpdateAdminArticle();
  const data = listQuery.data;

  const handlePublish = async (articleId: string) => {
    setActionFeedback(null);
    try {
      await publishMutation.mutateAsync({ articleId, locale: params.locale });
      setActionFeedback({ tone: "success", message: t("actions.publishSuccess") });
    } catch (error) {
      setActionFeedback({ tone: "error", message: t(getAdminArticleErrorKey(error)) });
    }
  };

  const handleArchive = async (articleId: string) => {
    setActionFeedback(null);
    try {
      await archiveMutation.mutateAsync({ articleId, locale: params.locale });
      setActionFeedback({ tone: "success", message: t("actions.archiveSuccess") });
      return true;
    } catch (error) {
      setActionFeedback({ tone: "error", message: t(getAdminArticleErrorKey(error)) });
      return false;
    }
  };

  const handleCreate = async (payload: Parameters<typeof createMutation.mutateAsync>[0]) => {
    setActionFeedback(null);
    try {
      await createMutation.mutateAsync(payload);
      setActionFeedback({ tone: "success", message: t("actions.createSuccess") });
      setIsCreateOpen(false);
    } catch (error) {
      setActionFeedback({ tone: "error", message: t(getAdminArticleErrorKey(error)) });
      throw error;
    }
  };

  const handleUpdate = async (payload: Parameters<typeof createMutation.mutateAsync>[0]) => {
    if (!editingArticle) return;

    setActionFeedback(null);
    try {
      await updateMutation.mutateAsync({
        articleId: editingArticle.id,
        payload,
      });
      setActionFeedback({ tone: "success", message: t("actions.updateSuccess") });
      setEditingArticle(null);
    } catch (error) {
      setActionFeedback({ tone: "error", message: t(getAdminArticleErrorKey(error)) });
      throw error;
    }
  };

  const columns = useMemo<ColumnDef<AdminArticleItem>[]>(() => [
    {
      id: "title",
      header: "Article",
      accessor: (row) => row.title,
      sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">{row.title}</p>
          <p className="mt-1 text-xs text-text-muted">{t("list.slug")}: {row.slug}</p>
          {row.excerpt ? <p className="mt-2 line-clamp-2 text-xs text-text-secondary">{row.excerpt}</p> : null}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => row.status,
      sortable: true,
      cell: (row) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[row.status]}`}>
          {t(`statuses.${row.status}` as Parameters<typeof t>[0])}
        </span>
      ),
    },
    {
      id: "locale",
      header: "Locale",
      accessor: (row) => row.locale.toUpperCase(),
      sortable: true,
      align: "center",
      cell: (row) => (
        <span className="inline-flex items-center rounded-full border border-border-light px-2.5 py-1 text-xs font-medium text-text-secondary">
          {row.locale.toUpperCase()}
        </span>
      ),
    },
    {
      id: "category",
      header: "Category",
      accessor: (row) => row.category?.title ?? "-",
      hideOnMobile: true,
    },
    {
      id: "updatedAt",
      header: "Updated",
      accessor: (row) => (row.updatedAt ? new Date(row.updatedAt).getTime() : null),
      sortable: true,
      hideOnMobile: true,
      cell: (row) => formatDate(row.updatedAt, locale),
    },
    {
      id: "publishedAt",
      header: "Published",
      accessor: (row) => (row.publishedAt ? new Date(row.publishedAt).getTime() : null),
      sortable: true,
      hideOnMobile: true,
      cell: (row) => formatDate(row.publishedAt, locale),
    },
    {
      id: "author",
      header: "Author",
      accessor: (row) => row.authorUserId,
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{formatId(row.authorUserId)}</span>,
      hideOnMobile: true,
    },
  ], [locale, t]);

  return (
    <AdminOperationalListShell
      eyebrow={t("list.eyebrow")}
      title={t("list.title")}
      description={t("list.note")}
      actions={
        <Button size="sm" onClick={() => setIsCreateOpen(true)} startIcon={<Plus className="h-4 w-4" />}>
          {t("actions.create")}
        </Button>
      }
      summaryCards={
        <AdminSummaryCard
          metricKey="articles.total"
          label={t("list.title")}
          value={typeof data?.pagination.totalItems === "number" ? data.pagination.totalItems : "..."}
          tone="primary"
        />
      }
      filters={
        <>
          <div className="grid gap-3 lg:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.allStatuses")}
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
              <option value="ALL">{t("filters.allStatuses")}</option>
              {STATUS_FILTERS.filter((status) => status !== "ALL").map((status) => (
                <option key={status} value={status}>
                  {t(`statuses.${status}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.search")}
            </span>
            <input
              value={searchQuery}
              onChange={(event) =>
                updateListQuery({
                  q: event.target.value || null,
                  page: 1,
                })
              }
              placeholder={t("filters.searchPlaceholder")}
              className="app-control w-full px-4 py-3"
            />
          </label>

          <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-xs text-text-muted dark:bg-white/5 lg:col-span-3">
            <span className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t("filters.locale", { locale: locale === "ar" ? "AR" : "EN" })}
            </span>
          </div>
          <div className="lg:col-span-3 flex justify-end">
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
        </>
      }
    >

      {actionFeedback ? (
        <p className={`text-xs ${actionFeedback.tone === "success" ? "text-success-600 dark:text-success-300" : "text-error-600 dark:text-error-300"}`}>
          {actionFeedback.message}
        </p>
      ) : null}

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        getRowId={(row) => row.id}
        loading={listQuery.isLoading}
        error={listQuery.isError ? t("states.listError.note") : null}
        errorState={{
          title: t("states.listError.heading"),
          description: t("states.listError.note"),
          action: {
            label: t("states.listError.retry"),
            onClick: () => listQuery.refetch(),
          },
        }}
        emptyState={{
          icon: <FileText className="h-5 w-5 text-primary" />,
          title: t("states.empty.heading"),
          description: t("states.empty.note"),
        }}
        sortConfig={sortConfig}
        onSortChange={(nextSort) =>
          updateListQuery({
            sortBy: nextSort.column,
            sortDir: nextSort.direction,
          })
        }
        rowActions={(row) => {
          const canPublish = row.status === "DRAFT";
          const canArchive = row.status === "DRAFT" || row.status === "PUBLISHED";
          return (
            <div className="flex items-center gap-1.5">
              <ActionIconButton
                intent="edit"
                label={t("actions.edit")}
                icon={<Pencil className="h-4 w-4" />}
                onClick={() => setEditingArticle(row)}
              />
              <ActionIconButton
                intent="publish"
                label={publishMutation.isPending ? t("actions.publishing") : t("actions.publish")}
                icon={<Send className="h-4 w-4" />}
                disabled={!canPublish || publishMutation.isPending}
                onClick={() => handlePublish(row.id)}
              />
              <ActionIconButton
                intent="archive"
                label={archiveMutation.isPending ? t("actions.archiving") : t("actions.archive")}
                icon={<Archive className="h-4 w-4" />}
                disabled={!canArchive || archiveMutation.isPending}
                onClick={() =>
                  setPendingArchiveArticle({
                    id: row.id,
                    title: row.title,
                    slug: row.slug,
                  })
                }
              />
            </div>
          );
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
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        ariaLabel={t("list.title")}
        caption={t("list.title")}
      />

      <DestructiveConfirmModal
        isOpen={Boolean(pendingArchiveArticle)}
        onClose={() => setPendingArchiveArticle(null)}
        title={t("actions.archiveConfirm.title")}
        description={t("actions.archiveConfirm.description")}
        confirmLabel={archiveMutation.isPending ? t("actions.archiving") : t("actions.archive")}
        cancelLabel={t("actions.archiveConfirm.cancel")}
        onConfirm={async () => {
          if (!pendingArchiveArticle) return;
          const success = await handleArchive(pendingArchiveArticle.id);
          if (success) {
            setPendingArchiveArticle(null);
          }
        }}
        loading={archiveMutation.isPending}
      >
        {pendingArchiveArticle ? (
          <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-4 text-sm text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
            <p className="font-medium">{pendingArchiveArticle.title}</p>
            <p className="mt-1 text-xs opacity-80">{pendingArchiveArticle.slug}</p>
          </div>
        ) : null}
      </DestructiveConfirmModal>

      <AdminArticleFormModal
        key={`create-article-${isCreateOpen ? "open" : "closed"}`}
        isOpen={isCreateOpen}
        mode="create"
        loading={createMutation.isPending}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <AdminArticleFormModal
        key={`edit-article-${editingArticle?.id ?? "none"}`}
        isOpen={Boolean(editingArticle)}
        mode="edit"
        article={editingArticle}
        loading={updateMutation.isPending}
        onClose={() => setEditingArticle(null)}
        onSubmit={handleUpdate}
      />
    </AdminOperationalListShell>
  );
}
