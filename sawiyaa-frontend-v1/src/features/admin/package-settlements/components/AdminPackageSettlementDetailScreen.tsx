"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  BadgeDollarSign,
  ChevronLeft,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard } from "@/components/shared/SurfaceShell";
import Button from "@/components/ui/button/Button";
import { useAuthState } from "@/stores/auth-store";
import { toAppError } from "@/lib/api/errors";
import {
  ADMIN_PACKAGE_SETTLEMENT_STATUS_STYLES,
  canReleasePackageSettlement,
  getAdminPackageSettlementErrorKey,
  getPackageSettlementDecisionKey,
} from "../lib/admin-package-settlement-status";
import {
  useAdminPackageSettlement,
  useReleaseAdminPackageSettlement,
} from "../hooks/use-admin-package-settlements";
import type { AdminPackageSettlementDetail } from "../types/admin-package-settlements.types";
import { formatSettlementDateTime, formatSettlementMoney } from "@/features/admin/finance/lib/finance-formatters";
import AdminPackageSettlementReleaseModal from "./AdminPackageSettlementReleaseModal";

type Props = {
  id: string;
};

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
      <span
        className={`text-sm text-text-primary dark:text-white/90 ${
          mono ? "font-mono text-xs sm:text-sm" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
      <h2 className="text-base font-semibold text-text-primary dark:text-white/95">{title}</h2>
      {note ? <p className="mt-1 text-sm leading-6 text-text-secondary">{note}</p> : null}
      <div className="mt-4">{children}</div>
    </SurfaceCard>
  );
}

function SummaryTile({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <SurfaceCard variant="compact" className="rounded-[24px]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
        {title}
      </p>
      <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">{value}</p>
    </SurfaceCard>
  );
}

function StatusChip({
  status,
  t,
}: {
  status: AdminPackageSettlementDetail["status"];
  t: ReturnType<typeof useTranslations>;
}) {
  const className =
    ADMIN_PACKAGE_SETTLEMENT_STATUS_STYLES[status] ??
    "bg-surface-tertiary text-text-secondary dark:bg-white/8 dark:text-white/70";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {t(`statuses.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}

export default function AdminPackageSettlementDetailScreen({ id }: Props) {
  const t = useTranslations("admin-package-settlements");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuthState();
  const canOperate = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const settlementQuery = useAdminPackageSettlement(id);
  const releaseMutation = useReleaseAdminPackageSettlement();
  const [feedback, setFeedback] = useState<{ tone: "success" | "warning" | "error"; message: string } | null>(null);
  const [isReleaseOpen, setIsReleaseOpen] = useState(false);

  const item = settlementQuery.data?.item;
  const canRelease = Boolean(item && canReleasePackageSettlement(item.status));

  const handleConfirmRelease = async () => {
    if (!item) return;
    setFeedback(null);

    try {
      const result = await releaseMutation.mutateAsync(item.id);
      setIsReleaseOpen(false);

      if (result.item.status === "NEEDS_REVIEW") {
        setFeedback({ tone: "warning", message: t("errors.needsReview") });
        toast.warning(t("errors.needsReview"));
      } else {
        setFeedback({ tone: "success", message: t("modal.success") });
        toast.success(t("modal.success"));
      }
    } catch (error) {
      const messageKey = getAdminPackageSettlementErrorKey(error);
      const safeMessage = t(messageKey as Parameters<typeof t>[0]);
      setFeedback({ tone: "error", message: safeMessage });
      toast.error(safeMessage);
    }
  };

  const decisionLabel = item?.decision
    ? t(getPackageSettlementDecisionKey(item.decision) as Parameters<typeof t>[0])
    : "-";

  if (settlementQuery.isLoading) {
    return (
      <div className="space-y-5">
        <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
          <ListStateSkeleton items={1} heightClass="h-28" />
        </SurfaceCard>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.8fr)]">
          <div className="space-y-5">
            <ListStateSkeleton items={3} heightClass="h-48" />
          </div>
          <div className="space-y-5">
            <ListStateSkeleton items={2} heightClass="h-44" />
          </div>
        </div>
      </div>
    );
  }

  if (settlementQuery.isError || !item) {
    const error = settlementQuery.error ? toAppError(settlementQuery.error) : null;
    const isNotFound =
      error?.statusCode === 404 ||
      error?.code === "FINANCIAL_OPERATIONS_PACKAGE_SETTLEMENT_NOT_FOUND";

    return (
      <div className="mx-auto max-w-2xl">
        <StateCard
          icon={<ClipboardList className="h-8 w-8 text-text-muted" />}
          title={isNotFound ? t("states.notFound.heading") : t("states.detailError.heading")}
          note={isNotFound ? t("states.notFound.note") : t("states.detailError.note")}
          action={{
            label: t("states.detailError.back"),
            href: (
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {!isNotFound ? (
                  <button
                    type="button"
                    onClick={() => settlementQuery.refetch()}
                    className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
                  >
                    {t("states.detailError.retry")}
                  </button>
                ) : null}
                <Link
                  href="/admin/package-settlements"
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                >
                  {t("states.detailError.back")}
                </Link>
              </div>
            ),
          }}
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
          <Button
            variant="outline"
            size="sm"
            startIcon={<ChevronLeft className="h-4 w-4" />}
            onClick={() => router.push(`/${locale}/admin/package-settlements`)}
          >
            {t("detail.back")}
          </Button>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("detail.eyebrow")}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
                {t("detail.title")}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                {t("detail.note")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={item.status} t={t} />
              <span className="inline-flex items-center gap-2 rounded-full bg-surface-tertiary px-3 py-1 text-xs font-semibold text-text-secondary dark:bg-white/10 dark:text-white/70">
                <BadgeDollarSign className="h-3.5 w-3.5" />
                {item.currency}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-text-brand dark:bg-primary/12 dark:text-primary-light">
                {t("detail.fields.sessions")}: {item.completedSessionsCount} / {item.sessionCount}
              </span>
            </div>
          </div>
        </SurfaceCard>

        {feedback ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              feedback.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/30 dark:bg-emerald-900/10 dark:text-emerald-300"
                : feedback.tone === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/10 dark:text-red-300"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.8fr)]">
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryTile
                title={t("detail.totals.heldPractitioner")}
                value={formatSettlementMoney(locale, item.heldPractitionerAmount, item.currency)}
              />
              <SummaryTile
                title={t("detail.totals.releasablePractitioner")}
                value={formatSettlementMoney(locale, item.releasablePractitionerAmount, item.currency)}
              />
              <SummaryTile
                title={t("detail.totals.releasedPractitioner")}
                value={formatSettlementMoney(locale, item.releasedPractitionerAmount, item.currency)}
              />
              <SummaryTile
                title={t("detail.totals.sessions")}
                value={t("detail.totals.sessionsValue", {
                  completed: item.completedSessionsCount,
                  total: item.sessionCount,
                })}
              />
            </div>

            <SectionCard title={t("detail.sections.overview")} note={t("detail.sections.overviewNote")}>
              <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
                <DetailRow label={t("detail.fields.settlementId")} value={item.id} mono />
                <DetailRow label={t("detail.fields.purchaseId")} value={item.purchaseId} mono />
                <DetailRow
                  label={t("detail.fields.packagePlan")}
                  value={item.packagePlanTitle ?? item.packagePlanCode ?? "-"}
                />
                <DetailRow
                  label={t("detail.fields.practitioner")}
                  value={item.practitionerDisplayName ?? item.practitionerSlug ?? item.practitionerId}
                />
                <DetailRow
                  label={t("detail.fields.patient")}
                  value={item.patientDisplayName ?? item.patientId}
                />
                <DetailRow
                  label={t("detail.fields.purchaseStatus")}
                  value={t(`purchaseStatuses.${item.purchaseStatus}` as Parameters<typeof t>[0])}
                />
                <DetailRow label={t("detail.fields.currency")} value={item.currency} />
                <DetailRow
                  label={t("detail.fields.sessions")}
                  value={t("detail.fields.sessionsValue", {
                    completed: item.completedSessionsCount,
                    total: item.sessionCount,
                  })}
                />
                <DetailRow
                  label={t("detail.fields.updatedAt")}
                  value={formatSettlementDateTime(locale, item.updatedAt)}
                />
              </div>
            </SectionCard>

            <SectionCard title={t("detail.sections.amounts")} note={t("detail.sections.amountsNote")}>
              <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
                <DetailRow
                  label={t("detail.amounts.heldPractitioner")}
                  value={formatSettlementMoney(locale, item.heldPractitionerAmount, item.currency)}
                />
                <DetailRow
                  label={t("detail.amounts.heldPlatform")}
                  value={formatSettlementMoney(locale, item.heldPlatformAmount, item.currency)}
                />
                <DetailRow
                  label={t("detail.amounts.releasablePractitioner")}
                  value={formatSettlementMoney(locale, item.releasablePractitionerAmount, item.currency)}
                />
                <DetailRow
                  label={t("detail.amounts.releasedPractitioner")}
                  value={formatSettlementMoney(locale, item.releasedPractitionerAmount, item.currency)}
                />
                <DetailRow
                  label={t("detail.amounts.normalEquivalentUsed")}
                  value={formatSettlementMoney(locale, item.normalEquivalentUsedAmount, item.currency)}
                />
                <DetailRow
                  label={t("detail.amounts.discountApplied")}
                  value={formatSettlementMoney(locale, item.discountAppliedAmount, item.currency)}
                />
              </div>
            </SectionCard>

            <SectionCard title={t("detail.sections.review")} note={t("detail.sections.reviewNote")}>
              <div className="rounded-[24px] border border-border-light px-4 dark:border-white/8">
                <DetailRow label={t("detail.review.decision")} value={decisionLabel} />
                <DetailRow
                  label={t("detail.review.reviewedAt")}
                  value={formatSettlementDateTime(locale, item.reviewedAt)}
                />
                <DetailRow
                  label={t("detail.review.reviewedBy")}
                  value={item.reviewedByAdminId ?? "-"}
                  mono
                />
                <DetailRow
                  label={t("detail.review.releasedAt")}
                  value={formatSettlementDateTime(locale, item.releasedAt)}
                />
                <DetailRow
                  label={t("detail.review.releasedBy")}
                  value={item.releasedByAdminId ?? "-"}
                  mono
                />
              </div>

              {item.notes ? (
                <div className="mt-4 rounded-[22px] border border-border-light bg-surface-secondary/60 p-4 text-sm leading-6 text-text-secondary dark:border-white/8 dark:bg-white/[0.03]">
                  {item.notes}
                </div>
              ) : null}
            </SectionCard>
          </div>

          <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <SurfaceCard variant="section" className="rounded-[28px] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {t("detail.status")}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-text-primary dark:text-white/95">
                    {item.packagePlanTitle ?? item.packagePlanCode ?? t("detail.title")}
                  </h2>
                </div>
                <StatusChip status={item.status} t={t} />
              </div>

              <div className="mt-5 space-y-3">
                <DetailRow
                  label={t("detail.sidebar.packageRef")}
                  value={shortId(item.purchaseId)}
                  mono
                />
                <DetailRow
                  label={t("detail.sidebar.purchaseStatus")}
                  value={t(`purchaseStatuses.${item.purchaseStatus}` as Parameters<typeof t>[0])}
                />
                <DetailRow
                  label={t("detail.sidebar.progress")}
                  value={t("detail.totals.sessionsValue", {
                    completed: item.completedSessionsCount,
                    total: item.sessionCount,
                  })}
                />
                <DetailRow label={t("detail.sidebar.currency")} value={item.currency} />
              </div>

              {canRelease ? (
                <Button
                  className="mt-5 w-full"
                  startIcon={<BadgeDollarSign className="h-4 w-4" />}
                  onClick={() => setIsReleaseOpen(true)}
                  disabled={!canOperate || releaseMutation.isPending}
                >
                  {t("actions.release")}
                </Button>
              ) : null}

              {item.status === "NEEDS_REVIEW" ? (
                <div className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50/80 p-4 text-sm leading-6 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
                  {t("errors.needsReview")}
                </div>
              ) : null}

              {item.status === "RELEASED" ? (
                <div className="mt-4 rounded-[22px] border border-emerald-200 bg-emerald-50/80 p-4 text-sm leading-6 text-emerald-900 dark:border-emerald-700/25 dark:bg-emerald-900/10 dark:text-emerald-100">
                  {t("detail.releasedNote")}
                </div>
              ) : null}
            </SurfaceCard>
          </div>
        </div>
      </div>

      <AdminPackageSettlementReleaseModal
        isOpen={isReleaseOpen}
        onClose={() => setIsReleaseOpen(false)}
        settlement={item}
        loading={releaseMutation.isPending}
        onConfirm={handleConfirmRelease}
      />
    </>
  );
}

function shortId(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}
