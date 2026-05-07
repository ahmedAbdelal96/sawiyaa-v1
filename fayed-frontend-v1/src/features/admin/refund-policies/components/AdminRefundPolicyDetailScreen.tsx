"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AlertTriangle, ArrowLeft, ArrowDown, ArrowUp, Plus, Pencil, Trash2 } from "lucide-react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import AdminOperationalListShell from "@/components/shared/admin/AdminOperationalListShell";
import { SurfaceCard, SurfaceHeader, SurfaceToolbar } from "@/components/shared/SurfaceShell";
import { toAppError } from "@/lib/api/errors";
import { useAdminRefundPolicies, useCreateAdminRefundPolicyClause, useDeleteAdminRefundPolicyClause, useReorderAdminRefundPolicyClauses, useUpdateAdminRefundPolicy, useUpdateAdminRefundPolicyClause } from "../hooks/use-admin-refund-policies";
import {
  formatAdminRefundPolicyDate,
  getAdminRefundPolicyPath,
} from "../lib/admin-refund-policies.view";
import { normalizeAdminRefundPolicyType } from "../lib/admin-refund-policies";
import AdminRefundPolicyDocument from "./AdminRefundPolicyDocument";
import type { AdminRefundPolicyClause, AdminRefundPolicyType } from "../types/admin-refund-policies.types";

type Props = {
  policyType: AdminRefundPolicyType;
};

type ClauseDraft = {
  id: string | null;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  sortOrder: number;
  isActive: boolean;
};

type ViewMode = "edit" | "preview";
type PreviewLocale = "ar" | "en";

function emptyClauseDraft(sortOrder: number): ClauseDraft {
  return {
    id: null,
    titleAr: "",
    titleEn: "",
    bodyAr: "",
    bodyEn: "",
    sortOrder,
    isActive: true,
  };
}

function ClauseModal({
  isOpen,
  title,
  draft,
  onChange,
  onClose,
  onSave,
  isSaving,
}: {
  isOpen: boolean;
  title: string;
  draft: ClauseDraft;
  onChange: (value: ClauseDraft) => void;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const t = useTranslations("admin-refund-policies");
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-text-primary">{t("editor.fields.titleAr")}</span>
            <input
              value={draft.titleAr}
              onChange={(event) => onChange({ ...draft, titleAr: event.target.value })}
              className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-primary"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-text-primary">{t("editor.fields.titleEn")}</span>
            <input
              value={draft.titleEn}
              onChange={(event) => onChange({ ...draft, titleEn: event.target.value })}
              className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-primary"
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-text-primary">{t("editor.fields.bodyAr")}</span>
            <textarea
              value={draft.bodyAr}
              onChange={(event) => onChange({ ...draft, bodyAr: event.target.value })}
              rows={4}
              className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-text-primary">{t("editor.fields.bodyEn")}</span>
            <textarea
              value={draft.bodyEn}
              onChange={(event) => onChange({ ...draft, bodyEn: event.target.value })}
              rows={4}
              className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="md:col-span-2 inline-flex items-center gap-3 rounded-2xl border border-border-light bg-surface px-4 py-3">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => onChange({ ...draft, isActive: event.target.checked })}
              className="h-4 w-4 rounded border-border-light text-primary"
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium text-text-primary">{t("editor.fields.isActive")}</span>
              <span className="block text-xs leading-5 text-text-secondary">{t("editor.fields.clauseActiveNote")}</span>
            </span>
          </label>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t("actions.cancel")}
        </Button>
        <Button type="button" onClick={onSave} disabled={isSaving}>
          {isSaving ? t("actions.saving") : t("actions.save")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default function AdminRefundPolicyDetailScreen({ policyType }: Props) {
  const t = useTranslations("admin-refund-policies");
  const locale = useLocale();
  const router = useRouter();
  const normalizedPolicyType = normalizeAdminRefundPolicyType(policyType) ?? policyType;
  const policiesQuery = useAdminRefundPolicies();
  const updatePolicyMutation = useUpdateAdminRefundPolicy();
  const createClauseMutation = useCreateAdminRefundPolicyClause();
  const updateClauseMutation = useUpdateAdminRefundPolicyClause();
  const deleteClauseMutation = useDeleteAdminRefundPolicyClause();
  const reorderClausesMutation = useReorderAdminRefundPolicyClauses();

  const policy = useMemo(
    () =>
      policiesQuery.data?.items.find(
        (item) => normalizeAdminRefundPolicyType(item.policyType) === normalizedPolicyType,
      ) ?? null,
    [normalizedPolicyType, policiesQuery.data?.items],
  );
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [clauses, setClauses] = useState<AdminRefundPolicyClause[]>([]);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [editingClause, setEditingClause] = useState<ClauseDraft | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [previewLocale, setPreviewLocale] = useState<PreviewLocale>("ar");

  useEffect(() => {
    if (!policy) return;
    setTitleAr(policy.titleAr ?? "");
    setTitleEn(policy.titleEn ?? "");
    setIsActive(policy.isActive);
    setClauses(policy.clauses);
  }, [policy]);

  const titleLabel = t(`detail.title.${getAdminRefundPolicyPath(normalizedPolicyType)}` as never);

  const sortedClauses = useMemo(() => [...clauses].sort((a, b) => a.sortOrder - b.sortOrder), [clauses]);
  const previewPolicy = useMemo(
    () =>
      policy
        ? {
            ...policy,
            titleAr,
            titleEn,
            isActive,
            clauses: sortedClauses.filter((clause) => clause.isActive),
          }
        : null,
    [isActive, policy, sortedClauses, titleAr, titleEn],
  );

  async function handleSavePolicy() {
    if (!policy) return;
    try {
      await updatePolicyMutation.mutateAsync({
        policyType: normalizedPolicyType,
        input: {
          titleAr: titleAr.trim(),
          titleEn: titleEn.trim(),
          isActive,
        },
      });
      setFeedback({ tone: "success", message: t("feedback.policySaved") });
    } catch (error) {
      const appError = toAppError(error);
      setFeedback({ tone: "error", message: appError.message || t("feedback.policySaveError") });
    }
  }

  function openNewClause() {
    setEditingClause(emptyClauseDraft((clauses.at(-1)?.sortOrder ?? 0) + 1));
    setIsCreateMode(true);
  }

  function openEditClause(clause: AdminRefundPolicyClause) {
    setEditingClause({
      id: clause.id,
      titleAr: clause.titleAr ?? "",
      titleEn: clause.titleEn ?? "",
      bodyAr: clause.bodyAr,
      bodyEn: clause.bodyEn,
      sortOrder: clause.sortOrder,
      isActive: clause.isActive,
    });
    setIsCreateMode(false);
  }

  async function saveClause() {
    if (!editingClause) return;
    try {
      const input = {
        titleAr: editingClause.titleAr.trim() || null,
        titleEn: editingClause.titleEn.trim() || null,
        bodyAr: editingClause.bodyAr.trim(),
        bodyEn: editingClause.bodyEn.trim(),
        sortOrder: editingClause.sortOrder,
        isActive: editingClause.isActive,
      };
      if (isCreateMode || !editingClause.id) {
        await createClauseMutation.mutateAsync({ policyType: normalizedPolicyType, input });
      } else {
        await updateClauseMutation.mutateAsync({ policyType: normalizedPolicyType, clauseId: editingClause.id, input });
      }
      setEditingClause(null);
      setFeedback({ tone: "success", message: t("feedback.clauseSaved") });
    } catch (error) {
      const appError = toAppError(error);
      setFeedback({ tone: "error", message: appError.message || t("feedback.clauseSaveError") });
    }
  }

  async function removeClause(clauseId: string) {
    try {
      await deleteClauseMutation.mutateAsync({ policyType: normalizedPolicyType, clauseId });
      setFeedback({ tone: "success", message: t("feedback.clauseDeleted") });
    } catch (error) {
      const appError = toAppError(error);
      setFeedback({ tone: "error", message: appError.message || t("feedback.clauseDeleteError") });
    }
  }

  async function moveClause(clauseId: string, direction: -1 | 1) {
    const nextClauses = [...sortedClauses];
    const index = nextClauses.findIndex((item) => item.id === clauseId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= nextClauses.length) return;
    const current = nextClauses[index];
    const target = nextClauses[targetIndex];
    nextClauses[index] = { ...current, sortOrder: target.sortOrder };
    nextClauses[targetIndex] = { ...target, sortOrder: current.sortOrder };
    setClauses(nextClauses);
    try {
      await reorderClausesMutation.mutateAsync({
        policyType: normalizedPolicyType,
        input: {
          items: nextClauses.map((item) => ({ id: item.id, sortOrder: item.sortOrder })),
        },
      });
    } catch (error) {
      const appError = toAppError(error);
      setFeedback({ tone: "error", message: appError.message || t("feedback.reorderError") });
    }
  }

  if (policiesQuery.isLoading && !policiesQuery.data) {
    return (
      <div className="space-y-5">
        <SurfaceCard as="section" variant="page">
          <ListStateSkeleton items={1} heightClass="h-32" />
        </SurfaceCard>
        <ListStateSkeleton items={1} heightClass="h-64" />
      </div>
    );
  }

  if (policiesQuery.isError && !policiesQuery.data) {
    const appError = policiesQuery.error ? toAppError(policiesQuery.error) : null;
    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<AlertTriangle className="h-8 w-8 text-text-muted" />}
          title={t("states.error.heading")}
          note={appError?.message ?? t("states.error.note")}
          action={{ label: t("states.error.retry"), onClick: () => policiesQuery.refetch() }}
        />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<AlertTriangle className="h-8 w-8 text-text-muted" />}
          title={t("detail.notFound.heading")}
          note={t("detail.notFound.note")}
          action={{
            label: t("actions.back"),
            onClick: () => router.push("/admin/refund-policies" as never),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SurfaceCard as="section" variant="page">
        <SurfaceHeader
          eyebrow={t("detail.eyebrow")}
          title={
            <div className="flex flex-wrap items-center gap-3">
              <span>{titleAr.trim() || titleEn.trim() || titleLabel}</span>
              <Badge variant="solid" color={policy.isActive ? "success" : "warning"} size="sm">
                {policy.isActive ? t("badges.active") : t("badges.inactive")}
              </Badge>
            </div>
          }
          description={t("detail.description")}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => router.push("/admin/refund-policies" as never)}
                startIcon={<ArrowLeft className="h-4 w-4" />}
              >
                {t("detail.back")}
              </Button>
              <Button type="button" size="sm" onClick={() => void handleSavePolicy()} disabled={updatePolicyMutation.isPending}>
                {updatePolicyMutation.isPending ? t("actions.saving") : t("actions.saveChanges")}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={openNewClause} startIcon={<Plus className="h-4 w-4" />}>
                {t("actions.addClause")}
              </Button>
            </div>
          }
          meta={
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-surface px-3 py-1 text-sm font-medium text-text-primary">
                {t("detail.summary.clauses")}: {sortedClauses.length}
              </span>
              <span className="rounded-full bg-surface px-3 py-1 text-sm font-medium text-text-primary">
                {t("detail.summary.updatedAt")}: {formatAdminRefundPolicyDate(policy.updatedAt, locale)}
              </span>
            </div>
          }
        />
      </SurfaceCard>

      {feedback ? (
        <p className={`rounded-2xl border px-4 py-3 text-sm ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </p>
      ) : null}

      <SurfaceToolbar className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-text-primary">{t("detail.preview.toggleLabel")}</p>
          <p className="text-sm text-text-secondary">{t("detail.preview.toggleNote")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={viewMode === "edit" ? "primary" : "outline"}
            onClick={() => setViewMode("edit")}
          >
            {t("detail.mode.edit")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "preview" ? "primary" : "outline"}
            onClick={() => setViewMode("preview")}
          >
            {t("detail.mode.preview")}
          </Button>
        </div>
      </SurfaceToolbar>

      {viewMode === "edit" ? (
        <>
          <SurfaceCard as="section" variant="compact" className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-text-primary">{t("detail.sections.policyInfo")}</h3>
              <p className="text-sm text-text-secondary">{t("detail.sections.policyInfoNote")}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-primary">{t("editor.fields.titleAr")}</span>
                <input
                  value={titleAr}
                  onChange={(event) => setTitleAr(event.target.value)}
                  className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-text-primary">{t("editor.fields.titleEn")}</span>
                <input
                  value={titleEn}
                  onChange={(event) => setTitleEn(event.target.value)}
                  className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="md:col-span-2 inline-flex items-center gap-3 rounded-2xl border border-border-light bg-surface px-4 py-3">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-4 w-4 rounded border-border-light text-primary"
                />
                <span className="text-sm font-medium text-text-primary">{t("editor.fields.isActive")}</span>
              </label>
            </div>
          </SurfaceCard>

          <SurfaceCard as="section" variant="section" className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-text-primary">{t("clauses.heading")}</h3>
              <p className="text-sm text-text-secondary">{t("clauses.note")}</p>
            </div>

            <div className="space-y-2">
              {sortedClauses.map((clause) => (
                <div key={clause.id} className="rounded-2xl border border-border-light bg-white px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="light" color="primary" size="sm">
                          {t("clauses.rowNumber", { index: clause.sortOrder })}
                        </Badge>
                        <Badge variant="solid" color={clause.isActive ? "success" : "warning"} size="sm">
                          {clause.isActive ? t("badges.active") : t("badges.inactive")}
                        </Badge>
                      </div>
                      {clause.titleAr || clause.titleEn ? (
                        <p className="text-sm font-semibold text-text-primary">
                          {clause.titleAr || clause.titleEn}
                        </p>
                      ) : null}
                      <p className="text-sm leading-6 text-text-primary">{clause.bodyAr}</p>
                      <p className="text-sm leading-6 text-text-secondary">{clause.bodyEn}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void moveClause(clause.id, -1)}
                        disabled={clause.sortOrder <= 1}
                        startIcon={<ArrowUp className="h-4 w-4" />}
                      >
                        {t("clauses.actions.up")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void moveClause(clause.id, 1)}
                        disabled={clause.sortOrder >= sortedClauses.length}
                        startIcon={<ArrowDown className="h-4 w-4" />}
                      >
                        {t("clauses.actions.down")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openEditClause(clause)}
                        startIcon={<Pencil className="h-4 w-4" />}
                      >
                        {t("clauses.actions.edit")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void removeClause(clause.id)}
                        startIcon={<Trash2 className="h-4 w-4" />}
                      >
                        {t("clauses.actions.delete")}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {sortedClauses.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border-light bg-surface px-4 py-4 text-sm text-text-secondary">
                  {t("clauses.empty.note")}
                </p>
              ) : null}
            </div>
          </SurfaceCard>
        </>
      ) : (
        <SurfaceCard as="section" variant="section" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-text-primary">{t("preview.heading")}</h3>
              <p className="text-sm text-text-secondary">{t("preview.note")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={previewLocale === "ar" ? "primary" : "outline"}
                onClick={() => setPreviewLocale("ar")}
              >
                {t("preview.languageAr")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={previewLocale === "en" ? "primary" : "outline"}
                onClick={() => setPreviewLocale("en")}
              >
                {t("preview.languageEn")}
              </Button>
            </div>
          </div>
          {previewPolicy ? (
            <AdminRefundPolicyDocument policy={previewPolicy} displayLocale={previewLocale} />
          ) : null}
        </SurfaceCard>
      )}

      <ClauseModal
        isOpen={editingClause !== null}
        title={isCreateMode ? t("clauses.modal.create") : t("clauses.modal.edit")}
        draft={editingClause ?? emptyClauseDraft(1)}
        onChange={(value) => setEditingClause(value)}
        onClose={() => setEditingClause(null)}
        onSave={() => void saveClause()}
        isSaving={createClauseMutation.isPending || updateClauseMutation.isPending}
      />
    </div>
  );
}
