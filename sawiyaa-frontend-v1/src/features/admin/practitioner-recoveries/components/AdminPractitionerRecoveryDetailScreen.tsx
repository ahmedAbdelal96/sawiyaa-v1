"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BadgeDollarSign,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { AdminSectionCard, AdminStatusBadge } from "@/components/shared/admin/AdminDashboardKit";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import Button from "@/components/ui/button/Button";
import { PermissionKey } from "@/lib/auth/permissions";
import { isStepUpRequiredError, toAppError } from "@/lib/api/errors";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";
import { useAdminStepUp } from "@/features/admin/users/hooks/use-admin-step-up";
import { formatSettlementMoney } from "@/features/admin/finance/lib/finance-formatters";
import { getAdminPractitionerRecoveryActionKey, getAdminPractitionerRecoveryErrorKey, getAdminPractitionerRecoveryReasonCodeKey, getAdminPractitionerRecoveryStatusKey } from "../lib/admin-practitioner-recovery-status";
import {
  useAdminPractitionerRecovery,
  useMarkAdminPractitionerRecoveryCollected,
  useWaiveAdminPractitionerRecovery,
} from "../hooks/use-admin-practitioner-recoveries";
import type {
  AdminPractitionerRecoveryActionItem,
  AdminPractitionerRecoveryDetailItem,
  PractitionerRecoveryActionType,
  PractitionerRecoveryStatus,
  SessionEarningReviewStatus,
} from "../types/admin-practitioner-recoveries.types";

type Props = {
  id: string;
};

function normalizeLocale(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-US";
}

function formatDateTime(locale: string, value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shortId(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return value.length <= 16 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function readOnlyValue(value: string | null | undefined) {
  return value?.trim() || "-";
}

function humanizeDisplayName(primary: string | null | undefined, fallback: string | null | undefined) {
  const primaryValue = primary?.trim();
  if (primaryValue) {
    return primaryValue;
  }

  const fallbackValue = fallback?.trim();
  if (!fallbackValue) {
    return "-";
  }

  return fallbackValue.length > 24 ? shortId(fallbackValue) : fallbackValue;
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `recovery-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getStatusTone(status: PractitionerRecoveryStatus) {
  switch (status) {
    case "RECOVERED":
      return "success";
    case "PARTIALLY_RECOVERED":
      return "primary";
    case "WAIVED":
      return "muted";
    case "OPEN":
    default:
      return "warning";
  }
}

function getActionTone(actionType: PractitionerRecoveryActionType) {
  switch (actionType) {
    case "MANUALLY_COLLECTED":
      return "success";
    case "WAIVED":
      return "warning";
    case "APPLIED_TO_PAYOUT":
    default:
      return "primary";
  }
}

function getReviewStatusKey(status: SessionEarningReviewStatus | null) {
  switch (status) {
    case "PENDING_REVIEW":
      return "practitionerRecoveries.reviewStatuses.pendingReview";
    case "APPROVED":
      return "practitionerRecoveries.reviewStatuses.approved";
    case "REJECTED":
      return "practitionerRecoveries.reviewStatuses.rejected";
    case "EXCLUDED_FROM_PAYOUT":
      return "practitionerRecoveries.reviewStatuses.excludedFromPayout";
    default:
      return null;
  }
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-light py-3 last:border-b-0 dark:border-white/8">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span className={`text-right text-sm text-text-primary dark:text-white/90 ${mono ? "font-mono text-xs sm:text-sm" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function SummaryTile({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[24px] border border-border-light bg-surface-secondary px-4 py-4 dark:bg-white/[0.03]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
        {title}
      </p>
      <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-text-secondary">{hint}</p> : null}
    </div>
  );
}

function ActionBadge({
  actionType,
  t,
}: {
  actionType: AdminPractitionerRecoveryActionItem["actionType"];
  t: ReturnType<typeof useTranslations>;
}) {
  const tone = getActionTone(actionType);
  return (
    <AdminStatusBadge tone={tone}>
      {t(getAdminPractitionerRecoveryActionKey(actionType) as Parameters<typeof t>[0])}
    </AdminStatusBadge>
  );
}

function StatusMessage({
  tone,
  message,
}: {
  tone: "success" | "warning" | "error";
  message: string;
}) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/30 dark:bg-emerald-900/10 dark:text-emerald-300"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
        : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/10 dark:text-red-300";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${className}`}>{message}</div>;
}

function RecoveryContextCard({
  item,
  locale,
  t,
}: {
  item: AdminPractitionerRecoveryDetailItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <AdminSectionCard
      title={t("practitionerRecoveries.detail.context.title")}
      description={t("practitionerRecoveries.detail.context.description")}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
          <DetailRow
            label={t("practitionerRecoveries.detail.context.practitioner")}
            value={humanizeDisplayName(item.practitioner.displayName, item.practitioner.publicSlug)}
          />
          <DetailRow
            label={t("practitionerRecoveries.detail.context.professionalTitle")}
            value={readOnlyValue(item.practitioner.professionalTitle)}
          />
          <DetailRow
            label={t("practitionerRecoveries.detail.context.publicSlug")}
            value={readOnlyValue(item.practitioner.publicSlug)}
            mono
          />
          <DetailRow
            label={t("practitionerRecoveries.detail.context.recoveryId")}
            value={shortId(item.recoveryId)}
            mono
          />
        </div>

        <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
          <DetailRow
            label={t("practitionerRecoveries.detail.context.session")}
            value={item.session?.sessionCode ? `${shortId(item.session.sessionCode)}` : t("practitionerRecoveries.detail.context.notLinked")}
            mono={Boolean(item.session?.sessionCode)}
          />
          <DetailRow
            label={t("practitionerRecoveries.detail.context.payment")}
            value={item.payment?.paymentId ? shortId(item.payment.paymentId) : t("practitionerRecoveries.detail.context.notLinked")}
            mono={Boolean(item.payment?.paymentId)}
          />
          <DetailRow
            label={t("practitionerRecoveries.detail.context.refund")}
            value={item.refund?.refundId ? shortId(item.refund.refundId) : t("practitionerRecoveries.detail.context.notLinked")}
            mono={Boolean(item.refund?.refundId)}
          />
          <DetailRow
            label={t("practitionerRecoveries.detail.context.review")}
            value={item.sessionEarningReview?.sessionEarningReviewId ? shortId(item.sessionEarningReview.sessionEarningReviewId) : t("practitionerRecoveries.detail.context.notLinked")}
            mono={Boolean(item.sessionEarningReview?.sessionEarningReviewId)}
          />
          <DetailRow
            label={t("practitionerRecoveries.detail.context.settlement")}
            value={item.settlement?.settlementId ?? t("practitionerRecoveries.detail.context.notLinked")}
            mono={Boolean(item.settlement?.settlementId)}
          />
          <DetailRow
            label={t("practitionerRecoveries.detail.context.payout")}
            value={readOnlyValue(item.payoutId)}
            mono
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border border-border-light bg-surface-secondary px-4 py-4 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("practitionerRecoveries.detail.context.notes.internalReason")}
          </p>
          <p className="mt-2 text-sm leading-6 text-text-primary dark:text-white/90">
            {readOnlyValue(item.internalReason)}
          </p>
        </div>

        <div className="rounded-[24px] border border-border-light bg-surface-secondary px-4 py-4 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("practitionerRecoveries.detail.context.notes.practitionerFacing")}
          </p>
          <p className="mt-2 text-sm leading-6 text-text-primary dark:text-white/90">
            {readOnlyValue(item.practitionerFacingNote)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailRow
          label={t("practitionerRecoveries.detail.context.createdBy")}
          value={humanizeDisplayName(item.createdBy?.displayName, t("practitionerRecoveries.detail.fallbacks.teamAdmin"))}
        />
        <DetailRow
          label={t("practitionerRecoveries.detail.context.createdAt")}
          value={formatDateTime(locale, item.createdAt)}
        />
        <DetailRow
          label={t("practitionerRecoveries.detail.context.resolvedBy")}
          value={humanizeDisplayName(item.resolvedBy?.displayName, t("practitionerRecoveries.detail.fallbacks.teamAdmin"))}
        />
        <DetailRow
          label={t("practitionerRecoveries.detail.context.resolvedAt")}
          value={formatDateTime(locale, item.resolvedAt)}
        />
      </div>
    </AdminSectionCard>
  );
}

function RecoveryActionHistoryCard({
  item,
  locale,
  t,
}: {
  item: AdminPractitionerRecoveryDetailItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <AdminSectionCard
      title={t("practitionerRecoveries.detail.history.title")}
      description={t("practitionerRecoveries.detail.history.description")}
    >
      {item.actionHistory.length === 0 ? (
        <div className="rounded-[24px] border border-border-light bg-surface-tertiary/70 px-4 py-4 text-sm leading-6 text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
          {t("practitionerRecoveries.detail.history.empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {item.actionHistory.map((action) => (
            <div
              key={action.id}
              className="rounded-[24px] border border-border-light bg-surface-secondary px-4 py-4 dark:bg-white/[0.03]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <ActionBadge actionType={action.actionType} t={t} />
                  <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {formatSettlementMoney(locale, action.amount, item.currencyCode)}
                  </p>
                </div>
                <p className="text-xs text-text-muted">
                  {formatDateTime(locale, action.createdAt)}
                </p>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <DetailRow
                  label={t("practitionerRecoveries.detail.history.performedBy")}
                  value={humanizeDisplayName(action.performedBy?.displayName, t("practitionerRecoveries.detail.fallbacks.teamAdmin"))}
                />
                <DetailRow
                  label={t("practitionerRecoveries.detail.history.payout")}
                  value={readOnlyValue(action.payoutId)}
                  mono
                />
                <DetailRow
                  label={t("practitionerRecoveries.detail.history.reason")}
                  value={readOnlyValue(action.reason)}
                />
                <DetailRow
                  label={t("practitionerRecoveries.detail.history.actionId")}
                  value={shortId(action.id)}
                  mono
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminSectionCard>
  );
}

function RecoveryActionsCard({
  item,
  locale,
  t,
}: {
  item: AdminPractitionerRecoveryDetailItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const { data: permissionData, isLoading: permissionsLoading } = useCurrentUserPermissions(true);
  const canWrite = permissionData?.permissions?.includes(PermissionKey.ACCOUNTING_WRITE) ?? false;
  const stepUp = useAdminStepUp();
  const collectMutation = useMarkAdminPractitionerRecoveryCollected();
  const waiveMutation = useWaiveAdminPractitionerRecovery();

  const [collectAmount, setCollectAmount] = useState(item.remainingAmount);
  const [collectNote, setCollectNote] = useState("");
  const [collectKey, setCollectKey] = useState(() => createIdempotencyKey());
  const [waiveReason, setWaiveReason] = useState("");
  const [waiveNote, setWaiveNote] = useState("");
  const [waiveKey, setWaiveKey] = useState(() => createIdempotencyKey());
  const [feedback, setFeedback] = useState<{ tone: "success" | "warning" | "error"; message: string } | null>(null);

  const remainingAmount = Number(item.remainingAmount);
  const isResolved = item.status === "RECOVERED" || item.status === "WAIVED";
  const canCollect = canWrite && !isResolved && remainingAmount > 0;
  const canWaive = canWrite && !isResolved && remainingAmount > 0;

  useEffect(() => {
    setCollectAmount(item.remainingAmount);
    setCollectNote("");
    setCollectKey(createIdempotencyKey());
    setWaiveReason("");
    setWaiveNote("");
    setWaiveKey(createIdempotencyKey());
    setFeedback(null);
  }, [item]);

  const submitWithStepUp = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) {
        stepUp.requestStepUp(async () => {
          try {
            await action();
          } catch (retryCause) {
            const retryError = toAppError(retryCause);
            const errorKey = getAdminPractitionerRecoveryErrorKey(retryError);
            setFeedback({
              tone: "error",
              message: t(errorKey as Parameters<typeof t>[0]),
            });
          }
        });
        return;
      }

      const errorKey = getAdminPractitionerRecoveryErrorKey(appError);
      setFeedback({
        tone: "error",
        message: t(errorKey as Parameters<typeof t>[0]),
      });
    }
  };

  const handleCollect = async () => {
    if (!canCollect || collectMutation.isPending) {
      return;
    }

    const parsed = Number(collectAmount.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFeedback({
        tone: "error",
        message: t("practitionerRecoveries.detail.actions.validation.amountInvalid"),
      });
      return;
    }

    if (parsed > remainingAmount) {
      setFeedback({
        tone: "error",
        message: t("practitionerRecoveries.detail.actions.validation.amountExceedsRemaining"),
      });
      return;
    }

    setFeedback(null);

    await submitWithStepUp(async () => {
      const result = await collectMutation.mutateAsync({
        recoveryId: item.recoveryId,
        payload: {
          amountCollected: collectAmount.trim(),
          idempotencyKey: collectKey,
          note: collectNote.trim() || undefined,
        },
      });

      setFeedback({
        tone: result.wasAlreadyRecorded ? "warning" : "success",
        message: result.wasAlreadyRecorded
          ? t("practitionerRecoveries.detail.actions.feedback.collectAlreadyRecorded")
          : t("practitionerRecoveries.detail.actions.feedback.collectSuccess"),
      });
      setCollectKey(createIdempotencyKey());
      toast.success(
        result.wasAlreadyRecorded
          ? t("practitionerRecoveries.detail.actions.feedback.collectAlreadyRecorded")
          : t("practitionerRecoveries.detail.actions.feedback.collectSuccess"),
      );
    });
  };

  const handleWaive = async () => {
    if (!canWaive || waiveMutation.isPending) {
      return;
    }

    if (!waiveReason.trim()) {
      setFeedback({
        tone: "error",
        message: t("practitionerRecoveries.detail.actions.validation.reasonRequired"),
      });
      return;
    }

    setFeedback(null);

    await submitWithStepUp(async () => {
      const result = await waiveMutation.mutateAsync({
        recoveryId: item.recoveryId,
        payload: {
          reason: waiveReason.trim(),
          idempotencyKey: waiveKey,
          note: waiveNote.trim() || undefined,
        },
      });

      setFeedback({
        tone: result.wasAlreadyRecorded ? "warning" : "success",
        message: result.wasAlreadyRecorded
          ? t("practitionerRecoveries.detail.actions.feedback.waiveAlreadyRecorded")
          : t("practitionerRecoveries.detail.actions.feedback.waiveSuccess"),
      });
      setWaiveKey(createIdempotencyKey());
      toast.success(
        result.wasAlreadyRecorded
          ? t("practitionerRecoveries.detail.actions.feedback.waiveAlreadyRecorded")
          : t("practitionerRecoveries.detail.actions.feedback.waiveSuccess"),
      );
    });
  };

  if (permissionsLoading) {
    return (
      <AdminSectionCard
        title={t("practitionerRecoveries.detail.actions.title")}
        description={t("practitionerRecoveries.detail.actions.description")}
      >
        <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-4 text-sm leading-6 text-text-secondary">
          {t("practitionerRecoveries.detail.actions.loadingPermissions")}
        </div>
      </AdminSectionCard>
    );
  }

  if (!canWrite) {
    return (
      <AdminSectionCard
        title={t("practitionerRecoveries.detail.actions.title")}
        description={t("practitionerRecoveries.detail.actions.description")}
        actions={<AdminStatusBadge tone="muted">{t("practitionerRecoveries.detail.actions.readOnlyBadge")}</AdminStatusBadge>}
      >
        <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-4 text-sm leading-6 text-text-secondary">
          {t("practitionerRecoveries.detail.actions.viewOnly")}
        </div>
      </AdminSectionCard>
    );
  }

  return (
    <AdminSectionCard
      title={t("practitionerRecoveries.detail.actions.title")}
      description={t("practitionerRecoveries.detail.actions.description")}
      actions={<AdminStatusBadge tone="warning">{t("practitionerRecoveries.detail.actions.stepUpHint")}</AdminStatusBadge>}
    >
      <div className="space-y-4">
        {feedback ? <StatusMessage tone={feedback.tone} message={feedback.message} /> : null}

        {isResolved ? (
          <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-4 text-sm leading-6 text-text-secondary">
            {t("practitionerRecoveries.detail.actions.readOnly")}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[24px] border border-border-light bg-surface-secondary px-4 py-4 dark:bg-white/[0.03]">
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("practitionerRecoveries.detail.actions.collect.title")}
            </p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              {t("practitionerRecoveries.detail.actions.collect.description")}
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("practitionerRecoveries.detail.actions.collect.amount")}
                </span>
                <input
                  value={collectAmount}
                  onChange={(event) => setCollectAmount(event.target.value)}
                  inputMode="decimal"
                  className="app-control w-full py-3"
                  placeholder="0.00"
                  disabled={!canCollect || collectMutation.isPending}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("practitionerRecoveries.detail.actions.collect.note")}
                </span>
                <textarea
                  value={collectNote}
                  onChange={(event) => setCollectNote(event.target.value)}
                  className="app-control min-h-[104px] w-full py-3"
                  placeholder={t("practitionerRecoveries.detail.actions.collect.notePlaceholder")}
                  disabled={!canCollect || collectMutation.isPending}
                  maxLength={1000}
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={handleCollect}
                  disabled={!canCollect || collectMutation.isPending}
                  startIcon={collectMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BadgeDollarSign className="h-4 w-4" />}
                >
                  {collectMutation.isPending
                    ? t("practitionerRecoveries.detail.actions.collect.submitting")
                    : t("practitionerRecoveries.detail.actions.collect.submit")}
                </Button>
                <span className="text-xs text-text-secondary">
                  {t("practitionerRecoveries.detail.actions.collect.hint", {
                    amount: formatSettlementMoney(locale, item.remainingAmount, item.currencyCode),
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-border-light bg-surface-secondary px-4 py-4 dark:bg-white/[0.03]">
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("practitionerRecoveries.detail.actions.waive.title")}
            </p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              {t("practitionerRecoveries.detail.actions.waive.description")}
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("practitionerRecoveries.detail.actions.waive.reason")}
                </span>
                <textarea
                  value={waiveReason}
                  onChange={(event) => setWaiveReason(event.target.value)}
                  className="app-control min-h-[104px] w-full py-3"
                  placeholder={t("practitionerRecoveries.detail.actions.waive.reasonPlaceholder")}
                  disabled={!canWaive || waiveMutation.isPending}
                  maxLength={1000}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("practitionerRecoveries.detail.actions.waive.note")}
                </span>
                <textarea
                  value={waiveNote}
                  onChange={(event) => setWaiveNote(event.target.value)}
                  className="app-control min-h-[104px] w-full py-3"
                  placeholder={t("practitionerRecoveries.detail.actions.waive.notePlaceholder")}
                  disabled={!canWaive || waiveMutation.isPending}
                  maxLength={1000}
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleWaive}
                  disabled={!canWaive || waiveMutation.isPending}
                  startIcon={waiveMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                >
                  {waiveMutation.isPending
                    ? t("practitionerRecoveries.detail.actions.waive.submitting")
                    : t("practitionerRecoveries.detail.actions.waive.submit")}
                </Button>
                <span className="text-xs text-text-secondary">
                  {t("practitionerRecoveries.detail.actions.waive.hint")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminSectionCard>
  );
}

export default function AdminPractitionerRecoveryDetailScreen({ id }: Props) {
  const t = useTranslations("admin-finance-operations");
  const locale = useLocale();
  const recoveryQuery = useAdminPractitionerRecovery(id);

  if (recoveryQuery.isLoading) {
    return <ListStateSkeleton items={4} heightClass="h-28" />;
  }

  if (recoveryQuery.isError || !recoveryQuery.data) {
    const errorKey = getAdminPractitionerRecoveryErrorKey(recoveryQuery.error);
    return (
      <StateCard
        icon={<AlertCircle className="h-5 w-5 text-primary" />}
        title={t("practitionerRecoveries.detail.states.errorTitle")}
        note={t(errorKey as Parameters<typeof t>[0])}
        action={{
          label: t("practitionerRecoveries.detail.states.back"),
          href: (
            <Link
              href="/admin/finance/practitioner-recoveries"
              className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-5 py-2 text-sm text-text-secondary shadow-theme-xs transition hover:border-primary/30 hover:bg-primary-light hover:text-primary dark:bg-surface-tertiary dark:hover:bg-surface-tertiary/80"
            >
              {t("practitionerRecoveries.detail.states.back")}
            </Link>
          ),
        }}
      />
    );
  }

  const item = recoveryQuery.data.item;
  const statusTone = getStatusTone(item.status);
  const reviewStatusKey = getReviewStatusKey(item.sessionEarningReview?.reviewStatus ?? null);

  return (
    <div className="space-y-5">
      <SurfaceCard variant="page">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <Link
              href="/admin/finance/practitioner-recoveries"
              className="inline-flex items-center gap-2 rounded-full border border-border-light bg-surface-secondary px-3 py-1.5 text-xs font-semibold text-text-primary transition hover:border-primary/30 hover:bg-surface-tertiary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("practitionerRecoveries.detail.back")}
            </Link>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("practitionerRecoveries.detail.eyebrow")}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
                {t("practitionerRecoveries.detail.title")}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-text-secondary sm:text-base">
                {t("practitionerRecoveries.detail.note")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AdminStatusBadge tone={statusTone === "muted" ? "muted" : statusTone}>
              {t(getAdminPractitionerRecoveryStatusKey(item.status) as Parameters<typeof t>[0])}
            </AdminStatusBadge>
            <AdminStatusBadge tone="muted">
              {readOnlyValue(item.currencyCode)}
            </AdminStatusBadge>
            <AdminStatusBadge tone={item.remainingAmount === "0.00" ? "success" : "warning"}>
              {t("practitionerRecoveries.detail.summary.remaining")}: {formatSettlementMoney(locale, item.remainingAmount, item.currencyCode)}
            </AdminStatusBadge>
          </div>
        </div>
      </SurfaceCard>

      {item.status === "RECOVERED" || item.status === "WAIVED" ? (
        <StatusMessage
          tone="warning"
          message={t("practitionerRecoveries.detail.actions.readOnly")}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          title={t("practitionerRecoveries.detail.summary.amount")}
          value={formatSettlementMoney(locale, item.amount, item.currencyCode)}
        />
        <SummaryTile
          title={t("practitionerRecoveries.detail.summary.recovered")}
          value={formatSettlementMoney(locale, item.recoveredAmount, item.currencyCode)}
        />
        <SummaryTile
          title={t("practitionerRecoveries.detail.summary.remaining")}
          value={formatSettlementMoney(locale, item.remainingAmount, item.currencyCode)}
        />
        <SummaryTile
          title={t("practitionerRecoveries.detail.summary.reasonCode")}
          value={t(getAdminPractitionerRecoveryReasonCodeKey(item.reasonCode) as Parameters<typeof t>[0])}
          hint={t("practitionerRecoveries.detail.summary.statusHint", {
            status: t(getAdminPractitionerRecoveryStatusKey(item.status) as Parameters<typeof t>[0]),
          })}
        />
      </div>

      {item.sessionEarningReview ? (
        <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("practitionerRecoveries.detail.review.title")}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-text-primary dark:text-white/95">
                {t("practitionerRecoveries.detail.review.title")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                {t("practitionerRecoveries.detail.review.description")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AdminStatusBadge tone="muted">
                {t(`practitionerRecoveries.reviewSourceTypes.${item.sessionEarningReview.sourceType === "DIRECT_SESSION" ? "directSession" : "packageSession"}` as Parameters<typeof t>[0])}
              </AdminStatusBadge>
              {reviewStatusKey ? (
                <AdminStatusBadge tone={item.sessionEarningReview.reviewStatus === "APPROVED" ? "success" : item.sessionEarningReview.reviewStatus === "REJECTED" ? "danger" : item.sessionEarningReview.reviewStatus === "EXCLUDED_FROM_PAYOUT" ? "warning" : "warning"}>
                  {t(reviewStatusKey as Parameters<typeof t>[0])}
                </AdminStatusBadge>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DetailRow
              label={t("practitionerRecoveries.detail.review.reviewId")}
              value={shortId(item.sessionEarningReview.sessionEarningReviewId)}
              mono
            />
            <DetailRow
              label={t("practitionerRecoveries.detail.review.decision")}
              value={t(`practitionerRecoveries.reviewDecisions.${item.sessionEarningReview.reviewDecision === "AUTO_CREATED" ? "autoCreated" : item.sessionEarningReview.reviewDecision === "APPROVED_AS_IS" ? "approveAsIs" : item.sessionEarningReview.reviewDecision === "EDITED_AND_APPROVED" ? "editAndApprove" : item.sessionEarningReview.reviewDecision === "REJECTED_PAYOUT" ? "rejectPayout" : "excludeFromPayout"}` as Parameters<typeof t>[0])}
            />
            <DetailRow
              label={t("practitionerRecoveries.detail.review.status")}
              value={reviewStatusKey ? t(reviewStatusKey as Parameters<typeof t>[0]) : "-"}
            />
          </div>
        </SurfaceCard>
      ) : null}

      <RecoveryContextCard item={item} locale={locale} t={t} />

      <RecoveryActionHistoryCard item={item} locale={locale} t={t} />

      <RecoveryActionsCard item={item} locale={locale} t={t} />
    </div>
  );
}
