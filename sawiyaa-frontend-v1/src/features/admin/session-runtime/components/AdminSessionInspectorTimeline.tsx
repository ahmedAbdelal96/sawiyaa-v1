"use client";

import { useLocale, useTranslations } from "next-intl";
import { Clock, Info, LogIn, LogOut, ShieldAlert } from "lucide-react";
import type {
  AdminSessionAttendanceTimelineItem,
  AdminSessionEvidenceActorRole,
  AdminSessionEvidenceTimelineItem,
} from "../types/admin-session-runtime.types";
import { formatInspectorDateTime } from "../lib/inspector-utils";

// =============================================================================
// Legacy attendance-only row (kept for backward compatibility)
// =============================================================================

function AttendanceTimelineRow({
  event,
  locale,
  patientLabel,
  practitionerLabel,
  unknownLabel,
  joinedLabel,
  leftLabel,
  providerLabel,
  providerEventTypeLabel,
  providerParticipantRefLabel,
  providerRoomRefLabel,
  providerEventRefLabel,
}: {
  event: AdminSessionAttendanceTimelineItem;
  locale: string;
  patientLabel: string;
  practitionerLabel: string;
  unknownLabel: string;
  joinedLabel: string;
  leftLabel: string;
  providerLabel: string;
  providerEventTypeLabel: string;
  providerParticipantRefLabel: string;
  providerRoomRefLabel: string;
  providerEventRefLabel: string;
}) {
  const t = useTranslations("admin-session-runtime");
  const isJoin = event.attendanceEventType === "JOINED";
  const roleLabel =
    event.participantRole === "PATIENT"
      ? patientLabel
      : event.participantRole === "PRACTITIONER"
        ? practitionerLabel
        : unknownLabel;
  const actionLabel = isJoin ? joinedLabel : leftLabel;
  const accent = isJoin
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
    : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";

  const showProviderRefs =
    event.providerEventRef || event.providerRoomRef || event.providerParticipantRef;

  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border-light p-3 dark:border-white/8">
      <span
        className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl ${accent}`}
      >
        {isJoin ? (
          <LogIn className="h-4 w-4" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-text-primary dark:text-white/95">
            {roleLabel} · {actionLabel}
          </p>
          <span className="font-mono text-[11px] text-text-secondary">
            {formatInspectorDateTime(event.occurredAt, locale)}
          </span>
        </div>
        <details className="mt-2 group">
          <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("inspector.timeline.subtitle")}
          </summary>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 border-b border-border-light py-1.5 dark:border-white/8">
              <span className="text-[11px] text-text-muted">{providerLabel}</span>
              <span className="text-xs font-semibold text-text-primary dark:text-white/95">
                {event.provider}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border-light py-1.5 dark:border-white/8">
              <span className="text-[11px] text-text-muted">{providerEventTypeLabel}</span>
              <span className="font-mono text-[11px] text-text-secondary">
                {event.providerEventType}
              </span>
            </div>
            {event.providerParticipantRef ? (
              <div className="flex items-center justify-between gap-3 border-b border-border-light py-1.5 dark:border-white/8">
                <span className="text-[11px] text-text-muted">
                  {providerParticipantRefLabel}
                </span>
                <span className="font-mono text-[11px] text-text-secondary break-all">
                  {event.providerParticipantRef}
                </span>
              </div>
            ) : null}
            {event.providerRoomRef ? (
              <div className="flex items-center justify-between gap-3 border-b border-border-light py-1.5 dark:border-white/8">
                <span className="text-[11px] text-text-muted">
                  {providerRoomRefLabel}
                </span>
                <span className="font-mono text-[11px] text-text-secondary break-all">
                  {event.providerRoomRef}
                </span>
              </div>
            ) : null}
            {event.providerEventRef ? (
              <div className="flex items-center justify-between gap-3 border-b border-border-light py-1.5 dark:border-white/8">
                <span className="text-[11px] text-text-muted">
                  {providerEventRefLabel}
                </span>
                <span className="font-mono text-[11px] text-text-secondary break-all">
                  {event.providerEventRef}
                </span>
              </div>
            ) : null}
            {showProviderRefs ? null : (
              <p className="text-[11px] text-text-muted sm:col-span-2">
                {t("inspector.timeline.platformNote")}
              </p>
            )}
          </div>
        </details>
      </div>
    </li>
  );
}

// =============================================================================
// Unified evidence row (Phase 3)
// =============================================================================

const SEVERITY_ACCENT: Record<
  "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "NEUTRAL",
  string
> = {
  SUCCESS:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  WARNING:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  ERROR: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  INFO: "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light",
  NEUTRAL:
    "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70",
};

function EvidenceTimelineRow({
  item,
  roleLabels,
  eventLabels,
  sourceLabels,
  severityLabels,
  metaLabels,
  unknownEventLabel,
}: {
  item: AdminSessionEvidenceTimelineItem;
  roleLabels: Record<AdminSessionEvidenceActorRole, string>;
  eventLabels: Record<string, string>;
  sourceLabels: Record<"PLATFORM" | "DAILY_WEBHOOK" | "SYSTEM", string>;
  severityLabels: Record<
    "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "NEUTRAL",
    string
  >;
  metaLabels: {
    recordedAt: string;
    actor: string;
    safeMetadata: string;
  };
  unknownEventLabel: string;
}) {
  const locale = useLocale();
  const t = useTranslations("admin-session-runtime");
  const accent = SEVERITY_ACCENT[item.severity] ?? SEVERITY_ACCENT.NEUTRAL;
  const roleLabel = roleLabels[item.actorRole] ?? roleLabels.UNKNOWN;
  const eventLabel =
    eventLabels[item.titleKey] ?? unknownEventLabel;
  const displayName = item.actorDisplayName?.trim() || roleLabel;
  const summary = item.safeMetadataSummary ?? {};

  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border-light p-3 dark:border-white/8">
      <span
        className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl ${accent}`}
      >
        {item.severity === "ERROR" || item.severity === "WARNING" ? (
          <ShieldAlert className="h-4 w-4" />
        ) : item.kind === "PLATFORM" ? (
          <Info className="h-4 w-4" />
        ) : item.eventType === "JOINED" ? (
          <LogIn className="h-4 w-4" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-text-primary dark:text-white/95">
            {displayName} · {eventLabel}
          </p>
          <span className="font-mono text-[11px] text-text-secondary">
            {formatInspectorDateTime(item.occurredAt, locale)}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${accent}`}
          >
            {severityLabels[item.severity] ?? item.severity}
          </span>
          <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] font-semibold text-text-muted dark:bg-white/10 dark:text-white/80">
            {sourceLabels[item.source] ?? item.source}
          </span>
        </div>
        {Object.keys(summary).length > 0 ? (
          <details className="mt-2 group">
            <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              {metaLabels.safeMetadata}
            </summary>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 border-b border-border-light py-1.5 dark:border-white/8">
                <span className="text-[11px] text-text-muted">
                  {metaLabels.recordedAt}
                </span>
                <span className="font-mono text-[11px] text-text-secondary">
                  {formatInspectorDateTime(item.recordedAt, locale)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-border-light py-1.5 dark:border-white/8">
                <span className="text-[11px] text-text-muted">
                  {metaLabels.actor}
                </span>
                <span className="text-[11px] font-semibold text-text-primary dark:text-white/95">
                  {displayName}
                </span>
              </div>
              {Object.entries(summary).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 border-b border-border-light py-1.5 dark:border-white/8"
                >
                  <span className="text-[11px] text-text-muted">{key}</span>
                  <span className="font-mono text-[11px] text-text-secondary break-all">
                    {value === null ? "—" : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </li>
  );
}

// =============================================================================
// Component
// =============================================================================

export default function AdminSessionInspectorTimeline({
  events,
  evidenceTimeline,
  hasEvidenceTimeline,
}: {
  events: AdminSessionAttendanceTimelineItem[];
  evidenceTimeline?: AdminSessionEvidenceTimelineItem[];
  hasEvidenceTimeline?: boolean;
}) {
  const t = useTranslations("admin-session-runtime");
  const locale = useLocale();

  const roleLabels: Record<AdminSessionEvidenceActorRole, string> = {
    PATIENT: t("attendance.timeline.participantRoles.PATIENT"),
    PRACTITIONER: t("attendance.timeline.participantRoles.PRACTITIONER"),
    ADMIN: t("inspector.evidenceTimeline.actorRoles.ADMIN"),
    SYSTEM: t("inspector.evidenceTimeline.actorRoles.SYSTEM"),
    UNKNOWN: t("attendance.timeline.participantRoles.UNKNOWN"),
  };

  const eventLabels: Record<string, string> = {
    JOIN_ATTEMPTED: t("inspector.evidenceTimeline.eventTypes.JOIN_ATTEMPTED"),
    JOIN_ALLOWED: t("inspector.evidenceTimeline.eventTypes.JOIN_ALLOWED"),
    JOIN_BLOCKED: t("inspector.evidenceTimeline.eventTypes.JOIN_BLOCKED"),
    JOIN_TOKEN_ISSUED: t(
      "inspector.evidenceTimeline.eventTypes.JOIN_TOKEN_ISSUED",
    ),
    JOIN_TOKEN_FAILED: t(
      "inspector.evidenceTimeline.eventTypes.JOIN_TOKEN_FAILED",
    ),
    MEETING_STARTED: t("inspector.evidenceTimeline.eventTypes.MEETING_STARTED"),
    MEETING_ENDED: t("inspector.evidenceTimeline.eventTypes.MEETING_ENDED"),
    ATTENDANCE_JOINED: t("inspector.evidenceTimeline.eventTypes.ATTENDANCE_JOINED"),
    ATTENDANCE_LEFT: t("inspector.evidenceTimeline.eventTypes.ATTENDANCE_LEFT"),
  };

  const sourceLabels: Record<
    "PLATFORM" | "DAILY_WEBHOOK" | "SYSTEM",
    string
  > = {
    PLATFORM: t("inspector.evidenceTimeline.sources.PLATFORM"),
    DAILY_WEBHOOK: t("inspector.evidenceTimeline.sources.DAILY_WEBHOOK"),
    SYSTEM: t("inspector.evidenceTimeline.sources.SYSTEM"),
  };

  const severityLabels: Record<
    "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "NEUTRAL",
    string
  > = {
    INFO: t("inspector.evidenceTimeline.severity.INFO"),
    SUCCESS: t("inspector.evidenceTimeline.severity.SUCCESS"),
    WARNING: t("inspector.evidenceTimeline.severity.WARNING"),
    ERROR: t("inspector.evidenceTimeline.severity.ERROR"),
    NEUTRAL: t("inspector.evidenceTimeline.severity.NEUTRAL"),
  };

  const metaLabels = {
    recordedAt: t("inspector.evidenceTimeline.meta.recordedAt"),
    actor: t("inspector.evidenceTimeline.meta.actor"),
    safeMetadata: t("inspector.evidenceTimeline.meta.safeMetadata"),
  };

  // Prefer the unified evidence timeline (Phase 3). Fall back to the
  // attendance-only timeline (Phase 1 / 2).
  const useUnified =
    hasEvidenceTimeline && (evidenceTimeline?.length ?? 0) > 0;
  const sortedEvidenceTimeline: AdminSessionEvidenceTimelineItem[] = useUnified
    ? [...(evidenceTimeline ?? [])].sort(
        (a, b) =>
          new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
      )
    : [];
  const sortedAttendanceTimeline: AdminSessionAttendanceTimelineItem[] = useUnified
    ? []
    : [...events].sort(
        (a, b) =>
          new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
      );

  return (
    <section className="app-panel rounded-[28px] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light">
          <Clock className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
            {t("inspector.timeline.title")}
          </h2>
          <p className="text-xs text-text-secondary">
            {t("inspector.timeline.subtitle")}
          </p>
        </div>
      </div>

      <div
        role="note"
        className="mt-4 flex items-start gap-2 rounded-2xl border border-border-light bg-surface-tertiary/60 p-3 text-xs text-text-secondary dark:border-white/8 dark:bg-white/[0.03]"
      >
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
        <p>
          {useUnified
            ? t("inspector.timeline.noteUnified")
            : t("inspector.timeline.note")}
        </p>
      </div>

      {useUnified
        ? sortedEvidenceTimeline.length === 0
        : sortedAttendanceTimeline.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border-light p-6 text-center dark:border-white/10">
          <p className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("inspector.timeline.empty.heading")}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {t("inspector.timeline.empty.note")}
          </p>
          <p className="mt-2 text-[11px] text-text-muted">
            {t("inspector.timeline.empty.nextStep")}
          </p>
        </div>
      ) : useUnified ? (
        <ol className="mt-4 space-y-2">
          {sortedEvidenceTimeline.map((item) => (
            <EvidenceTimelineRow
              key={item.id}
              item={item}
              roleLabels={roleLabels}
              eventLabels={eventLabels}
              sourceLabels={sourceLabels}
              severityLabels={severityLabels}
              metaLabels={metaLabels}
              unknownEventLabel={t(
                'inspector.evidenceTimeline.eventTypes.UNKNOWN_PLATFORM_EVENT',
              )}
            />
          ))}
        </ol>
      ) : (
        <ol className="mt-4 space-y-2">
          {sortedAttendanceTimeline.map((event) => (
            <AttendanceTimelineRow
              key={event.id}
              event={event}
              locale={locale}
              patientLabel={t("attendance.timeline.participantRoles.PATIENT")}
              practitionerLabel={t(
                "attendance.timeline.participantRoles.PRACTITIONER",
              )}
              unknownLabel={t("attendance.timeline.participantRoles.UNKNOWN")}
              joinedLabel={t("attendance.timeline.eventTypes.JOINED")}
              leftLabel={t("attendance.timeline.eventTypes.LEFT")}
              providerLabel={t("inspector.timeline.fields.provider")}
              providerEventTypeLabel={t(
                "inspector.timeline.fields.providerEventType",
              )}
              providerParticipantRefLabel={t(
                "inspector.timeline.fields.providerParticipantRef",
              )}
              providerRoomRefLabel={t(
                "inspector.timeline.fields.providerRoomRef",
              )}
              providerEventRefLabel={t(
                "inspector.timeline.fields.providerEventRef",
              )}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
