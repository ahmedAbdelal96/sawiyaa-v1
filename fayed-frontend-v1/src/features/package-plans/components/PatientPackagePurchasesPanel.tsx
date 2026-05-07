"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CalendarDays, Clock, Package, Sparkles } from "lucide-react";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import {
  SurfaceCard,
  SurfaceHeader,
  SurfaceStatCard,
  SurfaceToolbar,
} from "@/components/shared/SurfaceShell";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { toAppError } from "@/lib/api/errors";
import { isUnauthorizedError } from "@/lib/api/errors";
import { useMyPackagePurchases } from "../hooks/use-package-purchases";
import PackagePurchasePaymentAction from "./PackagePurchasePaymentAction";
import {
  canContinuePackagePurchasePayment,
  formatDatetime,
  formatMoney,
  getNextUpcomingPackageSession,
  getPackagePurchaseCompletionCount,
  getPackagePurchaseLiveCount,
  getPackagePurchasePendingCount,
  getPackagePurchaseTerminalCount,
  isPackagePurchasePaymentExpired,
} from "../lib/package-purchase-display";
import type { PatientPackagePurchaseItem } from "../types/package-purchases.types";
import SessionStatusBadge from "@/features/sessions/components/SessionStatusBadge";

function getStatusTone(status: PatientPackagePurchaseItem["status"]) {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "COMPLETED":
      return "dark";
    case "PENDING_PAYMENT":
      return "warning";
    case "CANCELLED":
    case "EXPIRED":
      return "light";
    case "REFUNDED":
      return "light";
    default:
      return "light";
  }
}

function getPurchaseCopy(status: PatientPackagePurchaseItem["status"]) {
  return `package-purchases.status.${status}` as const;
}

function PackagePurchaseCard({
  purchase,
  locale,
}: {
  purchase: PatientPackagePurchaseItem;
  locale: string;
}) {
  const t = useTranslations("package-purchases");
  const tSessions = useTranslations("sessions");
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const completedCount = getPackagePurchaseCompletionCount(purchase);
  const pendingCount = getPackagePurchasePendingCount(purchase);
  const liveCount = getPackagePurchaseLiveCount(purchase);
  const terminalCount = getPackagePurchaseTerminalCount(purchase);
  const nextUpcomingSession = getNextUpcomingPackageSession(purchase);
  const paymentExpired = isPackagePurchasePaymentExpired(purchase);
  const canContinuePayment = canContinuePackagePurchasePayment(purchase);

  return (
    <article className="flex h-full flex-col rounded-[28px] border border-border-light bg-white p-5 shadow-[0_10px_28px_-20px_rgba(15,23,38,0.18)] transition hover:-translate-y-0.5 hover:border-primary/25 dark:bg-surface dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {t("list.card.packageTitle", { sessions: purchase.sessionCount })}
          </p>
          <h3 className="text-lg font-semibold text-text-primary dark:text-white/90">
            {purchase.planCode}
          </h3>
          <p className="text-xs text-text-muted">
            {t("list.card.packageLabel", { sessions: purchase.sessionCount })}
          </p>
        </div>
        <Badge variant="solid" color={getStatusTone(purchase.status)} size="sm">
          {t(getPurchaseCopy(purchase.status))}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-primary-light/35 px-4 py-3 dark:bg-primary/10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("list.card.payableTotal")}
          </p>
          <p className="mt-1 text-lg font-bold text-primary">
            {formatMoney(purchase.patientPayableTotal, purchase.selectedCurrencyCode, numLocale)}
          </p>
        </div>
        <div className="rounded-2xl bg-surface px-4 py-3 dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("list.card.discountPercent")}
          </p>
          <p className="mt-1 text-lg font-semibold text-text-primary dark:text-white/90">
            {purchase.discountPercent}%
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-2xl border border-border-light bg-surface px-4 py-3 dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("list.card.progress")}
          </p>
          <p className="mt-1 font-semibold text-text-primary dark:text-white/90">
            {t("list.card.progressValue", {
              completed: completedCount,
              total: purchase.sessionCount,
            })}
          </p>
        </div>
        <div className="rounded-2xl border border-border-light bg-surface px-4 py-3 dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("list.card.currency")}
          </p>
          <p className="mt-1 font-semibold text-text-primary dark:text-white/90">
            {purchase.selectedCurrencyCode}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border-light bg-surface px-4 py-3 dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("list.card.linkedSessions")}
          </p>
          <p className="mt-1 font-semibold text-text-primary dark:text-white/90">
            {purchase.linkedSessionsCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border-light bg-surface px-4 py-3 dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("list.card.completedSessions")}
          </p>
          <p className="mt-1 font-semibold text-text-primary dark:text-white/90">
            {completedCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border-light bg-surface px-4 py-3 dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("list.card.timeWindows")}
          </p>
          <p className="mt-1 font-semibold text-text-primary dark:text-white/90">
            {t("list.card.timeWindowsValue", {
              pending: pendingCount,
              live: liveCount,
              terminal: terminalCount,
            })}
          </p>
        </div>
      </div>

      {nextUpcomingSession ? (
        <div className="mt-4 rounded-[24px] border border-border-light bg-primary-light/30 px-4 py-3 dark:bg-primary/10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {t("list.card.nextSession")}
          </p>
          <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-text-primary dark:text-white/90">
              {t("detail.sessionIndex", {
                current: nextUpcomingSession.packageSessionIndex,
                total: purchase.sessionCount,
              })}
            </p>
            <p className="text-sm text-text-secondary">
            {formatDatetime(nextUpcomingSession.scheduledStartAt, numLocale)}
            </p>
          </div>
        </div>
      ) : null}

      {purchase.status === "PENDING_PAYMENT" ? (
        <div className="mt-4 rounded-[24px] border border-border-light bg-surface px-4 py-3 dark:bg-white/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                {t("list.card.paymentWindow")}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {paymentExpired
                  ? t("list.card.expiredPayment")
                  : purchase.paymentExpiresAt
                    ? t("list.card.expiresAt", {
                        date: formatDatetime(purchase.paymentExpiresAt, numLocale),
                      })
                    : t("list.card.noExpiry")}
              </p>
            </div>
            {canContinuePayment ? (
              <PackagePurchasePaymentAction
                purchase={purchase}
                label={t("list.card.continuePayment")}
              />
            ) : (
              <Badge variant="light" color="light" size="sm">
                {t("list.card.expiredBadge")}
              </Badge>
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/patient/package-purchases/${purchase.id}` as never}
          className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary/35 hover:text-primary dark:bg-white/5"
        >
          {t("list.card.viewDetails")}
        </Link>
      </div>
    </article>
  );
}

export default function PatientPackagePurchasesPanel() {
  const t = useTranslations("package-purchases");
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_LIMIT);

  const { data, isLoading, isError, error, refetch } = useMyPackagePurchases({
    page,
    limit: pageSize,
  });

  const purchases = data?.items ?? [];
  const pagination = data?.pagination;

  const appError = isError ? toAppError(error) : null;
  const isAuthError = appError ? isUnauthorizedError(appError) : false;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <SurfaceCard as="section" variant="page">
          <SurfaceHeader
            eyebrow={t("list.eyebrow")}
            title={t("list.heading")}
            description={t("list.subtitle")}
          />
        </SurfaceCard>
        <ListStateSkeleton items={3} heightClass="h-44" />
      </div>
    );
  }

  if (isError) {
    return (
      <StateCard
        title={isAuthError ? t("errors.authHeading") : t("list.errorHeading")}
        note={isAuthError ? t("errors.authNote") : t("list.errorNote")}
        action={{
          label: isAuthError ? t("errors.authAction") : t("list.retry"),
          href: isAuthError ? (
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
              {t("list.retry")}
            </button>
          ),
        }}
      />
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="space-y-5">
        <SurfaceCard as="section" variant="page">
          <SurfaceHeader
            eyebrow={t("list.eyebrow")}
            title={t("list.heading")}
            description={t("list.subtitle")}
          />
        </SurfaceCard>

        <StateCard
          icon={<Package size={36} className="text-primary" />}
          title={t("list.emptyHeading")}
          note={t("list.emptyNote")}
          action={{
            label: t("list.emptyAction"),
            href: (
              <Link
                href="/patient/practitioners"
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                {t("list.emptyAction")}
              </Link>
            ),
          }}
        />
      </div>
    );
  }

  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="space-y-5">
      <SurfaceCard as="section" variant="page" className="overflow-hidden">
        <SurfaceHeader
          eyebrow={t("list.eyebrow")}
          title={t("list.heading")}
          description={t("list.subtitle")}
          meta={
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SurfaceStatCard
                label={t("list.summary.total")}
                value={String(pagination?.totalItems ?? purchases.length)}
                hint={t("list.summary.totalHint")}
                tone="primary"
                icon={<Package className="h-4 w-4" />}
              />
              <SurfaceStatCard
                label={t("list.summary.pending")}
                value={String(purchases.filter((purchase) => purchase.status === "PENDING_PAYMENT").length)}
                hint={t("list.summary.pendingHint")}
                tone="warning"
                icon={<Clock className="h-4 w-4" />}
              />
              <SurfaceStatCard
                label={t("list.summary.active")}
                value={String(purchases.filter((purchase) => purchase.status === "ACTIVE").length)}
                hint={t("list.summary.activeHint")}
                tone="success"
                icon={<Sparkles className="h-4 w-4" />}
              />
              <SurfaceStatCard
                label={t("list.summary.completed")}
                value={String(purchases.filter((purchase) => purchase.status === "COMPLETED").length)}
                hint={t("list.summary.completedHint")}
                tone="neutral"
                icon={<CalendarDays className="h-4 w-4" />}
              />
            </div>
          }
        />
      </SurfaceCard>

      <SurfaceToolbar className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-text-primary dark:text-white/90">
            {t("list.subtitle")}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
            <span>{t("list.pageLabel", { page, totalPages })}</span>
          </div>
        </div>

        <label className="flex w-full flex-col gap-1 sm:w-auto">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("list.rowsPerPage")}
          </span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="app-control h-11 min-w-[120px] px-3 py-2"
            aria-label={t("list.rowsPerPage")}
          >
            {[10, 20, 50].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </SurfaceToolbar>

      <section className="grid gap-4 xl:grid-cols-2">
        {purchases.map((purchase) => (
          <PackagePurchaseCard key={purchase.id} purchase={purchase} locale={locale} />
        ))}
      </section>

      {totalPages > 1 ? (
        <SurfaceToolbar className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-secondary">{t("list.pageLabel", { page, totalPages })}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1}
              size="sm"
            >
              {t("list.previous")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={page >= totalPages}
              size="sm"
            >
              {t("list.next")}
            </Button>
          </div>
        </SurfaceToolbar>
      ) : null}
    </div>
  );
}
