"use client";

import { useLocale, useTranslations } from "next-intl";
import { FileSearch } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { isAppError } from "@/lib/api/errors";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import ActionIconLink from "@/components/ui/action-icon-button/ActionIconLink";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import { formatAdminNotificationDateTime } from "@/features/admin/notifications/components/admin-notification-utils";
import { useAdminAuditEventDetails } from "../hooks/use-admin-audit";

function FieldCard({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-secondary px-4 py-3 dark:bg-white/5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className={`mt-1 break-all text-sm font-medium text-text-primary dark:text-white/90 ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function SnapshotBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-secondary p-4 dark:bg-white/5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-text-primary dark:text-white/90">{value}</p>
    </div>
  );
}

function BadgeValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-secondary px-4 py-3 dark:bg-white/5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 inline-flex rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
        {value}
      </p>
    </div>
  );
}

export default function AdminAuditEventDetailScreen({ eventId }: { eventId: string }) {
  const t = useTranslations("admin-audit");
  const locale = useLocale();
  const eventQuery = useAdminAuditEventDetails(eventId);
  const item = eventQuery.data?.item;

  if (eventQuery.isLoading) {
    return <ListStateSkeleton items={4} heightClass="h-28" />;
  }

  if (eventQuery.isError) {
    const error = eventQuery.error;
    const isNotFound = isAppError(error) && error.errorType === "NOT_FOUND";

    return (
      <StateCard
        icon={<FileSearch className="h-5 w-5 text-primary" />}
        title={isNotFound ? t("audit.states.notFound.heading") : t("audit.states.detailError.heading")}
        note={isNotFound ? t("audit.states.notFound.note") : t("audit.states.detailError.note")}
        action={{
          label: isNotFound ? t("audit.detail.back") : t("audit.states.detailError.retry"),
          href: isNotFound ? (
            <Link
              href="/admin/audit"
              className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
            >
              {t("audit.detail.back")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => eventQuery.refetch()}
              className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
            >
              {t("audit.states.detailError.retry")}
            </button>
          ),
        }}
        className="rounded-[28px]"
      />
    );
  }

  if (!item) return null;

  const noValue = t("audit.fallback.noValue");

  return (
    <div className="space-y-5">
      <section className="app-panel rounded-[30px] p-6 sm:p-7">
        <ActionIconLink
          href="/admin/audit"
          intent="view"
          label={t("audit.detail.back")}
          icon={<DirectionalArrowIcon direction="back" className="h-4 w-4" />}
        />
        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("audit.detail.eyebrow")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95">
          {t("audit.detail.title")}
        </h1>
        <p className="mt-2 break-all text-sm text-text-muted">
          {item.action}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BadgeValue label={t("audit.fields.status")} value={item.status} />
        <BadgeValue label={t("audit.fields.severity")} value={item.severity} />
        <BadgeValue label={t("audit.fields.category")} value={item.category} />
        <BadgeValue label={t("audit.fields.source")} value={item.source} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="app-panel rounded-[28px] p-5">
          <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("audit.sections.event")}
          </h2>
          <div className="mt-4 grid gap-3">
            <FieldCard label={t("audit.fields.action")} value={item.action} />
            <FieldCard label={t("audit.fields.eventFamily")} value={item.eventFamily} />
            <FieldCard
              label={t("audit.fields.occurredAt")}
              value={formatAdminNotificationDateTime(item.occurredAt, locale)}
            />
          </div>
        </div>

        <div className="app-panel rounded-[28px] p-5">
          <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("audit.sections.actorTarget")}
          </h2>
          <div className="mt-4 grid gap-3">
            <FieldCard label={t("audit.fields.actorName")} value={item.actor.displayName ?? noValue} />
            <FieldCard label={t("audit.fields.actorRole")} value={item.actor.role ?? noValue} />
            <FieldCard label={t("audit.fields.actorUserId")} value={item.actor.userId ?? noValue} mono />
          </div>
        </div>

        <div className="app-panel rounded-[28px] p-5">
          <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("audit.fields.targetType")}
          </h2>
          <div className="mt-4 grid gap-3">
            <FieldCard label={t("audit.fields.targetType")} value={item.target.entityType ?? noValue} />
            <FieldCard label={t("audit.fields.targetId")} value={item.target.entityId ?? noValue} mono />
            <FieldCard
              label={t("audit.fields.createdAt")}
              value={formatAdminNotificationDateTime(item.createdAt, locale)}
            />
            <FieldCard
              label={t("audit.fields.updatedAt")}
              value={formatAdminNotificationDateTime(item.updatedAt, locale)}
            />
          </div>
        </div>
      </section>

      <section className="app-panel rounded-[28px] p-5">
        <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">{t("audit.sections.snapshots")}</h2>
        <div className="mt-4 grid gap-3">
          <SnapshotBlock label={t("audit.fields.titleSnapshot")} value={item.titleSnapshot ?? noValue} />
          <SnapshotBlock label={t("audit.fields.subjectSnapshot")} value={item.subjectSnapshot ?? noValue} />
          <SnapshotBlock label={t("audit.fields.bodySnapshot")} value={item.bodySnapshot ?? noValue} />
          <SnapshotBlock label={t("audit.fields.suppressedReason")} value={item.suppressedReason ?? noValue} />
        </div>
      </section>
    </div>
  );
}
