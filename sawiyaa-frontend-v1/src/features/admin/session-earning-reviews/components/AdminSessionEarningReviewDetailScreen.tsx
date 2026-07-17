"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  AlertCircle,
  ArrowLeft,
  RefreshCw,
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
import {
  getAdminSessionEarningReviewDecisionKey,
  getAdminSessionEarningReviewSourceTypeKey,
  getAdminSessionEarningReviewStatusKey,
  getAdminSessionEarningReviewErrorKey,
} from "../lib/admin-session-earning-reviews";
import {
  useAdminSessionEarningReview,
  useModerateAdminSessionEarningReview,
} from "../hooks/use-admin-session-earning-reviews";
import type {
  AdminSessionEarningReviewDetailItem,
  SessionEarningReviewModerationAction,
} from "../types/admin-session-earning-reviews.types";

type Props = {
  reviewId: string;
};

const MODERATION_ACTION_OPTIONS: Array<{
  value: SessionEarningReviewModerationAction;
  tone: "primary" | "success" | "warning" | "danger";
  labelKey: string;
  descriptionKey: string;
}> = [
  {
    value: "APPROVE_AS_IS",
    tone: "success",
    labelKey: "sessionEarningReviews.detail.moderation.actions.approveAsIs",
    descriptionKey: "sessionEarningReviews.detail.moderation.actionDescriptions.approveAsIs",
  },
  {
    value: "EDIT_AND_APPROVE",
    tone: "primary",
    labelKey: "sessionEarningReviews.detail.moderation.actions.editAndApprove",
    descriptionKey: "sessionEarningReviews.detail.moderation.actionDescriptions.editAndApprove",
  },
  {
    value: "REJECT_PAYOUT",
    tone: "danger",
    labelKey: "sessionEarningReviews.detail.moderation.actions.rejectPayout",
    descriptionKey: "sessionEarningReviews.detail.moderation.actionDescriptions.rejectPayout",
  },
  {
    value: "EXCLUDE_FROM_PAYOUT",
    tone: "warning",
    labelKey: "sessionEarningReviews.detail.moderation.actions.excludeFromPayout",
    descriptionKey: "sessionEarningReviews.detail.moderation.actionDescriptions.excludeFromPayout",
  },
];

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

function shortId(value: string) {
  return value.length <= 18 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function humanizeDisplayName(primary: string | null, fallback: string | null) {
  const primaryValue = primary?.trim();
  if (primaryValue) {
    return primaryValue;
  }

  const fallbackValue = fallback?.trim();
  if (!fallbackValue) {
    return "-";
  }

  return fallbackValue.length > 22 ? shortId(fallbackValue) : fallbackValue;
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

function badgeToneClass(tone: "primary" | "success" | "warning" | "danger") {
  switch (tone) {
    case "success":
      return "bg-success-50 text-success-700 dark:bg-success-500/12 dark:text-success-300";
    case "warning":
      return "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300";
    case "danger":
      return "bg-error-50 text-error-700 dark:bg-error-500/12 dark:text-error-300";
    default:
      return "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light";
  }
}

function getLedgerEntryTypeKey(value: string) {
  if (value === "PRACTITIONER_EARNING") return "ledgerEntryTypes.practitionerEarning";
  if (value === "PLATFORM_COMMISSION") return "ledgerEntryTypes.platformCommission";
  return "ledgerEntryTypes.other";
}

function getLedgerDirectionKey(value: string) {
  if (value === "CREDIT") return "ledgerDirections.credit";
  if (value === "DEBIT") return "ledgerDirections.debit";
  return "ledgerDirections.other";
}

function getWalletBalanceBucketKey(value: string) {
  if (value === "AVAILABLE") return "walletBalanceBuckets.available";
  if (value === "HELD") return "walletBalanceBuckets.held";
  return "walletBalanceBuckets.other";
}

function ActionBadge({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "success" | "warning" | "danger";
}) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeToneClass(tone)}`}>
      {label}
    </span>
  );
}

function getSourceTypeTone(sourceType: AdminSessionEarningReviewDetailItem["sourceType"]) {
  return sourceType === "DIRECT_SESSION" ? "primary" : "warning";
}

function getStatusTone(status: AdminSessionEarningReviewDetailItem["reviewStatus"]) {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "danger";
  if (status === "EXCLUDED_FROM_PAYOUT") return "warning";
  return "warning";
}

function getDecisionTone(decision: AdminSessionEarningReviewDetailItem["reviewDecision"]) {
  if (decision === "APPROVED_AS_IS") return "success";
  if (decision === "EDITED_AND_APPROVED") return "primary";
  if (decision === "REJECTED_PAYOUT") return "danger";
  if (decision === "EXCLUDED_FROM_PAYOUT") return "warning";
  return "primary";
}

function getAvailableActions(item: AdminSessionEarningReviewDetailItem) {
  return MODERATION_ACTION_OPTIONS.filter((action) => {
    if (action.value === "APPROVE_AS_IS") return item.canApprove;
    if (action.value === "EDIT_AND_APPROVE") return item.canAdjust;
    return item.canReject;
  });
}

function getDefaultAction(item: AdminSessionEarningReviewDetailItem): SessionEarningReviewModerationAction {
  if (item.canApprove) return "APPROVE_AS_IS";
  if (item.canAdjust) return "EDIT_AND_APPROVE";
  if (item.canReject) return "REJECT_PAYOUT";
  return "APPROVE_AS_IS";
}

function readOnlyValue(value: string | null | undefined) {
  return value?.trim() || "-";
}

function ReviewOverviewCard({
  item,
  locale,
  t,
}: {
  item: AdminSessionEarningReviewDetailItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <AdminSectionCard
      eyebrow={t("sessionEarningReviews.detail.overview.eyebrow")}
      title={t("sessionEarningReviews.detail.overview.title")}
      description={t("sessionEarningReviews.detail.overview.description")}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("sessionEarningReviews.detail.overview.reviewId")}
          </p>
          <p className="mt-1 break-all font-mono text-xs text-text-primary dark:text-white/90">
            {item.reviewId}
          </p>
        </div>
        <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("sessionEarningReviews.detail.overview.sourceType")}
          </p>
          <div className="mt-1">
            <ActionBadge
              tone={getSourceTypeTone(item.sourceType)}
              label={t(
                `sessionEarningReviews.sourceTypes.${getAdminSessionEarningReviewSourceTypeKey(item.sourceType).split(".")[1]}` as Parameters<typeof t>[0],
              )}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("sessionEarningReviews.detail.overview.status")}
          </p>
          <div className="mt-1">
            <ActionBadge
              tone={getStatusTone(item.reviewStatus)}
              label={t(
                `sessionEarningReviews.statuses.${getAdminSessionEarningReviewStatusKey(item.reviewStatus).split(".")[1]}` as Parameters<typeof t>[0],
              )}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("sessionEarningReviews.detail.overview.decision")}
          </p>
          <div className="mt-1">
            <ActionBadge
              tone={getDecisionTone(item.reviewDecision)}
              label={t(
                `sessionEarningReviews.decisions.${getAdminSessionEarningReviewDecisionKey(item.reviewDecision).split(".")[1]}` as Parameters<typeof t>[0],
              )}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {item.isActionRequired ? (
          <AdminStatusBadge tone="warning">{t("sessionEarningReviews.detail.overview.actionRequired")}</AdminStatusBadge>
        ) : (
          <AdminStatusBadge tone="muted">{t("sessionEarningReviews.detail.overview.noActionRequired")}</AdminStatusBadge>
        )}
        {item.isFinalized ? (
          <AdminStatusBadge tone="success">{t("sessionEarningReviews.detail.overview.finalized")}</AdminStatusBadge>
        ) : (
          <AdminStatusBadge tone="muted">{t("sessionEarningReviews.detail.overview.pending")}</AdminStatusBadge>
        )}
        <AdminStatusBadge tone="muted">
          {t("sessionEarningReviews.detail.overview.reviewedAt")}: {formatDateTime(locale, item.reviewedAt)}
        </AdminStatusBadge>
        <AdminStatusBadge tone="muted">
          {t("sessionEarningReviews.detail.overview.approvedAt")}: {formatDateTime(locale, item.approvedAt)}
        </AdminStatusBadge>
      </div>
    </AdminSectionCard>
  );
}

function SessionAndPeopleCard({
  item,
  locale,
  t,
}: {
  item: AdminSessionEarningReviewDetailItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <AdminSectionCard title={t("sessionEarningReviews.detail.session.title")} description={t("sessionEarningReviews.detail.session.description")}>
      <div className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("sessionEarningReviews.detail.session.code")}
          </p>
          <p className="mt-1 font-mono text-xs text-text-primary dark:text-white/90">{item.session.sessionCode}</p>
        </div>

        <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("sessionEarningReviews.detail.session.status")}
          </p>
          <p className="mt-1 text-sm text-text-primary dark:text-white/90">
            {t(`sessionStatuses.${item.session.status}` as Parameters<typeof t>[0])}
          </p>
        </div>

        <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("sessionEarningReviews.detail.session.paymentCoverage")}
          </p>
          <p className="mt-1 text-sm text-text-primary dark:text-white/90">
            {t(`sessionPaymentCoverage.${item.session.paymentCoverageType}` as Parameters<typeof t>[0])}
          </p>
        </div>

        <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("sessionEarningReviews.detail.session.schedule")}
          </p>
          <p className="mt-1 text-sm leading-6 text-text-primary dark:text-white/90">
            {item.session.scheduledStartAt ? formatDateTime(locale, item.session.scheduledStartAt) : "-"}
            {item.session.scheduledEndAt ? ` â€¢ ${formatDateTime(locale, item.session.scheduledEndAt)}` : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("sessionEarningReviews.detail.session.completedAt")}
          </p>
          <p className="mt-1 text-sm text-text-primary dark:text-white/90">
            {formatDateTime(locale, item.session.completedAt)}
          </p>
        </div>

        <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("sessionEarningReviews.detail.session.packagePurchaseId")}
          </p>
          <p className="mt-1 font-mono text-xs text-text-primary dark:text-white/90">
            {readOnlyValue(item.session.packagePurchaseId)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("sessionEarningReviews.detail.people.practitioner")}
          </p>
          <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
            {humanizeDisplayName(item.practitioner.displayName, item.practitioner.publicSlug ?? item.practitioner.practitionerId)}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {readOnlyValue(item.practitioner.professionalTitle ?? item.practitioner.publicSlug)}
          </p>
        </div>

        <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/[0.03]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("sessionEarningReviews.detail.people.patient")}
          </p>
          <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
            {humanizeDisplayName(item.patient.displayName, item.patient.patientId)}
          </p>
        </div>
      </div>
    </AdminSectionCard>
  );
}

function PaymentCard({
  item,
  locale,
  t,
}: {
  item: AdminSessionEarningReviewDetailItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const payment = item.payment;

  return (
    <AdminSectionCard title={t("sessionEarningReviews.detail.payment.title")} description={t("sessionEarningReviews.detail.payment.description")}>
      {!payment ? (
        <p className="text-sm text-text-secondary">{t("sessionEarningReviews.detail.payment.none")}</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DetailRow label={t("sessionEarningReviews.detail.payment.id")} value={readOnlyValue(payment.paymentId)} mono />
            <DetailRow
              label={t("sessionEarningReviews.detail.payment.status")}
              value={payment.status ? t(`paymentStatuses.${payment.status}` as Parameters<typeof t>[0]) : "-"}
            />
            <DetailRow label={t("sessionEarningReviews.detail.payment.amount")} value={formatSettlementMoney(locale, payment.amountTotal, payment.currencyCode)} />
            <DetailRow label={t("sessionEarningReviews.detail.payment.currency")} value={readOnlyValue(payment.currencyCode)} />
            <DetailRow
              label={t("sessionEarningReviews.detail.payment.provider")}
              value={payment.provider ? t(`providers.${payment.provider}` as Parameters<typeof t>[0]) : "-"}
            />
            <DetailRow
              label={t("sessionEarningReviews.detail.payment.purpose")}
              value={payment.paymentPurpose ? t(`paymentPurposes.${payment.paymentPurpose}` as Parameters<typeof t>[0]) : "-"}
            />
            <DetailRow label={t("sessionEarningReviews.detail.payment.providerPaymentRef")} value={readOnlyValue(payment.providerPaymentRef)} mono />
            <DetailRow label={t("sessionEarningReviews.detail.payment.providerOrderRef")} value={readOnlyValue(payment.providerOrderRef)} mono />
            <DetailRow label={t("sessionEarningReviews.detail.payment.remainingEffectiveAmount")} value={formatSettlementMoney(locale, payment.remainingEffectiveAmount, payment.currencyCode)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailRow label={t("sessionEarningReviews.detail.payment.initiatedAt")} value={formatDateTime(locale, payment.initiatedAt)} />
            <DetailRow label={t("sessionEarningReviews.detail.payment.capturedAt")} value={formatDateTime(locale, payment.capturedAt)} />
            <DetailRow label={t("sessionEarningReviews.detail.payment.failedAt")} value={formatDateTime(locale, payment.failedAt)} />
            <DetailRow label={t("sessionEarningReviews.detail.payment.expiredAt")} value={formatDateTime(locale, payment.expiredAt)} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">{t("sessionEarningReviews.detail.payment.refunds.title")}</h3>
              <span className="text-xs text-text-muted">
                {payment.refunds.length > 0 ? t("sessionEarningReviews.detail.payment.refunds.count", { count: payment.refunds.length }) : t("sessionEarningReviews.detail.payment.refunds.empty")}
              </span>
            </div>
            {payment.refunds.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {payment.refunds.map((refund) => (
                  <div key={refund.id} className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/[0.03]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-xs text-text-secondary">{refund.id}</p>
                      <AdminStatusBadge tone="muted">
                        {t(`refundStatuses.${refund.status}` as Parameters<typeof t>[0])}
                      </AdminStatusBadge>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/90">
                      {formatSettlementMoney(locale, refund.amount, refund.currencyCode)}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">{formatDateTime(locale, refund.requestedAt)}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </AdminSectionCard>
  );
}

function LedgerCard({
  item,
  locale,
  t,
}: {
  item: AdminSessionEarningReviewDetailItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <AdminSectionCard title={t("sessionEarningReviews.detail.ledger.title")} description={t("sessionEarningReviews.detail.ledger.description")}>
      {item.ledgerEntries.length === 0 ? (
        <p className="text-sm text-text-secondary">{t("sessionEarningReviews.detail.ledger.empty")}</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-light">
          <div className="grid grid-cols-1 gap-2 border-b border-border-light bg-surface-tertiary px-4 py-3 text-xs font-semibold text-text-muted md:grid-cols-5 md:gap-0">
            <div>{t("sessionEarningReviews.detail.ledger.columns.type")}</div>
            <div>{t("sessionEarningReviews.detail.ledger.columns.direction")}</div>
            <div>{t("sessionEarningReviews.detail.ledger.columns.amount")}</div>
            <div>{t("sessionEarningReviews.detail.ledger.columns.bucket")}</div>
            <div>{t("sessionEarningReviews.detail.ledger.columns.createdAt")}</div>
          </div>
          <div className="divide-y divide-border-light">
            {item.ledgerEntries.map((entry) => (
              <div key={entry.id} className="grid grid-cols-1 gap-2 px-4 py-3 text-sm md:grid-cols-5 md:gap-0">
                <div className="text-text-primary dark:text-white/90">
                  {t(getLedgerEntryTypeKey(entry.entryType) as Parameters<typeof t>[0])}
                </div>
                <div className="text-text-secondary">
                  {t(getLedgerDirectionKey(entry.direction) as Parameters<typeof t>[0])}
                </div>
                <div className="font-medium text-text-primary dark:text-white/90">
                  {formatSettlementMoney(locale, entry.amount, entry.currencyCode)}
                </div>
                <div className="text-text-secondary">
                  {t(getWalletBalanceBucketKey(entry.balanceBucket) as Parameters<typeof t>[0])}
                </div>
                <div className="text-text-secondary">{formatDateTime(locale, entry.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminSectionCard>
  );
}

function PackageCard({
  item,
  locale,
  t,
}: {
  item: AdminSessionEarningReviewDetailItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!item.packagePurchase && !item.packageSettlement) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {item.packagePurchase ? (
        <AdminSectionCard title={t("sessionEarningReviews.detail.packagePurchase.title")} description={t("sessionEarningReviews.detail.packagePurchase.description")}>
          <div className="grid gap-3 md:grid-cols-2">
            <DetailRow label={t("sessionEarningReviews.detail.packagePurchase.id")} value={readOnlyValue(item.packagePurchase.packagePurchaseId)} mono />
            <DetailRow
              label={t("sessionEarningReviews.detail.packagePurchase.status")}
              value={item.packagePurchase.status ? t(`packagePurchaseStatuses.${item.packagePurchase.status}` as Parameters<typeof t>[0]) : "-"}
            />
            <DetailRow label={t("sessionEarningReviews.detail.packagePurchase.currency")} value={readOnlyValue(item.packagePurchase.selectedCurrencyCode)} />
            <DetailRow label={t("sessionEarningReviews.detail.packagePurchase.sessions")} value={readOnlyValue(item.packagePurchase.sessionCountSnapshot?.toString())} />
            <DetailRow label={t("sessionEarningReviews.detail.packagePurchase.payableTotal")} value={formatSettlementMoney(locale, item.packagePurchase.patientPayableTotalSnapshot, item.packagePurchase.selectedCurrencyCode)} />
            <DetailRow label={t("sessionEarningReviews.detail.packagePurchase.practitionerShare")} value={formatSettlementMoney(locale, item.packagePurchase.practitionerFinalShareSnapshot, item.packagePurchase.selectedCurrencyCode)} />
            <DetailRow label={t("sessionEarningReviews.detail.packagePurchase.platformShare")} value={formatSettlementMoney(locale, item.packagePurchase.platformFinalShareSnapshot, item.packagePurchase.selectedCurrencyCode)} />
            <DetailRow label={t("sessionEarningReviews.detail.packagePurchase.paymentId")} value={readOnlyValue(item.packagePurchase.paymentId)} mono />
          </div>
        </AdminSectionCard>
      ) : null}

      {item.packageSettlement ? (
        <AdminSectionCard title={t("sessionEarningReviews.detail.packageSettlement.title")} description={t("sessionEarningReviews.detail.packageSettlement.description")}>
          <div className="grid gap-3 md:grid-cols-2">
            <DetailRow label={t("sessionEarningReviews.detail.packageSettlement.id")} value={readOnlyValue(item.packageSettlement.packageSettlementId)} mono />
            <DetailRow
              label={t("sessionEarningReviews.detail.packageSettlement.status")}
              value={item.packageSettlement.status ? t(`packageSettlementStatuses.${item.packageSettlement.status}` as Parameters<typeof t>[0]) : "-"}
            />
            <DetailRow label={t("sessionEarningReviews.detail.packageSettlement.currency")} value={readOnlyValue(item.packageSettlement.currencyCode)} />
            <DetailRow label={t("sessionEarningReviews.detail.packageSettlement.sessions")} value={readOnlyValue(item.packageSettlement.sessionCount?.toString())} />
            <DetailRow label={t("sessionEarningReviews.detail.packageSettlement.completedSessions")} value={readOnlyValue(item.packageSettlement.completedSessionsCount?.toString())} />
            <DetailRow label={t("sessionEarningReviews.detail.packageSettlement.heldPractitionerAmount")} value={formatSettlementMoney(locale, item.packageSettlement.heldPractitionerAmount, item.packageSettlement.currencyCode)} />
            <DetailRow label={t("sessionEarningReviews.detail.packageSettlement.releasablePractitionerAmount")} value={formatSettlementMoney(locale, item.packageSettlement.releasablePractitionerAmount, item.packageSettlement.currencyCode)} />
            <DetailRow label={t("sessionEarningReviews.detail.packageSettlement.releasedPractitionerAmount")} value={formatSettlementMoney(locale, item.packageSettlement.releasedPractitionerAmount, item.packageSettlement.currencyCode)} />
          </div>
        </AdminSectionCard>
      ) : null}
    </div>
  );
}

function ModerationCard({
  item,
  locale,
  t,
}: {
  item: AdminSessionEarningReviewDetailItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const { data: permissionData, isLoading: permissionsLoading } = useCurrentUserPermissions(true);
  const canWrite = permissionData?.permissions?.includes(PermissionKey.ACCOUNTING_WRITE) ?? false;
  const stepUp = useAdminStepUp();
  const mutation = useModerateAdminSessionEarningReview();
  const availableActions = useMemo(() => getAvailableActions(item), [item]);

  const [selectedAction, setSelectedAction] = useState<SessionEarningReviewModerationAction>(
    () => getDefaultAction(item),
  );
  const [finalPractitionerAmount, setFinalPractitionerAmount] = useState(item.finalPractitionerAmount ?? item.suggestedPractitionerAmount);
  const [finalPlatformAmount, setFinalPlatformAmount] = useState(item.finalPlatformAmount ?? item.suggestedPlatformAmount);
  const [finalCurrencyCode, setFinalCurrencyCode] = useState(item.finalCurrencyCode ?? item.suggestedCurrencyCode);
  const [internalReason, setInternalReason] = useState(item.internalReason ?? "");
  const [practitionerFacingNote, setPractitionerFacingNote] = useState(item.practitionerFacingNote ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedAction(getDefaultAction(item));
    setFinalPractitionerAmount(item.finalPractitionerAmount ?? item.suggestedPractitionerAmount);
    setFinalPlatformAmount(item.finalPlatformAmount ?? item.suggestedPlatformAmount);
    setFinalCurrencyCode(item.finalCurrencyCode ?? item.suggestedCurrencyCode);
    setInternalReason(item.internalReason ?? "");
    setPractitionerFacingNote(item.practitionerFacingNote ?? "");
    setLocalError(null);
  }, [item]);

  const submitModeration = async () => {
    if (!canWrite || mutation.isPending || item.reviewStatus !== "PENDING_REVIEW") return;

    if (selectedAction === "EDIT_AND_APPROVE") {
      const hasAmounts =
        finalPractitionerAmount.trim().length > 0 &&
        finalPlatformAmount.trim().length > 0 &&
        finalCurrencyCode.trim().length > 0;
      if (!hasAmounts) {
        setLocalError(t("sessionEarningReviews.detail.moderation.validation.finalAmounts"));
        return;
      }
    }

    if ((selectedAction === "REJECT_PAYOUT" || selectedAction === "EXCLUDE_FROM_PAYOUT") && !internalReason.trim()) {
      setLocalError(t("sessionEarningReviews.detail.moderation.validation.reasonRequired"));
      return;
    }

    const payload = {
      action: selectedAction,
      finalPractitionerAmount:
        selectedAction === "EDIT_AND_APPROVE" ? finalPractitionerAmount.trim() : undefined,
      finalPlatformAmount:
        selectedAction === "EDIT_AND_APPROVE" ? finalPlatformAmount.trim() : undefined,
      finalCurrencyCode:
        selectedAction === "EDIT_AND_APPROVE" ? finalCurrencyCode.trim().toUpperCase() : undefined,
      internalReason: internalReason.trim() || undefined,
      practitionerFacingNote: practitionerFacingNote.trim() || undefined,
    };

    setLocalError(null);

    const runMutation = async () => {
      await mutation.mutateAsync({ reviewId: item.reviewId, payload });
      toast.success(t("sessionEarningReviews.detail.moderation.feedback.success"));
    };

    try {
      await runMutation();
    } catch (cause) {
      const appError = toAppError(cause);
      if (isStepUpRequiredError(appError)) {
        stepUp.requestStepUp(async () => {
          try {
            await runMutation();
          } catch (retryCause) {
            const retryError = toAppError(retryCause);
            setLocalError(retryError.message || t("sessionEarningReviews.detail.moderation.feedback.error"));
          }
        });
        return;
      }

      setLocalError(appError.message || t("sessionEarningReviews.detail.moderation.feedback.error"));
    }
  };

  if (item.reviewStatus !== "PENDING_REVIEW") {
    return (
      <AdminSectionCard title={t("sessionEarningReviews.detail.moderation.title")} description={t("sessionEarningReviews.detail.moderation.description")}>
        <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-4 text-sm leading-6 text-text-secondary">
          {t("sessionEarningReviews.detail.moderation.readOnly")}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <DetailRow
            label={t("sessionEarningReviews.detail.moderation.reviewedBy")}
            value={item.reviewedBy?.displayName ?? t("sessionEarningReviews.detail.fallbacks.teamAdmin")}
          />
          <DetailRow label={t("sessionEarningReviews.detail.moderation.reviewedAt")} value={formatDateTime(locale, item.reviewedAt)} />
          <DetailRow
            label={t("sessionEarningReviews.detail.moderation.approvedBy")}
            value={item.approvedBy?.displayName ?? item.reviewedBy?.displayName ?? t("sessionEarningReviews.detail.fallbacks.teamAdmin")}
          />
          <DetailRow label={t("sessionEarningReviews.detail.moderation.approvedAt")} value={formatDateTime(locale, item.approvedAt)} />
          <DetailRow label={t("sessionEarningReviews.detail.moderation.internalReason")} value={readOnlyValue(item.internalReason)} />
          <DetailRow label={t("sessionEarningReviews.detail.moderation.practitionerFacingNote")} value={readOnlyValue(item.practitionerFacingNote)} />
        </div>
      </AdminSectionCard>
    );
  }

  if (permissionsLoading) {
    return (
      <AdminSectionCard title={t("sessionEarningReviews.detail.moderation.title")} description={t("sessionEarningReviews.detail.moderation.description")}>
        <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-4 text-sm leading-6 text-text-secondary">
          {t("sessionEarningReviews.detail.moderation.loadingPermissions")}
        </div>
      </AdminSectionCard>
    );
  }

  if (!canWrite) {
    return (
      <AdminSectionCard
        title={t("sessionEarningReviews.detail.moderation.title")}
        description={t("sessionEarningReviews.detail.moderation.description")}
        actions={<AdminStatusBadge tone="muted">{t("sessionEarningReviews.detail.moderation.readOnlyBadge")}</AdminStatusBadge>}
      >
        <div className="rounded-2xl border border-border-light bg-surface-tertiary px-4 py-4 text-sm leading-6 text-text-secondary">
          {t("sessionEarningReviews.detail.moderation.viewOnly")}
        </div>
      </AdminSectionCard>
    );
  }

  return (
    <AdminSectionCard
      title={t("sessionEarningReviews.detail.moderation.title")}
      description={t("sessionEarningReviews.detail.moderation.description")}
      actions={
        <AdminStatusBadge tone="warning">{t("sessionEarningReviews.detail.moderation.stepUpHint")}</AdminStatusBadge>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 xl:grid-cols-2">
          {availableActions.map((action) => (
            <button
              key={action.value}
              type="button"
              onClick={() => setSelectedAction(action.value)}
              className={`rounded-2xl border px-4 py-4 text-start transition ${
                selectedAction === action.value
                  ? "border-primary bg-primary-light/30"
                  : "border-border-light bg-surface-secondary hover:border-primary/25 hover:bg-surface-tertiary"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t(action.labelKey as Parameters<typeof t>[0])}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">
                    {t(action.descriptionKey as Parameters<typeof t>[0])}
                  </p>
                </div>
                <ActionBadge
                  tone={action.tone}
                  label={t(action.labelKey as Parameters<typeof t>[0])}
                />
              </div>
            </button>
          ))}
        </div>

        {selectedAction === "EDIT_AND_APPROVE" ? (
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("sessionEarningReviews.detail.moderation.finalPractitionerAmount")}
              </span>
              <input
                value={finalPractitionerAmount}
                onChange={(event) => setFinalPractitionerAmount(event.target.value)}
                inputMode="decimal"
                className="app-control w-full py-3"
                placeholder="0.00"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("sessionEarningReviews.detail.moderation.finalPlatformAmount")}
              </span>
              <input
                value={finalPlatformAmount}
                onChange={(event) => setFinalPlatformAmount(event.target.value)}
                inputMode="decimal"
                className="app-control w-full py-3"
                placeholder="0.00"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("sessionEarningReviews.detail.moderation.finalCurrencyCode")}
              </span>
              <input
                value={finalCurrencyCode}
                onChange={(event) => setFinalCurrencyCode(event.target.value.toUpperCase())}
                className="app-control w-full py-3 uppercase"
                maxLength={3}
                placeholder="EGP"
              />
            </label>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("sessionEarningReviews.detail.moderation.internalReason")}
            </span>
            <textarea
              value={internalReason}
              onChange={(event) => setInternalReason(event.target.value)}
              className="app-control min-h-[110px] w-full py-3"
              placeholder={t("sessionEarningReviews.detail.moderation.internalReasonPlaceholder")}
              maxLength={1000}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("sessionEarningReviews.detail.moderation.practitionerFacingNote")}
            </span>
            <textarea
              value={practitionerFacingNote}
              onChange={(event) => setPractitionerFacingNote(event.target.value)}
              className="app-control min-h-[110px] w-full py-3"
              placeholder={t("sessionEarningReviews.detail.moderation.practitionerFacingNotePlaceholder")}
              maxLength={1000}
            />
          </label>
        </div>

        {localError ? (
          <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-300">
            {localError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={submitModeration}
            disabled={mutation.isPending || availableActions.length === 0}
            startIcon={mutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : undefined}
          >
            {mutation.isPending ? t("sessionEarningReviews.detail.moderation.submitting") : t("sessionEarningReviews.detail.moderation.submit")}
          </Button>
          <span className="text-xs text-text-secondary">{t("sessionEarningReviews.detail.moderation.stepUpNote")}</span>
        </div>
      </div>
    </AdminSectionCard>
  );
}

export default function AdminSessionEarningReviewDetailScreen({ reviewId }: Props) {
  const t = useTranslations("admin-finance-operations");
  const locale = useLocale();
  const reviewQuery = useAdminSessionEarningReview(reviewId);

  if (reviewQuery.isLoading) {
    return <ListStateSkeleton items={4} heightClass="h-28" />;
  }

  if (reviewQuery.isError || !reviewQuery.data) {
    const errorKey = getAdminSessionEarningReviewErrorKey(reviewQuery.error);
    return (
      <StateCard
        icon={<AlertCircle className="h-5 w-5 text-primary" />}
        title={t("sessionEarningReviews.detail.states.errorTitle")}
        note={t(errorKey as Parameters<typeof t>[0])}
        action={{
          label: t("sessionEarningReviews.detail.states.back"),
          href: (
            <Link
              href="/admin/finance/session-earning-reviews"
              className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-5 py-2 text-sm text-text-secondary shadow-theme-xs transition hover:border-primary/30 hover:bg-primary-light hover:text-primary dark:bg-surface-tertiary dark:hover:bg-surface-tertiary/80"
            >
              {t("sessionEarningReviews.detail.states.back")}
            </Link>
          ),
        }}
      />
    );
  }

  const item = reviewQuery.data.item;

  return (
    <div className="space-y-5">
      <SurfaceCard variant="page">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <Link
              href="/admin/finance/session-earning-reviews"
              className="inline-flex items-center gap-2 rounded-full border border-border-light bg-surface-secondary px-3 py-1.5 text-xs font-semibold text-text-primary transition hover:border-primary/30 hover:bg-surface-tertiary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("sessionEarningReviews.detail.back")}
            </Link>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("sessionEarningReviews.detail.eyebrow")}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
                {t("sessionEarningReviews.detail.title")}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-text-secondary sm:text-base">
                {t("sessionEarningReviews.detail.note")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminStatusBadge tone="muted">{shortId(item.reviewId)}</AdminStatusBadge>
            <AdminStatusBadge
              tone={item.isFinalized ? "success" : "warning"}
            >
              {t(`sessionEarningReviews.statuses.${getAdminSessionEarningReviewStatusKey(item.reviewStatus).split(".")[1]}` as Parameters<typeof t>[0])}
            </AdminStatusBadge>
          </div>
        </div>
      </SurfaceCard>

      <ReviewOverviewCard item={item} locale={locale} t={t} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
        <SessionAndPeopleCard item={item} locale={locale} t={t} />
        <PaymentCard item={item} locale={locale} t={t} />
      </div>

      <PackageCard item={item} locale={locale} t={t} />

      <LedgerCard item={item} locale={locale} t={t} />

      <ModerationCard item={item} locale={locale} t={t} />
    </div>
  );
}

