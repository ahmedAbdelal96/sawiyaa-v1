"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { AdminSessionInspectorEvidenceFlags } from "../types/admin-session-runtime.types";

type FlagGroup = {
  key: "timing" | "attendance" | "technical" | "quality";
  titleKey: string;
  items: string[];
};

function pickGroup(
  evidence: AdminSessionInspectorEvidenceFlags,
): FlagGroup[] {
  const timing: string[] = [];
  if (evidence.hasOpenIntervalsWithoutCloseBoundary) {
    timing.push("OPEN_INTERVAL_WITHOUT_CLOSE_BOUNDARY");
  }

  const attendance: string[] = [];
  if (evidence.hasOnlyPatientJoined) attendance.push("ONLY_PATIENT_JOINED");
  if (evidence.hasOnlyPractitionerJoined)
    attendance.push("ONLY_PRACTITIONER_JOINED");
  if (evidence.hasNoParticipants) attendance.push("NO_PARTICIPANTS");
  if (evidence.hasReconnects) attendance.push("RECONNECTS_PRESENT");
  if (evidence.hasMissingJoinEvent) attendance.push("MISSING_JOIN_EVENT");
  if (evidence.hasMissingLeaveEvent) attendance.push("MISSING_LEAVE_EVENT");

  const technical: string[] = [];
  if (evidence.hasTechnicalRisk) technical.push("TECHNICAL_RISK_DETECTED");
  if (evidence.hasPrematureDecisionRisk)
    technical.push("PREMATURE_DECISION_RISK");
  if (evidence.hasDuplicateLikeJoinEvents)
    technical.push("DUPLICATE_LIKE_JOIN_EVENTS");

  const quality: string[] = [];
  if (evidence.hasOutOfOrderEvents) quality.push("OUT_OF_ORDER_EVENTS");
  if (evidence.unknownParticipantEventCount > 0)
    quality.push("UNKNOWN_PARTICIPANT_EVENTS");

  return [
    { key: "timing", titleKey: "inspector.evidence.groups.timing", items: timing },
    {
      key: "attendance",
      titleKey: "inspector.evidence.groups.attendance",
      items: attendance,
    },
    {
      key: "technical",
      titleKey: "inspector.evidence.groups.technical",
      items: technical,
    },
    { key: "quality", titleKey: "inspector.evidence.groups.quality", items: quality },
  ];
}

export default function AdminSessionInspectorEvidenceFlagsPanel({
  evidence,
}: {
  evidence: AdminSessionInspectorEvidenceFlags;
}) {
  const t = useTranslations("admin-session-runtime");
  const groups = pickGroup(evidence);
  const totalFlags = groups.reduce((sum, g) => sum + g.items.length, 0);
  const hasAny = totalFlags > 0;

  return (
    <section className="app-panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${
              hasAny
                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            }`}
          >
            {hasAny ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
          </span>
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
              {t("inspector.evidence.title")}
            </h2>
            <p className="text-xs text-text-secondary">
              {t("inspector.evidence.subtitle")}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-surface-tertiary px-2.5 py-1 text-[11px] font-semibold text-text-muted dark:bg-white/10 dark:text-white/80">
          {hasAny
            ? `${t("inspector.evidence.totalFlags")}: ${totalFlags}`
            : t("inspector.evidence.noFlags")}
        </span>
      </div>

      {hasAny ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {groups.map((group) =>
            group.items.length === 0 ? null : (
              <div
                key={group.key}
                className="rounded-2xl border border-border-light p-3 dark:border-white/8"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t(group.titleKey as Parameters<typeof t>[0])}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {group.items.map((flag) => (
                    <li
                      key={flag}
                      className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                    >
                      {t(
                        `inspector.riskFlagLookup.${flag}` as Parameters<typeof t>[0],
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}
