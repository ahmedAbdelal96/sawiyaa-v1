"use client";

import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, GitMerge, Hourglass } from "lucide-react";
import type {
  AdminSessionInspectorMeetingBounds,
  AdminSessionInspectorOverlapSummary,
} from "../types/admin-session-runtime.types";
import {
  formatDurationSeconds,
  formatInspectorDateTime,
} from "../lib/inspector-utils";

export default function AdminSessionInspectorOverlapCard({
  overlap,
  meeting,
}: {
  overlap: AdminSessionInspectorOverlapSummary;
  meeting: AdminSessionInspectorMeetingBounds;
}) {
  const t = useTranslations("admin-session-runtime");
  const locale = useLocale();

  const confidenceFlags = overlap.confidenceFlags ?? [];
  const hasUnreliableFlag = confidenceFlags.includes(
    "UNRELIABLE_OVERLAP_OPEN_INTERVAL",
  );

  const minutes = formatDurationSeconds(
    Math.max(0, (overlap.overlapMinutes ?? 0) * 60),
    locale,
  );

  return (
    <section className="grid gap-5 md:grid-cols-2">
      <article className="app-panel rounded-[28px] p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light">
            <GitMerge className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
              {t("inspector.overlap.title")}
            </h2>
            <p className="text-xs text-text-secondary">
              {t("inspector.overlap.subtitle")}
            </p>
          </div>
        </div>

        {hasUnreliableFlag ? (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{t("inspector.overlap.unreliableWarning")}</p>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border-light p-3 dark:border-white/8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("inspector.overlap.minutes")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-text-primary dark:text-white/95">
              {minutes.value}
              <span className="ms-1 text-sm font-normal text-text-muted">
                {minutes.unit}
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-border-light p-3 dark:border-white/8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("inspector.overlap.hasMeaningfulOverlap")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-text-primary dark:text-white/95">
              {overlap.hasMeaningfulOverlap
                ? t("inspector.overlap.yes")
                : t("inspector.overlap.no")}
            </p>
          </div>
        </div>
      </article>

      <article className="app-panel rounded-[28px] p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
            <Hourglass className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
              {t("inspector.meeting.title")}
            </h2>
            <p className="text-xs text-text-secondary">
              {t("inspector.meeting.subtitle")}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("inspector.meeting.startedAt")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
              {formatInspectorDateTime(meeting.meetingStartedAt, locale)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("inspector.meeting.endedAt")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
              {formatInspectorDateTime(meeting.meetingEndedAt, locale)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("inspector.meeting.firstJoinedAt")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
              {formatInspectorDateTime(
                meeting.firstAnyParticipantJoinedAt,
                locale,
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("inspector.meeting.lastLeftAt")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/95">
              {formatInspectorDateTime(
                meeting.lastAnyParticipantLeftAt,
                locale,
              )}
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
