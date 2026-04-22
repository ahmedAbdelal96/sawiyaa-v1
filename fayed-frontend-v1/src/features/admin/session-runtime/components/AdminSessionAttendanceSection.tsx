"use client";

import { useLocale, useTranslations } from "next-intl";
import { Activity, Clock3, ListTree, UserRound } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { getAdminSessionAttendanceErrorKey } from "../lib/admin-session-runtime-errors";
import { useAdminSessionAttendance } from "../hooks/use-admin-session-runtime";
import type {
  AdminSessionAttendanceParticipantRole,
  AdminSessionAttendanceTimelineItem,
} from "../types/admin-session-runtime.types";

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function SummaryLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-light py-3 last:border-b-0 dark:border-white/8">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span className="text-sm text-text-primary dark:text-white/90">{value}</span>
    </div>
  );
}

function participantToneClass(role: AdminSessionAttendanceParticipantRole) {
  if (role === "PATIENT") {
    return "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light";
  }
  if (role === "PRACTITIONER") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
  }
  return "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-white/70";
}

function eventToneClass(type: "JOINED" | "LEFT") {
  if (type === "JOINED") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
  }
  return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
}

function TimelineItem({
  item,
  locale,
}: {
  item: AdminSessionAttendanceTimelineItem;
  locale: string;
}) {
  const t = useTranslations("admin-session-runtime");

  return (
    <article className="rounded-2xl border border-border-light px-4 py-3 dark:border-white/8">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${eventToneClass(item.attendanceEventType)}`}
        >
          {t(`attendance.timeline.eventTypes.${item.attendanceEventType}` as Parameters<typeof t>[0])}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${participantToneClass(item.participantRole)}`}
        >
          {t(`attendance.timeline.participantRoles.${item.participantRole}` as Parameters<typeof t>[0])}
        </span>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-2">
        <p>
          <span className="font-semibold text-text-primary dark:text-white/90">
            {t("attendance.timeline.fields.occurredAt")}
          </span>{" "}
          {formatDateTime(item.occurredAt, locale)}
        </p>
        <p>
          <span className="font-semibold text-text-primary dark:text-white/90">
            {t("attendance.timeline.fields.ingestedAt")}
          </span>{" "}
          {formatDateTime(item.ingestedAt, locale)}
        </p>
        <p className="break-all">
          <span className="font-semibold text-text-primary dark:text-white/90">
            {t("attendance.timeline.fields.userId")}
          </span>{" "}
          {item.participant.userId ?? "-"}
        </p>
        <p className="break-all">
          <span className="font-semibold text-text-primary dark:text-white/90">
            {t("attendance.timeline.fields.providerEventType")}
          </span>{" "}
          {item.providerEventType}
        </p>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-medium text-text-muted">
          {t("attendance.timeline.providerDetails")}
        </summary>
        <div className="mt-2 grid gap-1 text-xs text-text-secondary">
          <p className="break-all">
            <span className="font-semibold text-text-primary dark:text-white/90">
              {t("attendance.timeline.fields.provider")}
            </span>{" "}
            {t(`providers.${item.provider}` as Parameters<typeof t>[0])}
          </p>
          <p className="break-all">
            <span className="font-semibold text-text-primary dark:text-white/90">
              {t("attendance.timeline.fields.providerEventRef")}
            </span>{" "}
            {item.providerEventRef ?? "-"}
          </p>
          <p className="break-all">
            <span className="font-semibold text-text-primary dark:text-white/90">
              {t("attendance.timeline.fields.providerRoomRef")}
            </span>{" "}
            {item.providerRoomRef ?? "-"}
          </p>
          <p className="break-all">
            <span className="font-semibold text-text-primary dark:text-white/90">
              {t("attendance.timeline.fields.providerParticipantRef")}
            </span>{" "}
            {item.providerParticipantRef ?? "-"}
          </p>
        </div>
      </details>
    </article>
  );
}

export default function AdminSessionAttendanceSection({
  sessionId,
  enabled,
}: {
  sessionId?: string;
  enabled: boolean;
}) {
  const t = useTranslations("admin-session-runtime");
  const locale = useLocale();
  const attendance = useAdminSessionAttendance(sessionId, enabled);

  if (!sessionId || !enabled) {
    return null;
  }

  if (attendance.isLoading) {
    return (
      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
          {t("attendance.heading")}
        </h2>
        <div className="mt-4">
          <ListStateSkeleton items={2} heightClass="h-24" />
        </div>
      </section>
    );
  }

  if (attendance.isError) {
    return (
      <StateCard
        icon={<Activity className="h-5 w-5 text-primary" />}
        title={t("attendance.states.error.heading")}
        note={t(
          getAdminSessionAttendanceErrorKey(attendance.error) as Parameters<typeof t>[0],
        )}
        action={{
          label: t("attendance.states.error.retry"),
          onClick: () => attendance.refetch(),
        }}
        className="rounded-[28px]"
      />
    );
  }

  if (!attendance.data) {
    return null;
  }

  const { summary, timeline } = attendance.data;

  return (
    <section className="app-panel rounded-[28px] p-5 sm:p-6">
      <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
        {t("attendance.heading")}
      </h2>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className="rounded-[24px] border border-border-light p-4 dark:border-white/8">
          <div className="mb-3 flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("attendance.summary.heading")}
            </h3>
          </div>
          <SummaryLine
            label={t("attendance.summary.fields.patientHasJoined")}
            value={summary.patientHasJoined ? t("labels.yes") : t("labels.no")}
          />
          <SummaryLine
            label={t("attendance.summary.fields.practitionerHasJoined")}
            value={summary.practitionerHasJoined ? t("labels.yes") : t("labels.no")}
          />
          <SummaryLine
            label={t("attendance.summary.fields.patientJoinedAt")}
            value={formatDateTime(summary.patientJoinedAt, locale)}
          />
          <SummaryLine
            label={t("attendance.summary.fields.practitionerJoinedAt")}
            value={formatDateTime(summary.practitionerJoinedAt, locale)}
          />
          <SummaryLine
            label={t("attendance.summary.fields.patientLeftAt")}
            value={formatDateTime(summary.patientLeftAt, locale)}
          />
          <SummaryLine
            label={t("attendance.summary.fields.practitionerLeftAt")}
            value={formatDateTime(summary.practitionerLeftAt, locale)}
          />
          <SummaryLine
            label={t("attendance.summary.fields.firstJoinedAt")}
            value={formatDateTime(summary.firstJoinedAt, locale)}
          />
          <SummaryLine
            label={t("attendance.summary.fields.lastLeftAt")}
            value={formatDateTime(summary.lastLeftAt, locale)}
          />
        </section>

        <section className="rounded-[24px] border border-border-light p-4 dark:border-white/8">
          <div className="mb-3 flex items-center gap-2">
            <ListTree className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("attendance.timeline.heading")}
            </h3>
          </div>

          {timeline.length === 0 ? (
            <StateCard
              icon={<Clock3 className="h-5 w-5 text-primary" />}
              title={t("attendance.states.empty.heading")}
              note={t("attendance.states.empty.note")}
              className="rounded-2xl border border-dashed border-border-light bg-surface-secondary/50 p-6 dark:border-white/10 dark:bg-white/5"
            />
          ) : (
            <div className="space-y-3">
              {timeline.map((item) => (
                <TimelineItem key={item.id} item={item} locale={locale} />
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
