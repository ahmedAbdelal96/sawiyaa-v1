"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, CheckCircle2, Eye, Pencil, Plus, Search, Trash2, XCircle } from "lucide-react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import AdminOperationalListShell from "@/components/shared/admin/AdminOperationalListShell";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard, SurfaceToolbar } from "@/components/shared/SurfaceShell";
import { DestructiveConfirmModal } from "@/components/ui/modal";
import { toAppError } from "@/lib/api/errors";
import { normalizeFormError, type NormalizedFormError } from "@/lib/form-errors";
import {
  formatHelpDate,
  getHelpCategoryTitle,
  sortByHelpOrder,
} from "../lib/help";
import type { HelpCategory, HelpQuestion } from "../types/help.types";
import {
  DropdownActionMenu,
  getEmptyQuestionDraft,
  getQuestionDraft,
  HelpAdminSectionNav,
  type QuestionDraftField,
  QuestionFormModal,
  QuestionViewModal,
  type QuestionDraft,
} from "./AdminHelpShared";
import {
  useAdminHelpCategories,
  useAdminHelpQuestions,
  useCreateAdminHelpQuestion,
  useDeleteAdminHelpQuestion,
  useReorderAdminHelpQuestions,
  useUpdateAdminHelpQuestion,
} from "../hooks/use-help";

type QuestionRow = HelpQuestion & {
  rowNumber: number;
};

export default function AdminHelpQuestionsScreen() {
  const t = useTranslations("admin-help");
  const locale = useLocale();
  const categoriesQuery = useAdminHelpCategories();
  const questionsQuery = useAdminHelpQuestions();
  const createMutation = useCreateAdminHelpQuestion();
  const updateMutation = useUpdateAdminHelpQuestion();
  const deleteMutation = useDeleteAdminHelpQuestion();
  const reorderMutation = useReorderAdminHelpQuestions();

  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<QuestionDraftField, string>>>({});
  const [submitError, setSubmitError] = useState<NormalizedFormError | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<HelpQuestion | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HelpQuestion | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const categories = useMemo(() => sortByHelpOrder(categoriesQuery.data?.items ?? []), [categoriesQuery.data?.items]);
  const questions = useMemo(() => sortByHelpOrder(questionsQuery.data?.items ?? []), [questionsQuery.data?.items]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category] as const)),
    [categories],
  );

  const filteredQuestions = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return questions.filter((question) => {
      const category = question.categoryId ? categoryById.get(question.categoryId) ?? null : null;

      if (statusFilter === "ACTIVE" && !question.isActive) return false;
      if (statusFilter === "INACTIVE" && question.isActive) return false;
      if (categoryFilter !== "ALL") {
        if (categoryFilter === "UNCATEGORIZED" && question.categoryId) return false;
        if (categoryFilter !== "UNCATEGORIZED" && question.categoryId !== categoryFilter) return false;
      }

      if (!normalizedSearch) return true;

      const haystack = [
        question.questionAr,
        question.questionEn,
        question.answerAr,
        question.answerEn,
        category?.titleAr ?? "",
        category?.titleEn ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [questions, categoryById, searchQuery, statusFilter, categoryFilter]);

  const rows = useMemo<QuestionRow[]>(
    () => filteredQuestions.map((question, index) => ({ ...question, rowNumber: index + 1 })),
    [filteredQuestions],
  );

  const viewingCategory =
    viewingQuestion?.categoryId ? categoryById.get(viewingQuestion.categoryId) ?? null : null;

  const hasFilters = Boolean(searchQuery.trim()) || categoryFilter !== "ALL" || statusFilter !== "ALL";

  const clearDraftErrors = () => {
    setFieldErrors({});
    setSubmitError(null);
  };

  const openCreate = () => {
    setDraft(getEmptyQuestionDraft());
    clearDraftErrors();
  };

  const openEdit = (question: HelpQuestion) => {
    setDraft(getQuestionDraft(question));
    clearDraftErrors();
  };

  const closeDraft = () => {
    setDraft(null);
    clearDraftErrors();
  };

  const updateDraft = (next: QuestionDraft) => {
    setDraft(next);
    setFieldErrors({});
    setSubmitError(null);
  };

  const buildRequiredFieldErrors = (current: QuestionDraft) => {
    const nextErrors: Partial<Record<QuestionDraftField, string>> = {};

    if (!current.questionAr.trim()) {
      nextErrors.questionAr = t("validation.questionArRequired");
    }

    if (!current.answerAr.trim()) {
      nextErrors.answerAr = t("validation.answerArRequired");
    }

    return nextErrors;
  };

  const toggleActive = async (question: HelpQuestion) => {
    try {
      await updateMutation.mutateAsync({
        id: question.id,
        input: {
          categoryId: question.categoryId ?? null,
          questionAr: question.questionAr,
          questionEn: question.questionEn,
          answerAr: question.answerAr,
          answerEn: question.answerEn,
          sortOrder: question.sortOrder,
          isActive: !question.isActive,
        },
      });
      setFeedback({
        tone: "success",
        message: question.isActive ? t("feedback.questionDeactivated") : t("feedback.questionActivated"),
      });
    } catch {
      setFeedback({ tone: "error", message: t("feedback.questionSaveError") });
    }
  };

  const moveQuestion = async (questionId: string, offset: number) => {
    const index = questions.findIndex((item) => item.id === questionId);
    const nextIndex = index + offset;
    if (index < 0 || nextIndex < 0 || nextIndex >= questions.length) return;

    const next = [...questions];
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

  const removeQuestion = async (question: HelpQuestion) => {
    try {
      await deleteMutation.mutateAsync(question.id);
      setPendingDelete(null);
      setFeedback({ tone: "success", message: t("feedback.questionDeleted") });
    } catch {
      setFeedback({ tone: "error", message: t("feedback.questionDeleteError") });
    }
  };

  const saveQuestion = async () => {
    if (!draft) return;

    const requiredFieldErrors = buildRequiredFieldErrors(draft);
    if (Object.keys(requiredFieldErrors).length > 0) {
      setFieldErrors(requiredFieldErrors);
      setSubmitError({
        message: t("errors.reviewRequired"),
        fieldErrors: requiredFieldErrors,
      });
      return;
    }

    const payload = {
      categoryId: draft.categoryId || null,
      questionAr: draft.questionAr.trim(),
      questionEn: draft.questionEn.trim(),
      answerAr: draft.answerAr.trim(),
      answerEn: draft.answerEn.trim(),
      sortOrder: draft.sortOrder,
      isActive: draft.isActive,
    };

    try {
      if (draft.id) {
        await updateMutation.mutateAsync({ id: draft.id, input: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      closeDraft();
      setFeedback({ tone: "success", message: t("feedback.questionSaved") });
    } catch (error) {
      const normalized = normalizeFormError(error, t("errors.saveFailed"));
      setFieldErrors(normalized.fieldErrors as Partial<Record<QuestionDraftField, string>>);
      setSubmitError(normalized);
    }
  };

  const questionColumns = useMemo<ColumnDef<QuestionRow>[]>(
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
        id: "questionAr",
        header: t("tables.questions.columns.questionAr"),
        accessor: (row) => row.questionAr,
        cell: (row) => (
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-semibold text-text-primary">{row.questionAr}</p>
          </div>
        ),
      },
      {
        id: "questionEn",
        header: t("tables.questions.columns.questionEn"),
        accessor: (row) => row.questionEn,
        hideOnMobile: true,
        cell: (row) => <p className="line-clamp-2 text-sm text-text-secondary">{row.questionEn || "-"}</p>,
      },
      {
        id: "category",
        header: t("tables.questions.columns.category"),
        accessor: (row) => row.categoryTitleAr ?? row.categoryTitleEn ?? "",
        cell: (row) => {
          const category = row.categoryId ? categoryById.get(row.categoryId) ?? null : null;
          const label = category ? getHelpCategoryTitle(category, locale) : t("filters.uncategorized");
          return (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{label}</p>
              {category?.slug ? <p className="mt-1 text-xs text-text-muted">{category.slug}</p> : null}
            </div>
          );
        },
      },
      {
        id: "isActive",
        header: t("tables.questions.columns.status"),
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
        header: t("tables.questions.columns.order"),
        accessor: (row) => row.sortOrder,
        align: "center",
        width: "92px",
        cell: (row) => (
          <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-surface px-3 py-1 text-sm font-semibold text-text-primary">
            {row.sortOrder}
          </span>
        ),
      },
      {
        id: "updatedAt",
        header: t("tables.questions.columns.updatedAt"),
        accessor: (row) => row.updatedAt,
        hideOnMobile: true,
        cell: (row) => <span className="text-sm text-text-secondary">{formatHelpDate(row.updatedAt, locale)}</span>,
      },
    ],
    [categoryById, locale, t],
  );

  if ((categoriesQuery.isLoading && !categoriesQuery.data) || (questionsQuery.isLoading && !questionsQuery.data)) {
    return (
      <AdminOperationalListShell
        eyebrow={t("page.eyebrow")}
        title={t("page.questionsTitle")}
        description={t("page.questionsDescription")}
        actions={<HelpAdminSectionNav current="questions" />}
      >
        <ListStateSkeleton items={2} heightClass="h-32" />
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
          icon={<Eye className="h-8 w-8 text-text-muted" />}
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
      title={t("page.questionsTitle")}
      description={t("page.questionsDescription")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <HelpAdminSectionNav current="questions" />
          <Button type="button" size="sm" variant="outline" onClick={openCreate} startIcon={<Plus className="h-4 w-4" />}>
            {t("actions.addQuestion")}
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

      <SurfaceToolbar>
        <div className="grid gap-3 lg:grid-cols-4">
          <label className="block lg:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.search")}
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <InputField
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("filters.searchPlaceholder")}
                className="ps-11"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.category")}
            </span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("filters.allCategories")}</option>
              <option value="UNCATEGORIZED">{t("filters.uncategorized")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {getHelpCategoryTitle(category, locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.status")}
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("filters.allStatuses")}</option>
              <option value="ACTIVE">{t("filters.activeOnly")}</option>
              <option value="INACTIVE">{t("filters.inactiveOnly")}</option>
            </select>
          </label>
        </div>

        <div className="mt-3 flex items-center justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("ALL");
              setStatusFilter("ALL");
            }}
            disabled={!hasFilters}
          >
            {t("filters.clear")}
          </Button>
        </div>
      </SurfaceToolbar>

      <SurfaceCard as="section" variant="section" className="space-y-4">
        <DataTable
          data={rows}
          columns={questionColumns}
          getRowId={(row) => row.id}
          loading={questionsQuery.isLoading}
          emptyState={{
            icon: <Eye className="h-5 w-5 text-primary" />,
            title: searchQuery.trim() ? t("states.questionsEmptyFiltered.heading") : t("states.questionsEmpty.heading"),
            description: searchQuery.trim() ? t("states.questionsEmptyFiltered.note") : t("states.questionsEmpty.note"),
          }}
          rowActionsHeader={t("actions.menu")}
          rowActions={(row) => {
            const index = rows.findIndex((item) => item.id === row.id);
            return (
              <DropdownActionMenu
                label={t("actions.menu")}
                actions={[
                  {
                    key: "view",
                    label: t("actions.view"),
                    icon: <Eye className="h-4 w-4" />,
                    onClick: () => setViewingQuestion(row),
                  },
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
                    onClick: () => void moveQuestion(row.id, -1),
                  },
                  {
                    key: "down",
                    label: t("actions.down"),
                    icon: <ArrowDown className="h-4 w-4" />,
                    hidden: index < 0 || index >= rows.length - 1,
                    onClick: () => void moveQuestion(row.id, 1),
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
          ariaLabel={t("tables.questions.title")}
          caption={t("tables.questions.title")}
          size="sm"
          hoverable
          striped
        />
      </SurfaceCard>

      <QuestionFormModal
        isOpen={draft !== null}
        title={draft?.id ? t("modals.question.edit") : t("modals.question.create")}
        draft={draft ?? getEmptyQuestionDraft()}
        categories={categories}
        locale={locale}
        fieldErrors={fieldErrors}
        submitError={submitError}
        onChange={updateDraft}
        onClose={closeDraft}
        onSave={() => void saveQuestion()}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <QuestionViewModal
        isOpen={viewingQuestion !== null}
        question={viewingQuestion}
        locale={locale}
        categoryLabel={viewingCategory ? getHelpCategoryTitle(viewingCategory, locale) : t("filters.uncategorized")}
        onClose={() => setViewingQuestion(null)}
      />

      <DestructiveConfirmModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={t("confirmations.deleteQuestion.title")}
        description={t("confirmations.deleteQuestion.description")}
        confirmLabel={deleteMutation.isPending ? t("actions.saving") : t("actions.delete")}
        cancelLabel={t("actions.cancel")}
        onConfirm={() => {
          if (!pendingDelete) return;
          void removeQuestion(pendingDelete);
        }}
        loading={deleteMutation.isPending}
      >
        {pendingDelete ? (
          <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-4 text-sm text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
            <p className="font-semibold">{pendingDelete.questionAr}</p>
            <p className="mt-1 text-xs opacity-80">
              {pendingDelete.questionEn || pendingDelete.answerEn || pendingDelete.answerAr}
            </p>
          </div>
        ) : null}
      </DestructiveConfirmModal>
    </AdminOperationalListShell>
  );
}
