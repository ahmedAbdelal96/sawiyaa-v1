"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, CheckCircle2, FolderTree, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import AdminOperationalListShell from "@/components/shared/admin/AdminOperationalListShell";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import { toAppError } from "@/lib/api/errors";
import { DestructiveConfirmModal } from "@/components/ui/modal";
import { countQuestionsByCategory, sortByHelpOrder } from "../lib/help";
import type { HelpCategory } from "../types/help.types";
import {
  CategoryFormModal,
  DropdownActionMenu,
  getCategoryDraft,
  getEmptyCategoryDraft,
  HelpAdminSectionNav,
  type CategoryDraft,
} from "./AdminHelpShared";
import {
  useAdminHelpCategories,
  useAdminHelpQuestions,
  useCreateAdminHelpCategory,
  useDeleteAdminHelpCategory,
  useReorderAdminHelpCategories,
  useUpdateAdminHelpCategory,
} from "../hooks/use-help";

type CategoryRow = HelpCategory & {
  rowNumber: number;
  questionCount: number;
};

function buildCategorySlug(titleAr: string, titleEn: string) {
  const source = (titleEn || titleAr || "help-category").trim();
  return source
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\u0600-\u06ff]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export default function AdminHelpCategoriesScreen() {
  const t = useTranslations("admin-help");
  const categoriesQuery = useAdminHelpCategories();
  const questionsQuery = useAdminHelpQuestions();
  const createMutation = useCreateAdminHelpCategory();
  const updateMutation = useUpdateAdminHelpCategory();
  const deleteMutation = useDeleteAdminHelpCategory();
  const reorderMutation = useReorderAdminHelpCategories();

  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [draft, setDraft] = useState<CategoryDraft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HelpCategory | null>(null);

  const categories = useMemo(() => sortByHelpOrder(categoriesQuery.data?.items ?? []), [categoriesQuery.data?.items]);
  const questions = useMemo(() => sortByHelpOrder(questionsQuery.data?.items ?? []), [questionsQuery.data?.items]);

  const rows = useMemo<CategoryRow[]>(
    () =>
      categories.map((category, index) => ({
        ...category,
        rowNumber: index + 1,
        questionCount: countQuestionsByCategory(questions, category.id),
      })),
    [categories, questions],
  );

  const openCreate = () => setDraft(getEmptyCategoryDraft());
  const openEdit = (category: HelpCategory) => setDraft(getCategoryDraft(category));

  const toggleActive = async (category: HelpCategory) => {
    try {
      await updateMutation.mutateAsync({
        id: category.id,
        input: {
          slug: category.slug,
          titleAr: category.titleAr,
          titleEn: category.titleEn,
          descriptionAr: category.descriptionAr,
          descriptionEn: category.descriptionEn,
          sortOrder: category.sortOrder,
          isActive: !category.isActive,
        },
      });
      setFeedback({
        tone: "success",
        message: category.isActive ? t("feedback.categoryDeactivated") : t("feedback.categoryActivated"),
      });
    } catch {
      setFeedback({ tone: "error", message: t("feedback.categorySaveError") });
    }
  };

  const moveCategory = async (categoryId: string, offset: number) => {
    const index = categories.findIndex((item) => item.id === categoryId);
    const nextIndex = index + offset;
    if (index < 0 || nextIndex < 0 || nextIndex >= categories.length) return;

    const next = [...categories];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];

    try {
      await reorderMutation.mutateAsync({
        items: next.map((item, itemIndex) => ({ id: item.id, sortOrder: itemIndex + 1 })),
      });
      setFeedback({ tone: "success", message: t("feedback.reorderSuccess") });
    } catch {
      setFeedback({ tone: "error", message: t("feedback.reorderError") });
    }
  };

  const removeCategory = async (category: HelpCategory) => {
    try {
      await deleteMutation.mutateAsync(category.id);
      setPendingDelete(null);
      setFeedback({ tone: "success", message: t("feedback.categoryDeleted") });
    } catch {
      setFeedback({ tone: "error", message: t("feedback.categoryDeleteError") });
    }
  };

  const saveCategory = async () => {
    if (!draft) return;
    const titleAr = draft.titleAr.trim();
    const titleEn = draft.titleEn.trim();
    const payload = {
      slug: draft.id ? draft.slug : buildCategorySlug(titleAr, titleEn),
      titleAr,
      titleEn,
      descriptionAr: draft.descriptionAr.trim() || null,
      descriptionEn: draft.descriptionEn.trim() || null,
      sortOrder: draft.sortOrder,
      isActive: draft.isActive,
    };

    try {
      if (draft.id) {
        await updateMutation.mutateAsync({ id: draft.id, input: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setDraft(null);
      setFeedback({ tone: "success", message: t("feedback.categorySaved") });
    } catch {
      setFeedback({ tone: "error", message: t("feedback.categorySaveError") });
    }
  };

  const categoryColumns = useMemo<ColumnDef<CategoryRow>[]>(
    () => [
      {
        id: "rowNumber",
        header: "#",
        accessor: (row) => row.rowNumber,
        align: "center",
        width: "72px",
        cell: (row) => (
          <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-text-primary">
            {row.rowNumber}
          </span>
        ),
      },
      {
        id: "titleAr",
        header: t("tables.categories.columns.titleAr"),
        accessor: (row) => row.titleAr,
        cell: (row) => (
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-semibold text-text-primary">{row.titleAr}</p>
            {row.descriptionAr || row.descriptionEn ? (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">
                {row.descriptionAr || row.descriptionEn || "-"}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "titleEn",
        header: t("tables.categories.columns.titleEn"),
        accessor: (row) => row.titleEn,
        hideOnMobile: true,
        cell: (row) => <p className="truncate text-sm text-text-secondary">{row.titleEn || "-"}</p>,
      },
      {
        id: "questionCount",
        header: t("tables.categories.columns.questionCount"),
        accessor: (row) => row.questionCount,
        align: "center",
        width: "120px",
        cell: (row) => (
          <Badge variant="light" color="primary" size="sm">
            {t("tables.categories.questionCountValue", { count: row.questionCount })}
          </Badge>
        ),
      },
      {
        id: "isActive",
        header: t("tables.categories.columns.status"),
        accessor: (row) => row.isActive,
        align: "center",
        width: "110px",
        cell: (row) => (
          <Badge variant="solid" color={row.isActive ? "success" : "warning"} size="sm">
            {row.isActive ? t("badges.active") : t("badges.inactive")}
          </Badge>
        ),
      },
      {
        id: "sortOrder",
        header: t("fields.sortOrder"),
        accessor: (row) => row.sortOrder,
        align: "center",
        width: "92px",
        cell: (row) => (
          <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-surface px-3 py-1 text-sm font-semibold text-text-primary">
            {row.sortOrder}
          </span>
        ),
      },
    ],
    [t],
  );

  if ((categoriesQuery.isLoading && !categoriesQuery.data) || (questionsQuery.isLoading && !questionsQuery.data)) {
    return (
      <AdminOperationalListShell
        eyebrow={t("page.eyebrow")}
        title={t("page.categoriesTitle")}
        description={t("page.categoriesDescription")}
        actions={<HelpAdminSectionNav current="categories" />}
      >
        <ListStateSkeleton items={1} heightClass="h-32" />
      </AdminOperationalListShell>
    );
  }

  const categoryError = categoriesQuery.isError && !categoriesQuery.data ? toAppError(categoriesQuery.error) : null;
  const questionError = questionsQuery.isError && !questionsQuery.data ? toAppError(questionsQuery.error) : null;
  if (categoryError || questionError) {
    const appError = categoryError ?? questionError;
    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<FolderTree className="h-8 w-8 text-text-muted" />}
          title={t("states.error.heading")}
          note={appError?.message ?? t("states.error.note")}
          action={{
            label: t("states.error.retry"),
            onClick: () => {
              void categoriesQuery.refetch();
              void questionsQuery.refetch();
            },
          }}
        />
      </div>
    );
  }

  return (
    <AdminOperationalListShell
      eyebrow={t("page.eyebrow")}
      title={t("page.categoriesTitle")}
      description={t("page.categoriesDescription")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <HelpAdminSectionNav current="categories" />
          <Button type="button" size="sm" variant="outline" onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
            {t("actions.addCategory")}
          </Button>
        </div>
      }
    >
      {feedback ? (
        <p
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      <SurfaceCard as="section" variant="section" className="space-y-4">
        <DataTable
          data={rows}
          columns={categoryColumns}
          getRowId={(row) => row.id}
          loading={categoriesQuery.isLoading}
          emptyState={{
            icon: <FolderTree className="h-5 w-5 text-primary" />,
            title: t("states.categoriesEmpty.heading"),
            description: t("states.categoriesEmpty.note"),
          }}
          rowActionsHeader={t("actions.menu")}
          rowActions={(row) => {
            const index = rows.findIndex((item) => item.id === row.id);
            return (
              <DropdownActionMenu
                label={t("actions.menu")}
                actions={[
                  {
                    key: "edit",
                    label: t("actions.edit"),
                    icon: <Pencil className="h-4 w-4" />,
                    onClick: () => openEdit(row),
                  },
                  {
                    key: "toggle",
                    label: row.isActive ? t("actions.deactivate") : t("actions.activate"),
                    icon: row.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />,
                    tone: row.isActive ? "danger" : "success",
                    onClick: () => void toggleActive(row),
                  },
                  {
                    key: "up",
                    label: t("actions.up"),
                    icon: <ArrowUp className="h-4 w-4" />,
                    hidden: index <= 0,
                    onClick: () => void moveCategory(row.id, -1),
                  },
                  {
                    key: "down",
                    label: t("actions.down"),
                    icon: <ArrowDown className="h-4 w-4" />,
                    hidden: index < 0 || index >= rows.length - 1,
                    onClick: () => void moveCategory(row.id, 1),
                  },
                  {
                    key: "delete",
                    label: t("actions.delete"),
                    icon: <Trash2 className="h-4 w-4" />,
                    tone: "danger",
                    onClick: () => setPendingDelete(row),
                  },
                ]}
              />
            );
          }}
          ariaLabel={t("tables.categories.title")}
          caption={t("tables.categories.title")}
          size="sm"
          hoverable
          striped
        />
      </SurfaceCard>

      <CategoryFormModal
        isOpen={draft !== null}
        title={draft?.id ? t("modals.category.edit") : t("modals.category.create")}
        draft={draft ?? getEmptyCategoryDraft()}
        onChange={(next) => setDraft(next)}
        onClose={() => setDraft(null)}
        onSave={() => void saveCategory()}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <DestructiveConfirmModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={t("confirmations.deleteCategory.title")}
        description={t("confirmations.deleteCategory.description")}
        confirmLabel={deleteMutation.isPending ? t("actions.saving") : t("actions.delete")}
        cancelLabel={t("actions.cancel")}
        onConfirm={() => {
          if (!pendingDelete) return;
          void removeCategory(pendingDelete);
        }}
        loading={deleteMutation.isPending}
      >
        {pendingDelete ? (
          <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-4 text-sm text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
            <p className="font-semibold">{pendingDelete.titleAr}</p>
            <p className="mt-1 text-xs opacity-80">{pendingDelete.titleEn || pendingDelete.slug}</p>
          </div>
        ) : null}
      </DestructiveConfirmModal>
    </AdminOperationalListShell>
  );
}
