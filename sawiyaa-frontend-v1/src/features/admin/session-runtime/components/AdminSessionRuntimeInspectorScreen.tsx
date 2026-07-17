"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Activity,
  ArrowLeft,
  Database,
  MonitorPlay,
  Radar,
  ShieldCheck,
} from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { getAdminSessionAttendanceErrorKey } from "../lib/admin-session-runtime-errors";
import {
  useAdminSessionAttendance,
  useAdminSessionRuntimeInspection,
} from "../hooks/use-admin-session-runtime";
import {
  useAdminSessionManualDecisions,
} from "../hooks/use-admin-session-manual-decisions";
import { PermissionKey } from "@/lib/auth/permissions";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";
import AdminSessionInspectorCaseSummary from "./AdminSessionInspectorCaseSummary";
import AdminSessionInspectorEvidenceFlagsPanel from "./AdminSessionInspectorEvidenceFlagsPanel";
import AdminSessionInspectorOverlapCard from "./AdminSessionInspectorOverlapCard";
import AdminSessionInspectorRawEvidence from "./AdminSessionInspectorRawEvidence";
import AdminSessionInspectorRecommendationPanel from "./AdminSessionInspectorRecommendationPanel";
import AdminSessionInspectorRoleCard from "./AdminSessionInspectorRoleCard";
import AdminSessionRoomCloseEvidencePanel from "./AdminSessionRoomCloseEvidencePanel";
import AdminSessionInspectorTimeline from "./AdminSessionInspectorTimeline";
import AdminSessionManualDecisionHistory from "./AdminSessionManualDecisionHistory";
import AdminSessionPackageEntitlementPanel from "./AdminSessionPackageEntitlementPanel";
import AdminSessionManualDecisionPanel from "./AdminSessionManualDecisionPanel";
import { OUTCOME_TONE, type OutcomeTone } from "../lib/inspector-utils";
import type { AdminSessionStatus } from "../types/admin-session-runtime.types";

const STATUS_STYLES: Partial<Record<AdminSessionStatus, string>> = {
  PENDING_PAYMENT:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  UPCOMING:
    "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light",
  READY_TO_JOIN:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  IN_PROGRESS:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  COMPLETED: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70",
  CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  PATIENT_NO_SHOW: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  PRACTITIONER_NO_SHOW:
    "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  BOTH_NO_SHOW:
    "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  AWAITING_COMPLETION_CONFIRMATION:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

function pickRiskCount(evidence: {
  hasOpenIntervalsWithoutCloseBoundary: boolean;
  hasOnlyPatientJoined: boolean;
  hasOnlyPractitionerJoined: boolean;
  hasNoParticipants: boolean;
  hasReconnects: boolean;
  hasMissingJoinEvent: boolean;
  hasMissingLeaveEvent: boolean;
  hasTechnicalRisk: boolean;
  hasPrematureDecisionRisk: boolean;
  hasDuplicateLikeJoinEvents: boolean;
  hasOutOfOrderEvents: boolean;
  unknownParticipantEventCount: number;
}): number {
  let n = 0;
  if (evidence.hasOpenIntervalsWithoutCloseBoundary) n++;
  if (evidence.hasOnlyPatientJoined) n++;
  if (evidence.hasOnlyPractitionerJoined) n++;
  if (evidence.hasNoParticipants) n++;
  if (evidence.hasReconnects) n++;
  if (evidence.hasMissingJoinEvent) n++;
  if (evidence.hasMissingLeaveEvent) n++;
  if (evidence.hasTechnicalRisk) n++;
  if (evidence.hasPrematureDecisionRisk) n++;
  if (evidence.hasDuplicateLikeJoinEvents) n++;
  if (evidence.hasOutOfOrderEvents) n++;
  if (evidence.unknownParticipantEventCount > 0) n++;
  return n;
}

export default function AdminSessionRuntimeInspectorScreen({
  initialSessionId,
}: {
  initialSessionId?: string;
}) {
  const t = useTranslations("admin-session-runtime");
  const locale = useLocale();
  const [sessionId, setSessionId] = useState(initialSessionId ?? "");
  const [submittedId, setSubmittedId] = useState(initialSessionId ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  const inspection = useAdminSessionRuntimeInspection(
    submittedId,
  );
  const attendance = useAdminSessionAttendance(
    submittedId,
  );

  // Phase 4B — decisions list + permission check
  const decisions = useAdminSessionManualDecisions(submittedId);
  const { data: permissionData } = useCurrentUserPermissions(true);
  const hasWritePermission = Boolean(
    permissionData?.permissions?.includes(PermissionKey.SESSIONS_MANUAL_DECISIONS_WRITE),
  );
  const decisionItems = decisions.data?.items ?? [];
  const latestFinal = decisionItems.find((d: { isFinal: boolean }) => d.isFinal) ?? null;
  const hasExistingFinal = latestFinal !== null;

  const item = inspection.data?.item;
  const extended = attendance.data?.extendedSummary ?? null;
  const timeline = attendance.data?.timeline ?? [];
  // Phase 3 — prefer the unified evidence timeline; fall back to the
  // attendance-only timeline. Use the inspection participants first, then
  // attendance participants (whichever loaded first).
  const evidenceTimeline = attendance.data?.evidenceTimeline ?? [];
  const inspectorParticipants =
    item?.participants ?? attendance.data?.participants ?? null;
  const patientName = inspectorParticipants?.patient.displayName ?? null;
  const practitionerName =
    inspectorParticipants?.practitioner.displayName ?? null;
  const hasEvidenceTimeline =
    (attendance.data?.evidenceTimeline?.length ?? 0) > 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = sessionId.trim();
    if (!trimmed) {
      setLocalError(t("states.empty.heading"));
      setSubmittedId("");
      return;
    }
    setLocalError(null);
    setSubmittedId(trimmed);
  };

  const isLoading = inspection.isLoading || attendance.isLoading;
  const isError = inspection.isError || attendance.isError;

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[32px] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t("inspector.page.eyebrow")}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("inspector.page.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              {t("inspector.page.subtitle")}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <ShieldCheck className="h-3 w-3" />
              {t("inspector.page.advisoryNotice")}
            </span>
            {item ? (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  STATUS_STYLES[item.status] ??
                  "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/70"
                }`}
              >
                {t(`statuses.${item.status}` as Parameters<typeof t>[0])}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
              {t("inspector.lookup.heading")}
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              {t("inspector.lookup.helper")}
            </p>
          </div>
          <Link
            href="/admin/sessions/runtime-inspection"
            className="inline-flex items-center gap-2 rounded-full border border-border-light px-4 py-2 text-xs font-semibold text-text-secondary transition hover:border-primary/30 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            {t("lookup.backToReadiness")}
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <label className="flex-1">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("inspector.lookup.fieldLabel")}
            </span>
            <input
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              placeholder={t("inspector.lookup.placeholder")}
              className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <Radar className="h-4 w-4" />
            {t("inspector.lookup.submit")}
          </button>
        </form>

        {localError ? (
          <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
            {localError}
          </p>
        ) : null}
      </section>

      {!submittedId ? (
        <StateCard
          icon={<MonitorPlay className="h-5 w-5 text-primary" />}
          title={t("states.empty.heading")}
          note={t("states.empty.note")}
          className="rounded-[28px] p-8"
        />
      ) : isLoading ? (
        <ListStateSkeleton items={3} heightClass="h-28" />
      ) : isError ? (
        <StateCard
          icon={<Activity className="h-5 w-5 text-primary" />}
          title={t("states.error.heading")}
          note={t(
            getAdminSessionAttendanceErrorKey(
              attendance.error ?? inspection.error,
            ) as Parameters<typeof t>[0],
          )}
          action={{
            label: t("states.error.retry"),
            onClick: () => {
              inspection.refetch();
              attendance.refetch();
            },
          }}
          className="rounded-[28px]"
        />
      ) : !item ? (
        <StateCard
          icon={<MonitorPlay className="h-5 w-5 text-primary" />}
          title={t("states.notFound.heading")}
          note={t("states.notFound.note")}
          className="rounded-[28px] p-8"
        />
      ) : !extended ? (
        <StateCard
          icon={<Database className="h-5 w-5 text-primary" />}
          title={t("inspector.emptyExtended.title")}
          note={t("inspector.emptyExtended.note")}
          className="rounded-[28px] p-8"
        />
      ) : (
        <div className="space-y-5">
          <AdminSessionInspectorCaseSummary
            item={item}
            recommendedOutcomeLabel={t(
              `inspector.outcomes.${extended.recommendation.recommendedOutcome}` as Parameters<typeof t>[0],
            )}
            recommendedOutcomeTone={
              OUTCOME_TONE[extended.recommendation.recommendedOutcome] as OutcomeTone
            }
            evidenceConfidence={extended.meeting.sourceConfidence ?? "LOW"}
            totalRiskFlags={pickRiskCount(extended.evidence)}
            patientName={patientName}
            practitionerName={practitionerName}
          />

          <AdminSessionRoomCloseEvidencePanel
            videoRoomClose={attendance.data!.videoRoomClose}
            relatedSupportTickets={attendance.data!.relatedSupportTickets}
          />

          <AdminSessionPackageEntitlementPanel
            item={item}
            hasWritePermission={hasWritePermission}
          />

          <AdminSessionInspectorRecommendationPanel
            recommendation={extended.recommendation}
          />

          {/* Phase 4B — Manual Admin Decision panel */}
          <AdminSessionManualDecisionPanel
            sessionId={item.id}
            hasWritePermission={hasWritePermission}
            hasExistingFinal={hasExistingFinal}
            latestFinalDecision={latestFinal}
          />

          {/* Phase 4B — Manual Decision History */}
          <AdminSessionManualDecisionHistory sessionId={item.id} />

          <section className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("inspector.role.patient")} ·{" "}
              {t("inspector.role.practitioner")}
            </h2>
            <div className="grid gap-5 md:grid-cols-2">
              <AdminSessionInspectorRoleCard
                role="patient"
                summary={extended.patient}
              />
              <AdminSessionInspectorRoleCard
                role="practitioner"
                summary={extended.practitioner}
              />
            </div>
          </section>

          <AdminSessionInspectorOverlapCard
            overlap={extended.overlap}
            meeting={extended.meeting}
          />

          <AdminSessionInspectorEvidenceFlagsPanel
            evidence={extended.evidence}
          />

          <AdminSessionInspectorTimeline
            events={timeline}
            evidenceTimeline={evidenceTimeline}
            hasEvidenceTimeline={hasEvidenceTimeline}
          />

          {attendance.data ? (
            <AdminSessionInspectorRawEvidence data={attendance.data} />
          ) : null}
        </div>
      )}
    </div>
  );
}
