"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, BellRing } from "lucide-react";
import { isAppError } from "@/lib/api/errors";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import ActionIconLink from "@/components/ui/action-icon-button/ActionIconLink";
import { useAdminNotificationDetails } from "../hooks/use-admin-notifications";
import {
  getAdminNotificationStatusTone,
  getDeliveryAttemptTone,
} from "../lib/admin-notification-status";
import {
  DetailField,
  formatAdminNotificationDateTime,
} from "./admin-notification-utils";
import type { AdminNotificationDetailItem } from "../types/admin-notifications.types";

function OperationalCard({
  label,
  title,
}: {
  label: string;
  title: string;
}) {
  return (
    <div className="rounded-[24px] border border-border-light bg-surface-primary px-4 py-4 dark:border-white/8 dark:bg-white/5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">{title}</p>
    </div>
  );
}

function getNotificationOperationalState(item: AdminNotificationDetailItem) {
  if (item.status === "SUPPRESSED" || item.suppressedReason) return "suppressed" as const;
  if (item.status === "FAILED") return "failed" as const;
  if (item.status === "CANCELLED") return "cancelled" as const;
  if (item.status === "DELIVERED" || item.status === "READ") return "delivered" as const;
  if (item.status === "SENT") return "sent" as const;
  return "pending" as const;
}

function getNotificationAttemptState(item: AdminNotificationDetailItem) {
  if (item.attempts.length === 0) return "none" as const;
  if (item.attempts.some((attempt) => attempt.status === "FAILED")) return "failed" as const;
  if (item.attempts.some((attempt) => attempt.status === "DELIVERED")) return "delivered" as const;
  return "recorded" as const;
}

function OperationalSnapshot({
  item,
  t,
}: {
  item: AdminNotificationDetailItem;
  t: ReturnType<typeof useTranslations>;
}) {
  const lifecycleState = getNotificationOperationalState(item);
  const attemptsState = getNotificationAttemptState(item);

  return (
    <section className="app-panel rounded-[28px] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("notifications.sections.snapshot")}
          </h2>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <OperationalCard
          label={t("notifications.snapshotCards.lifecycle.label")}
          title={t(`notifications.snapshotCards.lifecycle.states.${lifecycleState}.title` as Parameters<typeof t>[0])}
        />
        <OperationalCard
          label={t("notifications.snapshotCards.attempts.label")}
          title={t(`notifications.snapshotCards.attempts.states.${attemptsState}.title` as Parameters<typeof t>[0])}
        />
        <OperationalCard
          label={t("notifications.snapshotCards.controls.label")}
          title={t("notifications.snapshotCards.controls.visibility.title")}
        />
      </div>
    </section>
  );
}

export default function AdminNotificationDetailScreen({
  notificationId,
}: {
  notificationId: string;
}) {
  const t = useTranslations("admin-notifications");
  const locale = useLocale();
  const notification = useAdminNotificationDetails(notificationId);
  const item = notification.data?.item;

  if (notification.isLoading) {
    return <ListStateSkeleton items={4} heightClass="h-28" />;
  }

  if (notification.isError) {
    const error = notification.error;
    const isNotFound = isAppError(error) && error.errorType === "NOT_FOUND";

    return (
      <StateCard
        icon={<BellRing className="h-5 w-5 text-primary" />}
        title={
          isNotFound
            ? t("notifications.states.notFound.heading")
            : t("notifications.states.detailError.heading")
        }
        note={
          isNotFound
            ? t("notifications.states.notFound.note")
            : t("notifications.states.detailError.note")
        }
        action={{
          label: isNotFound
            ? t("notifications.detail.back")
            : t("notifications.states.detailError.retry"),
          href: isNotFound ? (
            <Link
              href="/admin/notifications"
              className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
            >
              {t("notifications.detail.back")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => notification.refetch()}
              className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
            >
              {t("notifications.states.detailError.retry")}
            </button>
          ),
        }}
        className="rounded-[28px]"
      />
    );
  }

  if (!item) return null;

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[32px] p-6 sm:p-7">
        <ActionIconLink
          href="/admin/notifications"
          intent="view"
          label={t("notifications.detail.back")}
          icon={<ArrowRight className="h-4 w-4 rtl:rotate-180" />}
        />
        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("notifications.detail.eyebrow")}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95">
              {t("notifications.detail.title")}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getAdminNotificationStatusTone(
                item.status,
              )}`}
            >
              {t(`notifications.statuses.${item.status}` as Parameters<typeof t>[0])}
            </span>
            <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
              {t(`notifications.channels.${item.channel}` as Parameters<typeof t>[0])}
            </span>
            <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
              {t(`notifications.categories.${item.category}` as Parameters<typeof t>[0])}
            </span>
          </div>
        </div>
      </section>

      <OperationalSnapshot item={item} t={t} />

      {item.suppressedReason ? (
        <section className="rounded-[28px] border border-rose-200 bg-rose-50/80 px-5 py-4 dark:border-rose-500/20 dark:bg-rose-500/10">
          <h2 className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            {t("notifications.sections.suppression")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-rose-700/90 dark:text-rose-200">
            {item.suppressedReason}
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="app-panel rounded-[28px] p-5">
          <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("notifications.sections.summary")}
          </h2>
          <div className="mt-4 grid gap-3">
            <DetailField label={t("notifications.fields.typeSlug")} value={item.typeSlug} />
            <DetailField label={t("notifications.fields.userId")} value={item.userId} />
            <DetailField
              label={t("notifications.fields.locale")}
              value={item.locale ?? t("notifications.fallback.noValue")}
            />
            <DetailField
              label={t("notifications.fields.scheduledFor")}
              value={formatAdminNotificationDateTime(item.scheduledFor, locale)}
            />
            <DetailField
              label={t("notifications.fields.sentAt")}
              value={formatAdminNotificationDateTime(item.sentAt, locale)}
            />
            <DetailField
              label={t("notifications.fields.failedAt")}
              value={formatAdminNotificationDateTime(item.failedAt, locale)}
            />
            <DetailField
              label={t("notifications.fields.createdAt")}
              value={formatAdminNotificationDateTime(item.createdAt, locale)}
            />
            <DetailField
              label={t("notifications.fields.updatedAt")}
              value={formatAdminNotificationDateTime(item.updatedAt, locale)}
            />
          </div>
        </div>

        <div className="app-panel rounded-[28px] p-5">
          <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("notifications.sections.related")}
          </h2>
          <div className="mt-4 grid gap-3">
            <DetailField
              label={t("notifications.fields.relatedEntityType")}
              value={item.relatedEntityType ?? t("notifications.fallback.noValue")}
            />
            <DetailField
              label={t("notifications.fields.relatedEntityId")}
              value={item.relatedEntityId ?? t("notifications.fallback.noValue")}
            />
            <DetailField
              label={t("notifications.fields.titleSnapshot")}
              value={item.titleSnapshot ?? t("notifications.fallback.noSnapshot")}
            />
            <DetailField
              label={t("notifications.fields.subjectSnapshot")}
              value={item.subjectSnapshot ?? t("notifications.fallback.noSnapshot")}
            />
          </div>
        </div>
      </section>

      <section className="app-panel rounded-[28px] p-5">
        <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
          {t("notifications.sections.body")}
        </h2>
        <div className="mt-4 rounded-[24px] bg-surface-secondary px-4 py-4 dark:bg-white/5">
          <p className="whitespace-pre-wrap text-sm leading-7 text-text-secondary">
            {item.bodySnapshot ?? t("notifications.fallback.noSnapshot")}
          </p>
        </div>
      </section>

      <section className="app-panel rounded-[28px] p-5">
        <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
          {t("notifications.sections.attempts")}
        </h2>

        {item.attempts.length > 0 ? (
          <div className="mt-3 space-y-3">
            {item.attempts.map((attempt) => (
              <article
                key={attempt.id}
                className="rounded-[24px] border border-border-light bg-surface-primary px-4 py-4 dark:bg-white/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                      {t("notifications.detail.attemptLabel", {
                        value: attempt.attemptNumber,
                      })}
                    </p>
                    <p className={`mt-1 text-xs font-medium ${getDeliveryAttemptTone(attempt.status)}`}>
                      {t(`notifications.deliveryStatuses.${attempt.status}` as Parameters<typeof t>[0])}
                    </p>
                  </div>
                  <p className="text-xs text-text-muted">
                    {formatAdminNotificationDateTime(attempt.attemptedAt, locale)}
                  </p>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <DetailField
                    label={t("notifications.fields.provider")}
                    value={attempt.provider ?? t("notifications.fallback.noValue")}
                  />
                  <DetailField
                    label={t("notifications.fields.errorCode")}
                    value={attempt.errorCode ?? t("notifications.fallback.noValue")}
                  />
                </div>

                {attempt.errorMessage ? (
                  <p className="mt-3 text-sm leading-6 text-text-secondary">
                    {attempt.errorMessage}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <StateCard
              title={t("notifications.states.noAttempts.heading")}
              note={t("notifications.states.noAttempts.note")}
            />
          </div>
        )}
      </section>
    </div>
  );
}
