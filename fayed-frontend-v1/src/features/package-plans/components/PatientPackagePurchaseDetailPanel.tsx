"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CalendarDays,
  Clock,
  Package,
  Sparkles,
  SquareArrowOutUpRight,
} from "lucide-react";
import Badge from "@/components/ui/badge/Badge";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { SurfaceCard, SurfaceHeader, SurfaceStatCard } from "@/components/shared/SurfaceShell";
import { toAppError } from "@/lib/api/errors";
import { isUnauthorizedError } from "@/lib/api/errors";
import { useMyPackagePurchase } from "../hooks/use-package-purchases";
import PackagePurchasePaymentAction from "./PackagePurchasePaymentAction";
import SessionStatusBadge from "@/features/sessions/components/SessionStatusBadge";
import {
  canContinuePackagePurchasePayment,
  formatDatetime,
  formatMoney,
  getNextUpcomingPackageSession,
  getPackagePurchaseCompletionCount,
  getPackagePurchaseLiveCount,
  getPackagePurchasePendingCount,
  getPackagePurchaseStatusLabelKey,
  getPackagePurchaseTerminalCount,
  groupPackagePurchaseSessions,
  isPackagePurchasePaymentExpired,
  sortPackagePurchaseSessions,
} from "../lib/package-purchase-display";
import type { PatientPackagePurchaseItem } from "../types/package-purchases.types";

function getStatusTone(status: PatientPackagePurchaseItem["status"]) {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "COMPLETED":
      return "brand";
    case "PENDING_PAYMENT":
      return "warning";
    default:
      return "neutral";
  }
}

function PackageSessionItem({
  purchase,
  session,
  locale,
}: {
  purchase: PatientPackagePurchaseItem;
  session: PatientPackagePurchaseItem["linkedSessions"]["items"][number];
  locale: string;
}) {
  const t = useTranslations("package-purchases");
  const tSessions = useTranslations("sessions");
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";
  const canOpen = ["CONFIRMED", "UPCOMING", "READY_TO_JOIN", "IN_PROGRESS"].includes(
    session.status,
  );

  return (
    <div className="rounded-[22px] border border-border-light bg-white p-4 transition hover:border-primary/25 dark:bg-surface-secondary">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-xs tracking-[0.16em] text-text-muted">{session.sessionCode}</p>
          <p className="text-sm font-semibold text-text-primary dark:text-white/90">
            {t("detail.sessionIndex", {
              current: session.packageSessionIndex,
              total: purchase.sessionCount,
            })}
          </p>
          <p className="text-xs text-text-secondary">
            {session.scheduledStartAt
              ? formatDatetime(session.scheduledStartAt, numLocale)
              : t("detail.sessionNotScheduled")}
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <SessionStatusBadge status={session.status} />
          <div className="rounded-full bg-surface-tertiary px-2.5 py-1 text-[11px] font-medium text-text-secondary dark:bg-white/5">
            {tSessions(`status.${session.status}` as Parameters<typeof tSessions>[0])}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
        <span>
          {t("detail.sessionMode")}: {tSessions(`detail.mode.${session.sessionMode}` as Parameters<typeof tSessions>[0])}
        </span>
        <span aria-hidden="true">•</span>
        <span>
          {t("detail.sessionDuration")}: {session.durationMinutes} {t("detail.minutes")}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Badge variant="light" color={canOpen ? "info" : "light"} size="sm">
          {canOpen ? t("detail.openable") : t("detail.viewOnly")}
        </Badge>
        <Link
          href={`/patient/sessions/${session.id}` as never}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-border-light bg-white px-3 py-2 text-xs font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary dark:bg-white/5"
        >
          {canOpen ? t("detail.openSession") : t("detail.viewSession")}
          <SquareArrowOutUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function PatientPackagePurchaseDetailPanel({
  purchaseId,
}: {
  purchaseId: string;
}) {
  const t = useTranslations("package-purchases");
  const tSessions = useTranslations("sessions");
  const locale = useLocale();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const { data, isLoading, isError, error, refetch } = useMyPackagePurchase(purchaseId);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <SurfaceCard as="section" variant="page">
          <SurfaceHeader
            eyebrow={t("detail.eyebrow")}
            title={t("detail.heading")}
            description={t("detail.subtitle")}
          />
        </SurfaceCard>
        <ListStateSkeleton items={4} heightClass="h-28" />
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
  const completedCount = getPackagePurchaseCompletionCount(purchase);
  const pendingCount = getPackagePurchasePendingCount(purchase);
  const liveCount = getPackagePurchaseLiveCount(purchase);
  const terminalCount = getPackagePurchaseTerminalCount(purchase);
  const nextUpcomingSession = getNextUpcomingPackageSession(purchase);
  const sessions = groupPackagePurchaseSessions(purchase);
  const paymentExpired = isPackagePurchasePaymentExpired(purchase);
  const canContinuePayment = canContinuePackagePurchasePayment(purchase);
  const sortedSessions = sortPackagePurchaseSessions(purchase.linkedSessions.items);

  return (
    <div className="space-y-5">
      <SurfaceCard as="section" variant="page" className="overflow-hidden">
        <SurfaceHeader
          eyebrow={t("detail.eyebrow")}
          title={t("detail.heading")}
          description={t("detail.subtitle")}
          actions={
            <Link
              href="/patient/package-purchases"
              className="inline-flex items-center gap-2 rounded-2xl border border-border-light bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/30 hover:text-primary dark:bg-white/5"
            >
              {t("detail.back")}
            </Link>
          }
          meta={
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SurfaceStatCard
                label={t("detail.summary.status")}
                value={t(getPackagePurchaseStatusLabelKey(purchase.status) as Parameters<typeof t>[0])}
                hint={purchase.planCode}
                tone={getStatusTone(purchase.status)}
                icon={<Package className="h-4 w-4" />}
              />
              <SurfaceStatCard
                label={t("detail.summary.progress")}
                value={`${completedCount}/${purchase.sessionCount}`}
                hint={t("detail.summary.progressHint", {
                  completed: completedCount,
                  total: purchase.sessionCount,
                })}
                tone="primary"
                icon={<Sparkles className="h-4 w-4" />}
              />
              <SurfaceStatCard
                label={t("detail.summary.currency")}
                value={purchase.selectedCurrencyCode}
                hint={t("detail.summary.currencyHint")}
                tone="neutral"
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <SurfaceStatCard
                label={t("detail.summary.total")}
                value={formatMoney(purchase.patientPayableTotal, purchase.selectedCurrencyCode, numLocale)}
                hint={t("detail.summary.totalHint")}
                tone="success"
                icon={<Clock className="h-4 w-4" />}
              />
            </div>
          }
        />
      </SurfaceCard>

      {purchase.status === "PENDING_PAYMENT" ? (
        <SurfaceCard as="section" variant="section" className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("detail.paymentBlock.eyebrow")}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-text-primary dark:text-white/90">
                {t("detail.paymentBlock.heading")}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {paymentExpired
                  ? t("detail.paymentBlock.expiredNote")
                  : purchase.paymentExpiresAt
                    ? t("detail.paymentBlock.expiresAt", {
                        date: formatDatetime(purchase.paymentExpiresAt, numLocale),
                      })
                    : t("detail.paymentBlock.noExpiry")}
              </p>
            </div>
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
          </div>
        </SurfaceCard>
      ) : null}

      <SurfaceCard as="section" variant="section" className="space-y-4">
        <SurfaceHeader
          eyebrow={t("detail.packageEyebrow")}
          title={t("detail.packageTitle", { sessions: purchase.sessionCount })}
          description={t("detail.packageDescription")}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("detail.fields.sessionCount")}
            </p>
            <p className="mt-1 text-base font-semibold text-text-primary dark:text-white/90">
              {purchase.sessionCount}
            </p>
          </div>
          <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("detail.fields.discountPercent")}
            </p>
            <p className="mt-1 text-base font-semibold text-text-primary dark:text-white/90">
              {purchase.discountPercent}%
            </p>
          </div>
          <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("detail.fields.duration")}
            </p>
            <p className="mt-1 text-base font-semibold text-text-primary dark:text-white/90">
              {tSessions(`card.duration`, { n: purchase.durationMinutes })}
            </p>
          </div>
          <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("detail.fields.paymentExpiresAt")}
            </p>
            <p className="mt-1 text-base font-semibold text-text-primary dark:text-white/90">
              {purchase.paymentExpiresAt
                ? formatDatetime(purchase.paymentExpiresAt, numLocale)
                : t("detail.fields.notAvailable")}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("detail.fields.baseSessionPrice")}
            </p>
            <p className="mt-1 text-base font-semibold text-text-primary dark:text-white/90">
              {formatMoney(purchase.selectedBaseSessionPrice, purchase.selectedCurrencyCode, numLocale)}
            </p>
          </div>
          <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("detail.fields.undiscountedTotal")}
            </p>
            <p className="mt-1 text-base font-semibold text-text-primary dark:text-white/90">
              {formatMoney(purchase.undiscountedTotal, purchase.selectedCurrencyCode, numLocale)}
            </p>
          </div>
          <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("detail.fields.discountAmount")}
            </p>
            <p className="mt-1 text-base font-semibold text-success-700 dark:text-success-300">
              {formatMoney(purchase.discountAmount, purchase.selectedCurrencyCode, numLocale)}
            </p>
          </div>
          <div className="rounded-2xl bg-primary-light px-4 py-3 dark:bg-primary/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {t("detail.fields.patientPayableTotal")}
            </p>
            <p className="mt-1 text-lg font-bold text-primary">
              {formatMoney(purchase.patientPayableTotal, purchase.selectedCurrencyCode, numLocale)}
            </p>
          </div>
        </div>

        <div className="rounded-[24px] border border-border-light bg-surface/70 px-4 py-4 dark:bg-white/5">
          <p className="text-sm font-semibold text-text-primary dark:text-white/90">
            {t("detail.progressHeading")}
          </p>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-surface-tertiary dark:bg-white/10">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.min(100, (completedCount / Math.max(1, purchase.sessionCount)) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            {t("detail.progressValue", {
              completed: completedCount,
              total: purchase.sessionCount,
            })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted">
            <span>{t("detail.progressFacts.live", { count: liveCount })}</span>
            <span aria-hidden="true">•</span>
            <span>{t("detail.progressFacts.pending", { count: pendingCount })}</span>
            <span aria-hidden="true">•</span>
            <span>{t("detail.progressFacts.terminal", { count: terminalCount })}</span>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard as="section" variant="section" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("detail.sessionsEyebrow")}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-text-primary dark:text-white/90">
              {t("detail.sessionsHeading")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {t("detail.sessionsNote")}
            </p>
          </div>
          {nextUpcomingSession ? (
            <div className="rounded-[22px] bg-primary-light/30 px-4 py-3 dark:bg-primary/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                {t("detail.nextSessionLabel")}
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
                {t("detail.sessionIndex", {
                  current: nextUpcomingSession.packageSessionIndex,
                  total: purchase.sessionCount,
                })}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {formatDatetime(nextUpcomingSession.scheduledStartAt, numLocale)}
              </p>
            </div>
          ) : null}
        </div>

        {sortedSessions.length === 0 ? (
          <StateCard title={t("detail.noSessionsHeading")} note={t("detail.noSessionsNote")} />
        ) : (
          <div className="space-y-5">
            {sessions.live.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-primary dark:text-white/90">
                  {t("detail.sections.live")}
                </h3>
                <div className="grid gap-3">
                  {sessions.live.map((session) => (
                    <PackageSessionItem key={session.id} purchase={purchase} session={session} locale={locale} />
                  ))}
                </div>
              </div>
            ) : null}

            {sessions.pending.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-primary dark:text-white/90">
                  {t("detail.sections.pending")}
                </h3>
                <div className="grid gap-3">
                  {sessions.pending.map((session) => (
                    <PackageSessionItem key={session.id} purchase={purchase} session={session} locale={locale} />
                  ))}
                </div>
              </div>
            ) : null}

            {sessions.completed.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-primary dark:text-white/90">
                  {t("detail.sections.completed")}
                </h3>
                <div className="grid gap-3">
                  {sessions.completed.map((session) => (
                    <PackageSessionItem key={session.id} purchase={purchase} session={session} locale={locale} />
                  ))}
                </div>
              </div>
            ) : null}

            {sessions.terminal.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-primary dark:text-white/90">
                  {t("detail.sections.terminal")}
                </h3>
                <div className="grid gap-3">
                  {sessions.terminal.map((session) => (
                    <PackageSessionItem key={session.id} purchase={purchase} session={session} locale={locale} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
