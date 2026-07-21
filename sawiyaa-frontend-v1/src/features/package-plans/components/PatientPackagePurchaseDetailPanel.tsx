"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CalendarDays,
  Clock,
  Package,
  Sparkles,
  SquareArrowOutUpRight,
  User,
  CheckCircle2,
} from "lucide-react";
import Badge from "@/components/ui/badge/Badge";
import Avatar from "@/components/ui/avatar/Avatar";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard, SurfaceHeader, SurfaceStatCard } from "@/components/shared/SurfaceShell";
import { MoneyText } from "@/components/money/MoneyText";
import { toAppError, isUnauthorizedError } from "@/lib/api/errors";
import { useMyPackagePurchase } from "../hooks/use-package-purchases";
import PackagePurchasePaymentAction from "./PackagePurchasePaymentAction";
import SessionStatusBadge from "@/features/sessions/components/SessionStatusBadge";
import {
  canContinuePackagePurchasePayment,
  formatDatetime,
  formatPackageDisplayTitle,
  getNextUpcomingPackageSession,
  getPackagePurchaseStatusConfig,
  isPackagePurchasePaymentExpired,
  sortPackagePurchaseSessions,
} from "../lib/package-purchase-display";
import { mapPackagePurchaseSnapshotMoney } from "../lib/package-money";
import type {
  PatientPackagePurchaseItem,
  PatientPackagePurchaseSessionSummary,
} from "../types/package-purchases.types";
import { DataTable } from "@/components/ui/data-table/DataTable";

export default function PatientPackagePurchaseDetailPanel({
  purchaseId,
}: {
  purchaseId: string;
}) {
  const t = useTranslations("package-purchases");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const { data, isLoading, isError, error, refetch } = useMyPackagePurchase(purchaseId);

  if (isLoading) {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.72fr)_minmax(340px,0.95fr)]">
        <div className="space-y-6">
          <SurfaceCard as="section" variant="section">
            <ListStateSkeleton items={2} heightClass="h-28" />
          </SurfaceCard>
          <SurfaceCard as="section" variant="section">
            <ListStateSkeleton items={4} heightClass="h-16" />
          </SurfaceCard>
        </div>
        <aside className="space-y-6">
          <SurfaceCard as="section" variant="section">
            <ListStateSkeleton items={3} heightClass="h-20" />
          </SurfaceCard>
        </aside>
      </div>
    );
  }

  if (isError || !data) {
    const appError = isError ? toAppError(error) : null;
    const unauthorized = appError ? isUnauthorizedError(appError) : false;
    const notFound = appError?.statusCode === 404;

    return (
      <StateCard
        title={
          unauthorized
            ? t("errors.authHeading")
            : notFound
              ? t("errors.notFoundHeading")
              : t("detail.errorHeading")
        }
        note={
          unauthorized
            ? t("errors.authNote")
            : notFound
              ? t("errors.notFoundNote")
              : t("detail.errorNote")
        }
        action={{
          label: unauthorized ? t("errors.authAction") : t("detail.retry"),
          href: unauthorized ? (
            <Link
              href="/signin?mode=patient"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              {t("errors.authAction")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              {t("detail.retry")}
            </button>
          ),
        }}
      />
    );
  }

  const purchase = data.item;
  const packageTitleText = formatPackageDisplayTitle({
    title: purchase.title,
    sessionCount: purchase.sessionCount,
    t,
  });

  const baseSessionMoney = mapPackagePurchaseSnapshotMoney({
    amount: purchase.selectedBaseSessionPrice,
    selectedCurrencyCode: purchase.selectedCurrencyCode,
  });
  const undiscountedMoney = mapPackagePurchaseSnapshotMoney({
    amount: purchase.undiscountedTotal,
    selectedCurrencyCode: purchase.selectedCurrencyCode,
  });
  const discountMoney = mapPackagePurchaseSnapshotMoney({
    amount: purchase.discountAmount,
    selectedCurrencyCode: purchase.selectedCurrencyCode,
  });
  const payableMoney = mapPackagePurchaseSnapshotMoney({
    amount: purchase.patientPayableTotal,
    selectedCurrencyCode: purchase.selectedCurrencyCode,
  });
  const unavailable = t("detail.fields.notAvailable");

  // Canonical Progress Values directly from Backend Presenter
  const totalCount = purchase.progress?.totalSessions ?? purchase.sessionCount;
  const completedCount = purchase.progress?.completedSessions ?? 0;
  const remainingCount = purchase.progress?.remainingSessions ?? Math.max(0, totalCount - completedCount);
  const progressPercent = purchase.progress?.progressPercent ?? Math.min(100, Math.round((completedCount / Math.max(1, totalCount)) * 100));

  const statusConfig = getPackagePurchaseStatusConfig(purchase.status);
  const paymentExpired = isPackagePurchasePaymentExpired(purchase);
  const canContinuePayment = canContinuePackagePurchasePayment(purchase);

  // Sorted linked sessions for DataTable
  const sortedSessions = sortPackagePurchaseSessions(purchase.linkedSessions.items);

  const sessionColumns = [
    {
      id: "index",
      header: t("detail.fields.sessionCount"),
      accessor: (row: PatientPackagePurchaseSessionSummary) => row.packageSessionIndex,
      cell: (row: PatientPackagePurchaseSessionSummary) => (
        <span className="font-mono text-xs font-semibold text-text-primary dark:text-white">
          {t("detail.sessionIndex", {
            current: row.packageSessionIndex,
            total: purchase.sessionCount,
          })}
        </span>
      ),
    },
    {
      id: "scheduledAt",
      header: t("list.table.nextSession"),
      accessor: (row: PatientPackagePurchaseSessionSummary) => row.scheduledStartAt,
      cell: (row: PatientPackagePurchaseSessionSummary) => (
        <span className="text-xs font-medium text-text-secondary">
          {row.scheduledStartAt
            ? formatDatetime(row.scheduledStartAt, numLocale)
            : t("detail.sessionNotScheduled")}
        </span>
      ),
    },
    {
      id: "duration",
      header: t("detail.sessionDuration"),
      accessor: (row: PatientPackagePurchaseSessionSummary) => row.durationMinutes,
      cell: (row: PatientPackagePurchaseSessionSummary) => (
        <span className="text-xs text-text-secondary">
          {row.durationMinutes} {t("detail.minutes")}
        </span>
      ),
    },
    {
      id: "mode",
      header: t("detail.sessionMode"),
      accessor: (row: PatientPackagePurchaseSessionSummary) => row.sessionMode,
      cell: (row: PatientPackagePurchaseSessionSummary) => (
        <span className="text-xs font-semibold text-text-secondary uppercase">
          {row.sessionMode}
        </span>
      ),
    },
    {
      id: "status",
      header: t("list.table.status"),
      accessor: (row: PatientPackagePurchaseSessionSummary) => row.status,
      cell: (row: PatientPackagePurchaseSessionSummary) => (
        <SessionStatusBadge status={row.status} />
      ),
    },
    {
      id: "actions",
      header: t("list.table.actions"),
      accessor: (row: PatientPackagePurchaseSessionSummary) => row.id,
      cell: (row: PatientPackagePurchaseSessionSummary) => {
        const canOpen = ["UPCOMING", "READY_TO_JOIN", "IN_PROGRESS"].includes(row.status);
        return (
          <Link
            href={`/patient/sessions/${row.id}` as never}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-light bg-white px-3 py-1.5 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary dark:bg-white/5"
          >
            {canOpen ? t("detail.openSession") : t("detail.viewSession")}
            <SquareArrowOutUpRight className="h-3.5 w-3.5" />
          </Link>
        );
      },
    },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.72fr)_minmax(340px,0.95fr)]">
      {/* Main Column */}
      <div className="space-y-6">
        {/* Package Overview Card */}
        <SurfaceCard as="section" variant="section" className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {t("detail.packageEyebrow")}
              </span>
              <h2 className="mt-1 text-xl font-bold text-text-primary dark:text-white">
                {packageTitleText}
              </h2>
            </div>
            <Badge variant="solid" color={statusConfig.tone} size="sm">
              {t(statusConfig.labelKey as any)}
            </Badge>
          </div>

          {/* Progress Bar & Canonical Backend Progress */}
          <div className="rounded-2xl border border-border-light bg-surface-secondary/70 p-4 dark:bg-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-text-secondary">
              <span className="font-semibold text-text-primary dark:text-white">
                {t("detail.progressHeading")}
              </span>
              <span>
                {t("detail.progressValue", { completed: completedCount, total: totalCount })} ({progressPercent}%)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-tertiary dark:bg-white/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-text-muted pt-1">
              <span>{t("list.summary.completed")}: {completedCount}</span>
              <span>{t("list.summary.pending")}: {remainingCount}</span>
            </div>
          </div>
        </SurfaceCard>

        {/* Linked Sessions Section — Uses Reusable Platform DataTable */}
        <SurfaceCard as="section" variant="section" className="space-y-4">
          <SurfaceHeader
            eyebrow={t("detail.sessionsEyebrow")}
            title={t("detail.sessionsHeading")}
            description={t("detail.sessionsNote")}
          />

          <DataTable
            data={sortedSessions}
            columns={sessionColumns}
            getRowId={(row) => row.id}
            emptyState={{
              title: t("detail.noSessionsHeading"),
              description: t("detail.noSessionsNote"),
            }}
          />
        </SurfaceCard>
      </div>

      {/* Sidebar Column */}
      <aside className="space-y-6">
        {/* Practitioner Identity Card */}
        {purchase.practitioner && (
          <SurfaceCard as="section" variant="section" className="space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {t("list.table.practitioner")}
            </span>
            <div className="flex items-center gap-3.5">
              <Avatar
                src={purchase.practitioner.avatarUrl}
                name={purchase.practitioner.displayName}
                size="large"
                className="h-12 w-12 rounded-2xl border border-border-light"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-bold text-text-primary dark:text-white">
                  {purchase.practitioner.displayName}
                </h3>
                {purchase.practitioner.professionalTitle && (
                  <p className="truncate text-xs text-text-muted mt-0.5">
                    {purchase.practitioner.professionalTitle}
                  </p>
                )}
              </div>
            </div>
            <Link
              href={`/practitioners/${purchase.practitioner.publicSlug}`}
              className="w-full inline-flex items-center justify-center rounded-2xl border border-border-light bg-surface-secondary px-4 py-2.5 text-xs font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary dark:bg-white/5"
            >
              {t("list.actions.viewPractitioner")}
            </Link>
          </SurfaceCard>
        )}

        {/* Financial Information Card (Persisted Snapshot Pricing) */}
        <SurfaceCard as="section" variant="section" className="space-y-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            {t("detail.summary.total")}
          </span>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs py-1 border-b border-border-light dark:border-white/5">
              <span className="text-text-muted">{t("detail.fields.baseSessionPrice")}</span>
              <span className="font-semibold text-text-primary dark:text-white">
                {baseSessionMoney ? <MoneyText money={baseSessionMoney} /> : unavailable}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-border-light dark:border-white/5">
              <span className="text-text-muted">{t("detail.fields.undiscountedTotal")}</span>
              <span className="font-semibold text-text-primary dark:text-white">
                {undiscountedMoney ? <MoneyText money={undiscountedMoney} /> : unavailable}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-border-light dark:border-white/5">
              <span className="text-text-muted">{t("detail.fields.discountAmount")}</span>
              <span className="font-bold text-success-700 dark:text-success-300">
                {discountMoney ? <MoneyText money={discountMoney} /> : unavailable}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm py-2 rounded-xl bg-primary-light/40 px-3 dark:bg-primary/10">
              <span className="font-bold text-primary">{t("detail.fields.patientPayableTotal")}</span>
              <span className="text-base font-extrabold text-primary">
                {payableMoney ? <MoneyText money={payableMoney} /> : unavailable}
              </span>
            </div>
          </div>
        </SurfaceCard>

        {/* Payment Action Block (Pending Payment) */}
        {purchase.status === "PENDING_PAYMENT" && (
          <SurfaceCard as="section" variant="section" className="space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {t("detail.paymentBlock.eyebrow")}
            </span>
            <h3 className="text-base font-bold text-text-primary dark:text-white">
              {t("detail.paymentBlock.heading")}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {paymentExpired
                ? t("detail.paymentBlock.expiredNote")
                : purchase.paymentExpiresAt
                  ? t("detail.paymentBlock.expiresAt", {
                      date: formatDatetime(purchase.paymentExpiresAt, numLocale),
                    })
                  : t("detail.paymentBlock.noExpiry")}
            </p>
            {canContinuePayment ? (
              <PackagePurchasePaymentAction
                purchase={purchase}
                label={t("detail.paymentBlock.continuePayment")}
              />
            ) : (
              <Badge variant="light" color="light" size="sm">
                {t("detail.paymentBlock.expiredBadge")}
              </Badge>
            )}
          </SurfaceCard>
        )}
      </aside>
    </div>
  );
}
