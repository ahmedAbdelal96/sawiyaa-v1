"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  ShieldX,
  Trash2,
} from "lucide-react";
import AdminOperationalListShell, {
  AdminSummaryCard,
} from "@/components/shared/admin/AdminOperationalListShell";
import Button from "@/components/ui/button/Button";
import { DataTable } from "@/components/ui/data-table";
import DataTableActionButton from "@/components/ui/data-table/DataTableActionButton";
import { DestructiveConfirmModal, FormModal } from "@/components/ui/modal";
import { toAppError } from "@/lib/api/errors";
import {
  useAdminSessionCancellationPolicies,
  useUpdateAdminSessionCancellationPolicy,
} from "../hooks/use-admin-sessions";
import type {
  RefundDestination,
  SessionCancellationBookingType,
  SessionCancellationPolicyItem,
  SessionCancellationRefundMode,
  UpdateSessionCancellationPolicyInput,
  UpdateSessionCancellationPolicyRuleInput,
} from "../types/admin-sessions.types";
import type { ColumnDef } from "@/components/ui/data-table";

type DraftRule = UpdateSessionCancellationPolicyRuleInput & { id: string };
type DraftPolicy = Omit<UpdateSessionCancellationPolicyInput, "rules"> & {
  rules: DraftRule[];
};
type DraftState = Record<SessionCancellationBookingType, DraftPolicy>;
type PolicyModalMode = "create" | "view" | "edit";

const BOOKING_TYPES: SessionCancellationBookingType[] = ["STANDARD", "INSTANT"];

function toNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDraft(policy: SessionCancellationPolicyItem): DraftPolicy {
  return {
    displayName: policy.displayName,
    isActive: policy.isActive,
    defaultRefundDestination: policy.defaultRefundDestination,
    rules: policy.rules.map((rule) => ({
      id: rule.id,
      code: rule.code,
      displayName: rule.displayName,
      priority: rule.priority,
      minHoursBeforeStart: rule.minHoursBeforeStart,
      maxHoursBeforeStart: rule.maxHoursBeforeStart,
      isCancellationAllowed: rule.isCancellationAllowed,
      refundMode: rule.refundMode,
      refundPercent:
        rule.refundPercent == null ? null : Number.parseFloat(rule.refundPercent),
      isActive: rule.isActive,
    })),
  };
}

function createDefaultDraft(
  bookingType: SessionCancellationBookingType,
  t: ReturnType<typeof useTranslations>,
): DraftPolicy {
  return {
    displayName: t(`policy.bookingTypes.${bookingType}` as never),
    isActive: true,
    defaultRefundDestination: "CUSTOMER_WALLET",
    rules: [
      {
        id: `new-${bookingType}-rule-${Date.now()}`,
        code: `${bookingType}_RULE_1`,
        displayName: t("policy.ruleSummary.untitled"),
        priority: 10,
        minHoursBeforeStart: null,
        maxHoursBeforeStart: null,
        isCancellationAllowed: false,
        refundMode: "NONE",
        refundPercent: 0,
        isActive: true,
      },
    ],
  };
}

function rangesOverlap(left: DraftRule, right: DraftRule) {
  const leftMin = left.minHoursBeforeStart ?? Number.NEGATIVE_INFINITY;
  const leftMax = left.maxHoursBeforeStart ?? Number.POSITIVE_INFINITY;
  const rightMin = right.minHoursBeforeStart ?? Number.NEGATIVE_INFINITY;
  const rightMax = right.maxHoursBeforeStart ?? Number.POSITIVE_INFINITY;
  return leftMin <= rightMax && rightMin <= leftMax;
}

function validatePolicyDraft(
  draft: DraftPolicy,
  t: ReturnType<typeof useTranslations>,
) {
  if (!draft.displayName.trim()) {
    return t("policy.validation.policyDisplayNameRequired");
  }

  if (!draft.rules.length) {
    return t("policy.validation.rulesRequired");
  }

  const seenCodes = new Set<string>();
  for (const rule of draft.rules) {
    const normalizedCode = rule.code.trim().toUpperCase();
    if (!normalizedCode) {
      return t("policy.validation.ruleCodeRequired");
    }
    if (seenCodes.has(normalizedCode)) {
      return t("policy.validation.duplicateCode", { code: normalizedCode });
    }
    seenCodes.add(normalizedCode);

    if (!rule.displayName.trim()) {
      return t("policy.validation.ruleDisplayNameRequired", { code: normalizedCode });
    }

    if (
      rule.minHoursBeforeStart != null &&
      rule.maxHoursBeforeStart != null &&
      rule.minHoursBeforeStart > rule.maxHoursBeforeStart
    ) {
      return t("policy.validation.invalidWindow", { code: normalizedCode });
    }

    if (!rule.isCancellationAllowed) {
      if (rule.refundMode !== "NONE") {
        return t("policy.validation.invalidRefundMode", { code: normalizedCode });
      }
      if (rule.refundPercent != null && rule.refundPercent !== 0) {
        return t("policy.validation.invalidRefundPercent", { code: normalizedCode });
      }
      continue;
    }

    if (rule.refundMode === "PERCENTAGE") {
      if (rule.refundPercent == null) {
        return t("policy.validation.refundPercentRequired", { code: normalizedCode });
      }
      if (rule.refundPercent < 0 || rule.refundPercent > 100) {
        return t("policy.validation.invalidRefundPercent", { code: normalizedCode });
      }
    }
  }

  const activeRules = draft.rules.filter((rule) => rule.isActive);
  for (let i = 0; i < activeRules.length; i += 1) {
    for (let j = i + 1; j < activeRules.length; j += 1) {
      if (rangesOverlap(activeRules[i], activeRules[j])) {
        return t("policy.validation.overlap", {
          first: activeRules[i].code,
          second: activeRules[j].code,
        });
      }
    }
  }

  return null;
}

function formatHoursRange(rule: DraftRule, t: ReturnType<typeof useTranslations>) {
  const min = rule.minHoursBeforeStart;
  const max = rule.maxHoursBeforeStart;
  if (min == null && max == null) return t("policy.ruleSummary.anyTime");
  if (min != null && max == null) return t("policy.ruleSummary.fromHours", { value: min });
  if (min == null && max != null) return t("policy.ruleSummary.untilHours", { value: max });
  return t("policy.ruleSummary.betweenHours", {
    min: min as number,
    max: max as number,
  });
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-surface-secondary/50 px-3 py-3">
      <dl className="space-y-1">
        <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
          {label}
        </dt>
        <dd className="text-sm font-semibold text-text-primary dark:text-white/95">{value}</dd>
      </dl>
    </div>
  );
}

export default function AdminCancellationPolicyEditor() {
  const t = useTranslations("admin-sessions");
  const policiesQuery = useAdminSessionCancellationPolicies();
  const updatePolicyMutation = useUpdateAdminSessionCancellationPolicy();

  const [draftByBookingType, setDraftByBookingType] = useState<DraftState>({} as DraftState);
  const [policyModalMode, setPolicyModalMode] = useState<PolicyModalMode | null>(null);
  const [activeBookingType, setActiveBookingType] =
    useState<SessionCancellationBookingType | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [deleteTargetBookingType, setDeleteTargetBookingType] =
    useState<SessionCancellationBookingType | null>(null);

  const policies = useMemo(
    () => policiesQuery.data?.items ?? [],
    [policiesQuery.data?.items],
  );

  const policiesByBookingType = useMemo(() => {
    const map = new Map<SessionCancellationBookingType, SessionCancellationPolicyItem>();
    for (const policy of policies) {
      map.set(policy.bookingType, policy);
    }
    return map;
  }, [policies]);

  const activePolicy = activeBookingType
    ? policiesByBookingType.get(activeBookingType) ?? null
    : null;
  const activeDraft = activeBookingType ? draftByBookingType[activeBookingType] : null;

  const isViewMode = policyModalMode === "view";
  const isEditMode = policyModalMode === "edit";
  const isCreateMode = policyModalMode === "create";
  const canEdit = isEditMode || isCreateMode;

  const savingBookingType = updatePolicyMutation.variables?.bookingType ?? null;
  const isSaving =
    Boolean(activeBookingType) &&
    updatePolicyMutation.isPending &&
    savingBookingType === activeBookingType;
  const isDeleteSaving =
    updatePolicyMutation.isPending && savingBookingType === deleteTargetBookingType;

  const totalRules = policies.reduce((sum, item) => sum + item.rules.length, 0);
  const activePolicies = policies.filter((item) => item.isActive).length;

  const columns = useMemo<ColumnDef<SessionCancellationPolicyItem>[]>(
    () => [
      {
        id: "bookingType",
        header: t("policy.table.headers.bookingType"),
        cell: (row) => (
          <span className="inline-flex rounded-full bg-surface-secondary px-3 py-1 text-xs font-semibold text-text-primary dark:bg-white/10 dark:text-white/90">
            {t(`policy.bookingTypes.${row.bookingType}` as never)}
          </span>
        ),
      },
      {
        id: "displayName",
        header: t("policy.table.headers.policyName"),
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
              {row.displayName}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {t("policy.table.headers.version")} #{row.version}
            </p>
          </div>
        ),
      },
      {
        id: "rules",
        header: t("policy.table.headers.rules"),
        accessor: (row) => row.rules.length,
      },
      {
        id: "refundDestination",
        header: t("policy.table.headers.refundDestination"),
        cell: (row) => (
          <span className="text-sm text-text-secondary">
            {t(`policy.refundDestinations.${row.defaultRefundDestination}` as never)}
          </span>
        ),
        hideBelow: "xl",
      },
      {
        id: "status",
        header: t("policy.table.headers.status"),
        cell: (row) =>
          row.isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-3 py-1 text-xs font-semibold text-success-700 dark:bg-success-500/15 dark:text-success-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("policy.table.values.active")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-3 py-1 text-xs font-semibold text-text-secondary dark:bg-white/10 dark:text-white/70">
              <ShieldX className="h-3.5 w-3.5" />
              {t("policy.table.values.inactive")}
            </span>
          ),
      },
    ],
    [t],
  );

  const updateDraft = (
    bookingType: SessionCancellationBookingType,
    updater: (current: DraftPolicy) => DraftPolicy,
  ) => {
    setDraftByBookingType((current) => {
      const base =
        current[bookingType] ??
        (policiesByBookingType.get(bookingType)
          ? toDraft(policiesByBookingType.get(bookingType) as SessionCancellationPolicyItem)
          : createDefaultDraft(bookingType, t));
      return {
        ...current,
        [bookingType]: updater(base),
      };
    });
    setFormError("");
    setSuccessMessage("");
  };

  const updateRule = (ruleId: string, updater: (current: DraftRule) => DraftRule) => {
    if (!activeBookingType) return;
    updateDraft(activeBookingType, (current) => ({
      ...current,
      rules: current.rules.map((rule) => (rule.id === ruleId ? updater(rule) : rule)),
    }));
  };

  const addRule = () => {
    if (!activeBookingType) return;
    updateDraft(activeBookingType, (current) => {
      const nextPriority = (current.rules.at(-1)?.priority ?? 0) + 10;
      const nextRule: DraftRule = {
        id: `new-${activeBookingType}-${Date.now()}`,
        code: "",
        displayName: "",
        priority: nextPriority,
        minHoursBeforeStart: null,
        maxHoursBeforeStart: null,
        isCancellationAllowed: false,
        refundMode: "NONE",
        refundPercent: 0,
        isActive: true,
      };
      return { ...current, rules: [...current.rules, nextRule] };
    });
  };

  const removeRule = (ruleId: string) => {
    if (!activeBookingType) return;
    updateDraft(activeBookingType, (current) => ({
      ...current,
      rules: current.rules.filter((rule) => rule.id !== ruleId),
    }));
    if (expandedRuleId === ruleId) {
      setExpandedRuleId(null);
    }
  };

  const openViewModal = (bookingType: SessionCancellationBookingType) => {
    const existing = policiesByBookingType.get(bookingType);
    if (!existing) return;
    setPolicyModalMode("view");
    setActiveBookingType(bookingType);
    setExpandedRuleId(existing.rules[0]?.id ?? null);
    setFormError("");
    setSuccessMessage("");
    setDraftByBookingType((current) => ({
      ...current,
      [bookingType]: current[bookingType] ?? toDraft(existing),
    }));
  };

  const openEditModal = (bookingType: SessionCancellationBookingType) => {
    const existing = policiesByBookingType.get(bookingType);
    if (!existing) return;
    setPolicyModalMode("edit");
    setActiveBookingType(bookingType);
    setExpandedRuleId(existing.rules[0]?.id ?? null);
    setFormError("");
    setSuccessMessage("");
    setDraftByBookingType((current) => ({
      ...current,
      [bookingType]: current[bookingType] ?? toDraft(existing),
    }));
  };

  const openCreateModal = () => {
    const target =
      BOOKING_TYPES.find((bookingType) => !policiesByBookingType.has(bookingType)) ??
      BOOKING_TYPES[0];
    setPolicyModalMode("create");
    setActiveBookingType(target);
    setExpandedRuleId(null);
    setFormError("");
    setSuccessMessage("");
    setDraftByBookingType((current) => ({
      ...current,
      [target]: current[target] ?? createDefaultDraft(target, t),
    }));
  };

  const closeModal = () => {
    setPolicyModalMode(null);
    setActiveBookingType(null);
    setExpandedRuleId(null);
    setFormError("");
    setSuccessMessage("");
  };

  const onBookingTypeChangeForCreate = (nextBookingType: SessionCancellationBookingType) => {
    setActiveBookingType(nextBookingType);
    setExpandedRuleId(null);
    setDraftByBookingType((current) => ({
      ...current,
      [nextBookingType]:
        current[nextBookingType] ??
        (policiesByBookingType.get(nextBookingType)
          ? toDraft(policiesByBookingType.get(nextBookingType) as SessionCancellationPolicyItem)
          : createDefaultDraft(nextBookingType, t)),
    }));
  };

  const saveActivePolicy = async () => {
    if (!activeBookingType || !activeDraft) return;

    const validationError = validatePolicyDraft(activeDraft, t);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError("");
    setSuccessMessage("");

    try {
      const payload: UpdateSessionCancellationPolicyInput = {
        displayName: activeDraft.displayName,
        isActive: activeDraft.isActive,
        defaultRefundDestination: activeDraft.defaultRefundDestination,
        rules: activeDraft.rules.map(({ id: _id, ...rule }) => rule),
      };
      await updatePolicyMutation.mutateAsync({
        bookingType: activeBookingType,
        body: payload,
      });
      setSuccessMessage(t("policy.states.saved"));
      if (policyModalMode === "create") {
        setPolicyModalMode("edit");
      }
    } catch (error) {
      const appError = toAppError(error);
      setFormError(appError.message || t("policy.states.updateFailed"));
    }
  };

  const deactivatePolicy = async () => {
    if (!deleteTargetBookingType) return;
    const draft =
      draftByBookingType[deleteTargetBookingType] ??
      (policiesByBookingType.get(deleteTargetBookingType)
        ? toDraft(
            policiesByBookingType.get(
              deleteTargetBookingType,
            ) as SessionCancellationPolicyItem,
          )
        : null);
    if (!draft) {
      setDeleteTargetBookingType(null);
      return;
    }
    try {
      await updatePolicyMutation.mutateAsync({
        bookingType: deleteTargetBookingType,
        body: {
          displayName: draft.displayName,
          isActive: false,
          defaultRefundDestination: draft.defaultRefundDestination as RefundDestination,
          rules: draft.rules.map(({ id: _id, ...rule }) => ({
            ...rule,
            isActive: false,
            isCancellationAllowed: false,
            refundMode: "NONE",
            refundPercent: 0,
          })),
        },
      });
      setDeleteTargetBookingType(null);
    } catch {
      setDeleteTargetBookingType(null);
    }
  };

  const modalTitle = useMemo(() => {
    if (isViewMode) return t("policy.modal.viewTitle");
    if (isEditMode) return t("policy.modal.editTitle");
    return t("policy.modal.createTitle");
  }, [isEditMode, isViewMode, t]);

  const modalDescription = useMemo(() => {
    if (isViewMode) return t("policy.modal.viewDescription");
    if (isEditMode) return t("policy.modal.editDescription");
    return t("policy.modal.createDescription");
  }, [isEditMode, isViewMode, t]);

  const isTableLoading = policiesQuery.isLoading;
  const isTableError = policiesQuery.isError;

  return (
    <>
      <AdminOperationalListShell
        title={t("policy.title")}
        description={t("policy.list.description")}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              startIcon={<Plus className="h-4 w-4" />}
              onClick={openCreateModal}
              disabled={isTableLoading}
            >
              {t("policy.actions.createPolicy")}
            </Button>
          </div>
        }
        summaryCards={
          <>
            <AdminSummaryCard
              label={t("policy.summary.totalPolicies")}
              value={policies.length}
              tone="primary"
            />
            <AdminSummaryCard
              label={t("policy.summary.activePolicies")}
              value={activePolicies}
              tone="success"
            />
            <AdminSummaryCard
              label={t("policy.summary.totalRules")}
              value={totalRules}
              tone="neutral"
            />
          </>
        }
        notice={
          <div className="rounded-2xl border border-border-light bg-surface-primary px-4 py-3 text-sm text-text-secondary">
            {t("policy.quickGuide")}
          </div>
        }
      >
        <DataTable
          data={policies}
          columns={columns}
          getRowId={(row) => row.id}
          loading={isTableLoading}
          error={isTableError ? t("policy.states.loadFailed") : null}
          errorState={{
            title: t("policy.states.loadFailed"),
            description: t("policy.states.loadFailed"),
            action: {
              label: t("states.error.retry"),
              onClick: () => policiesQuery.refetch(),
            },
          }}
          rowActionsHeader={t("table.actions")}
          rowActions={(row) => (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <DataTableActionButton
                label={t("policy.actions.viewPolicy")}
                icon={<Eye className="h-4 w-4" />}
                onClick={() => openViewModal(row.bookingType)}
              />
              <DataTableActionButton
                label={t("policy.actions.editPolicy")}
                icon={<Pencil className="h-4 w-4" />}
                intent="primary"
                onClick={() => openEditModal(row.bookingType)}
              />
              <DataTableActionButton
                label={t("policy.actions.deactivatePolicy")}
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => setDeleteTargetBookingType(row.bookingType)}
              />
            </div>
          )}
          emptyState={{
            icon: <AlertTriangle className="h-5 w-5 text-primary" />,
            title: t("policy.states.empty"),
            description: t("policy.states.empty"),
          }}
          ariaLabel={t("policy.title")}
          caption={t("policy.title")}
        />
      </AdminOperationalListShell>

      <FormModal
        isOpen={Boolean(policyModalMode)}
        onClose={closeModal}
        size="2xl"
        title={modalTitle}
        description={modalDescription}
        eyebrow={activeBookingType ? t(`policy.bookingTypes.${activeBookingType}` as never) : ""}
        loading={isSaving}
        onSubmit={canEdit ? saveActivePolicy : undefined}
        submitLabel={
          canEdit ? (
            <span className="inline-flex items-center gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? t("policy.actions.saving") : t("policy.actions.save")}
            </span>
          ) : undefined
        }
        cancelLabel={isViewMode ? t("policy.actions.close") : t("policy.actions.cancel")}
      >
        {activeDraft && activeBookingType ? (
          <div className="space-y-5">
            {formError ? (
              <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-300">
                {formError}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
                {successMessage}
              </div>
            ) : null}

            <section className="rounded-2xl border border-border-light bg-surface-primary p-4">
              {isViewMode ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <ReadOnlyField
                    label={t("policy.table.headers.bookingType")}
                    value={t(`policy.bookingTypes.${activeBookingType}` as never)}
                  />
                  <ReadOnlyField
                    label={t("policy.fields.policyName")}
                    value={activeDraft.displayName || t("policy.fields.policyTitleFallback")}
                  />
                  <ReadOnlyField
                    label={t("policy.fields.refundDestination")}
                    value={t(
                      `policy.refundDestinations.${activeDraft.defaultRefundDestination}` as never,
                    )}
                  />
                  <ReadOnlyField
                    label={t("policy.fields.policyActive")}
                    value={
                      activeDraft.isActive
                        ? t("policy.table.values.active")
                        : t("policy.table.values.inactive")
                    }
                  />
                  <ReadOnlyField
                    label={t("policy.table.headers.version")}
                    value={`#${activePolicy?.version ?? "-"}`}
                  />
                  <ReadOnlyField
                    label={t("policy.table.headers.rules")}
                    value={String(activeDraft.rules.length)}
                  />
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-text-muted">
                      {t("policy.table.headers.bookingType")}
                    </span>
                    {isCreateMode ? (
                      <select
                        className="app-control w-full px-3 py-2.5"
                        value={activeBookingType}
                        onChange={(event) =>
                          onBookingTypeChangeForCreate(
                            event.target.value as SessionCancellationBookingType,
                          )
                        }
                      >
                        {BOOKING_TYPES.map((bookingType) => (
                          <option key={bookingType} value={bookingType}>
                            {t(`policy.bookingTypes.${bookingType}` as never)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="rounded-xl border border-border-light bg-surface-secondary px-3 py-2.5 text-sm text-text-primary">
                        {t(`policy.bookingTypes.${activeBookingType}` as never)}
                      </div>
                    )}
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-text-muted">
                      {t("policy.fields.policyName")}
                    </span>
                    <input
                      className="app-control w-full px-3 py-2.5"
                      value={activeDraft.displayName}
                      disabled={!canEdit}
                      onChange={(event) =>
                        updateDraft(activeBookingType, (current) => ({
                          ...current,
                          displayName: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-text-muted">
                      {t("policy.fields.refundDestination")}
                    </span>
                    <select
                      className="app-control w-full px-3 py-2.5"
                      value={activeDraft.defaultRefundDestination}
                      disabled={!canEdit}
                      onChange={(event) =>
                        updateDraft(activeBookingType, (current) => ({
                          ...current,
                          defaultRefundDestination: event.target.value as RefundDestination,
                        }))
                      }
                    >
                      <option value="CUSTOMER_WALLET">
                        {t("policy.refundDestinations.CUSTOMER_WALLET")}
                      </option>
                      <option value="ORIGINAL_METHOD" disabled>
                        {t("policy.refundDestinations.ORIGINAL_METHOD")}
                      </option>
                    </select>
                  </label>

                  <label className="flex items-center gap-2 rounded-2xl border border-border-light bg-surface-secondary px-3 py-2.5 text-sm text-text-primary">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
                      checked={activeDraft.isActive}
                      disabled={!canEdit}
                      onChange={(event) =>
                        updateDraft(activeBookingType, (current) => ({
                          ...current,
                          isActive: event.target.checked,
                        }))
                      }
                    />
                    {t("policy.fields.policyActive")}
                  </label>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border-light bg-surface-primary p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-text-primary">{t("policy.rulesSection.title")}</h3>
                  <p className="text-sm text-text-secondary">{t("policy.rulesSection.note")}</p>
                </div>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    startIcon={<Plus className="h-4 w-4" />}
                    onClick={addRule}
                  >
                    {t("policy.actions.addRule")}
                  </Button>
                ) : null}
              </div>

              <div className="space-y-3">
                {activeDraft.rules.map((rule) => {
                  const refundMode = (rule.refundMode ?? "NONE") as SessionCancellationRefundMode;
                  const isExpanded = expandedRuleId === rule.id;
                  return (
                    <div
                      key={rule.id}
                      className="rounded-2xl border border-border-light bg-surface-secondary p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-primary">
                            {rule.displayName || t("policy.ruleSummary.untitled")}
                          </p>
                          <p className="mt-1 text-xs text-text-secondary">
                            {rule.code || t("policy.ruleSummary.noCode")}
                            {" - "}
                            {formatHoursRange(rule, t)}
                            {" - "}
                            {rule.isCancellationAllowed
                              ? t("policy.ruleSummary.allow")
                              : t("policy.ruleSummary.block")}
                            {" - "}
                            {refundMode === "PERCENTAGE"
                              ? t("policy.ruleSummary.percentRefund", {
                                  value: rule.refundPercent ?? 0,
                                })
                              : t("policy.ruleSummary.noRefund")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isViewMode ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              startIcon={<Eye className="h-4 w-4" />}
                              onClick={() =>
                                setExpandedRuleId((current) =>
                                  current === rule.id ? null : rule.id,
                                )
                              }
                            >
                              {isExpanded ? t("policy.actions.close") : t("policy.actions.viewPolicy")}
                            </Button>
                          ) : null}

                          {canEdit ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                startIcon={<Pencil className="h-4 w-4" />}
                                onClick={() =>
                                  setExpandedRuleId((current) =>
                                    current === rule.id ? null : rule.id,
                                  )
                                }
                              >
                                {isExpanded
                                  ? t("policy.actions.closeEdit")
                                  : t("policy.actions.editRule")}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                startIcon={<Trash2 className="h-4 w-4" />}
                                onClick={() => removeRule(rule.id)}
                              >
                                {t("policy.actions.removeRule")}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>

                      {isExpanded ? (
                        isViewMode ? (
                          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            <ReadOnlyField
                              label={t("policy.fields.ruleCode")}
                              value={rule.code || t("policy.ruleSummary.noCode")}
                            />
                            <ReadOnlyField
                              label={t("policy.fields.ruleName")}
                              value={rule.displayName || t("policy.ruleSummary.untitled")}
                            />
                            <ReadOnlyField
                              label={t("policy.fields.priority")}
                              value={String(rule.priority)}
                            />
                            <ReadOnlyField
                              label={t("policy.fields.ruleActive")}
                              value={
                                rule.isActive
                                  ? t("policy.table.values.active")
                                  : t("policy.table.values.inactive")
                              }
                            />
                            <ReadOnlyField
                              label={t("policy.fields.allowCancellation")}
                              value={
                                rule.isCancellationAllowed
                                  ? t("drawer.values.yes")
                                  : t("drawer.values.no")
                              }
                            />
                            <ReadOnlyField
                              label={t("policy.fields.refundMode")}
                              value={t(`policy.refundModes.${refundMode}` as never)}
                            />
                            <ReadOnlyField
                              label={t("policy.fields.minHours")}
                              value={
                                rule.minHoursBeforeStart == null
                                  ? "-"
                                  : String(rule.minHoursBeforeStart)
                              }
                            />
                            <ReadOnlyField
                              label={t("policy.fields.maxHours")}
                              value={
                                rule.maxHoursBeforeStart == null
                                  ? "-"
                                  : String(rule.maxHoursBeforeStart)
                              }
                            />
                            <ReadOnlyField
                              label={t("policy.fields.refundPercent")}
                              value={
                                refundMode === "PERCENTAGE"
                                  ? String(rule.refundPercent ?? 0)
                                  : "0"
                              }
                            />
                          </div>
                        ) : (
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-text-muted">
                              {t("policy.fields.ruleCode")}
                            </span>
                            <input
                              className="app-control w-full px-3 py-2.5"
                              value={rule.code}
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateRule(rule.id, (current) => ({
                                  ...current,
                                  code: event.target.value,
                                }))
                              }
                            />
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-text-muted">
                              {t("policy.fields.ruleName")}
                            </span>
                            <input
                              className="app-control w-full px-3 py-2.5"
                              value={rule.displayName}
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateRule(rule.id, (current) => ({
                                  ...current,
                                  displayName: event.target.value,
                                }))
                              }
                            />
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-text-muted">
                              {t("policy.fields.priority")}
                            </span>
                            <input
                              type="number"
                              className="app-control w-full px-3 py-2.5"
                              value={String(rule.priority)}
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateRule(rule.id, (current) => ({
                                  ...current,
                                  priority: Number.parseInt(event.target.value || "0", 10),
                                }))
                              }
                            />
                          </label>

                          <label className="flex items-center gap-2 rounded-2xl border border-border-light bg-surface-primary px-3 py-2.5 text-sm text-text-primary">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
                              checked={rule.isActive}
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateRule(rule.id, (current) => ({
                                  ...current,
                                  isActive: event.target.checked,
                                }))
                              }
                            />
                            {t("policy.fields.ruleActive")}
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-text-muted">
                              {t("policy.fields.minHours")}
                            </span>
                            <input
                              type="number"
                              className="app-control w-full px-3 py-2.5"
                              value={rule.minHoursBeforeStart ?? ""}
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateRule(rule.id, (current) => ({
                                  ...current,
                                  minHoursBeforeStart: toNullableNumber(event.target.value),
                                }))
                              }
                            />
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-text-muted">
                              {t("policy.fields.maxHours")}
                            </span>
                            <input
                              type="number"
                              className="app-control w-full px-3 py-2.5"
                              value={rule.maxHoursBeforeStart ?? ""}
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateRule(rule.id, (current) => ({
                                  ...current,
                                  maxHoursBeforeStart: toNullableNumber(event.target.value),
                                }))
                              }
                            />
                          </label>

                          <label className="flex items-center gap-2 rounded-2xl border border-border-light bg-surface-primary px-3 py-2.5 text-sm text-text-primary">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
                              checked={rule.isCancellationAllowed}
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateRule(rule.id, (current) => ({
                                  ...current,
                                  isCancellationAllowed: event.target.checked,
                                  refundMode: event.target.checked ? current.refundMode : "NONE",
                                  refundPercent: event.target.checked
                                    ? current.refundPercent
                                    : 0,
                                }))
                              }
                            />
                            {t("policy.fields.allowCancellation")}
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-text-muted">
                              {t("policy.fields.refundMode")}
                            </span>
                            <select
                              className="app-control w-full px-3 py-2.5"
                              value={refundMode}
                              disabled={!canEdit || !rule.isCancellationAllowed}
                              onChange={(event) =>
                                updateRule(rule.id, (current) => ({
                                  ...current,
                                  refundMode: event.target.value as SessionCancellationRefundMode,
                                  refundPercent:
                                    event.target.value === "PERCENTAGE"
                                      ? current.refundPercent ?? 0
                                      : 0,
                                }))
                              }
                            >
                              <option value="NONE">{t("policy.refundModes.NONE")}</option>
                              <option value="PERCENTAGE">
                                {t("policy.refundModes.PERCENTAGE")}
                              </option>
                            </select>
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-text-muted">
                              {t("policy.fields.refundPercent")}
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              className="app-control w-full px-3 py-2.5"
                              value={rule.refundPercent ?? ""}
                              disabled={!canEdit || !rule.isCancellationAllowed || refundMode !== "PERCENTAGE"}
                              onChange={(event) =>
                                updateRule(rule.id, (current) => ({
                                  ...current,
                                  refundPercent: toNullableNumber(event.target.value),
                                }))
                              }
                            />
                          </label>
                        </div>
                        )
                      ) : null}
                    </div>
                  );
                })}

                {!activeDraft.rules.length ? (
                  <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-sm text-text-secondary">
                    {t("policy.states.emptyRules")}
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : (
          <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-sm text-text-secondary">
            {t("policy.states.empty")}
          </div>
        )}
      </FormModal>

      <DestructiveConfirmModal
        isOpen={Boolean(deleteTargetBookingType)}
        onClose={() => setDeleteTargetBookingType(null)}
        title={t("policy.deactivate.title")}
        description={t("policy.deactivate.description")}
        confirmLabel={isDeleteSaving ? t("policy.actions.saving") : t("policy.deactivate.confirm")}
        cancelLabel={t("policy.actions.cancel")}
        loading={isDeleteSaving}
        onConfirm={deactivatePolicy}
      />
    </>
  );
}

