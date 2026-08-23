"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  FileText,
  Loader2,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { formatEffectiveViewerDateTime, formatEffectiveViewerTime } from "@/lib/time-formatting";
import { useMySettings } from "@/features/settings/hooks/use-settings";
import { AdminStatusBadge } from "@/components/shared/admin/AdminDashboardKit";
import SessionStatusBadge from "@/features/sessions/components/SessionStatusBadge";
import AdminSessionReference from "@/components/shared/admin/AdminSessionReference";
import { useAdminSessions } from "../hooks/use-admin-sessions";
import {
  useAdminSessionAttendance,
  useAdminSessionRuntimeInspection,
} from "@/features/admin/session-runtime/hooks/use-admin-session-runtime";
import {
  useAdminSessionManualDecisions,
  useCreateAdminSessionManualDecision,
} from "@/features/admin/session-runtime/hooks/use-admin-session-manual-decisions";
import {
  useExecuteResolution,
  usePreviewResolution,
  useResolutionCases,
} from "@/features/admin/session-resolution/hooks";
import type {
  PatientRemedy,
  PractitionerRemedy,
  ResolutionFinding,
  ResolutionOutcome,
} from "@/features/admin/session-resolution/types";
import { getAvailablePatientRemedies, isPackageSession as classifyPackageSession, isReplacementSession as classifyReplacementSession } from "@/features/admin/session-resolution/session-context";
import { getResolutionFormBlocker } from "@/features/admin/session-resolution/resolution-form-validation";
import type { SessionAdminDecisionType } from "@/features/admin/session-runtime/types/admin-session-manual-decisions.types";
import AdminSessionRoomCloseEvidencePanel from "@/features/admin/session-runtime/components/AdminSessionRoomCloseEvidencePanel";
import AdminSessionPackageEntitlementPanel from "@/features/admin/session-runtime/components/AdminSessionPackageEntitlementPanel";

type Props = {
  sessionId: string;
};

function formatDateTime(
  value: string | null | undefined,
  locale: string,
  timeZone: string | null | undefined,
  fallback = "-",
) {
  if (!value) return fallback;
  return formatEffectiveViewerDateTime(value, timeZone, { locale });
}

function formatTimeOnly(
  value: string | null | undefined,
  locale: string,
  timeZone: string | null | undefined,
  fallback = "-",
) {
  if (!value) return fallback;
  return formatEffectiveViewerTime(value, timeZone, { locale });
}

function getInitials(value: string | null | undefined) {
  if (!value) return "-";
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getSafeText(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

const OUTCOME_LABELS_AR: Record<ResolutionOutcome, string> = {
  PATIENT_NO_SHOW: "غياب المريض",
  PRACTITIONER_NO_SHOW: "غياب المعالج",
  BOTH_NO_SHOW: "غياب الطرفين",
};

const OUTCOME_LABELS_EN: Record<ResolutionOutcome, string> = {
  PATIENT_NO_SHOW: "Patient No-Show",
  PRACTITIONER_NO_SHOW: "Practitioner No-Show",
  BOTH_NO_SHOW: "Both No-Show",
};

const RESOLUTION_REASON_CATALOG = [
  ["PATIENT_DID_NOT_ATTEND", "المريض لم يحضر", "Patient did not attend"],
  ["PRACTITIONER_DID_NOT_ATTEND", "المختص لم يحضر", "Practitioner did not attend"],
  ["NEITHER_ATTENDED", "لم يحضر أي من الطرفين", "Neither attended"],
  ["ATTENDANCE_UNVERIFIABLE", "تعذر التحقق من الحضور", "Attendance could not be verified"],
  ["TECHNICAL_VIDEO_PROBLEM", "مشكلة تقنية أو بالفيديو", "Technical/video problem"],
  ["COMPLAINT_VERIFIED", "تم التحقق من الشكوى", "Complaint verified"],
  ["REPLACEMENT_AGREED", "اتفق الطرفان على جلسة بديلة", "Replacement agreed"],
  ["GOODWILL_EXCEPTION", "استثناء أو مجاملة إدارية", "Administrative goodwill exception"],
  ["OTHER", "سبب آخر", "Other"],
] as const;

const DECISION_TYPE_LABELS_AR: Record<SessionAdminDecisionType, string> = {
  MARK_COMPLETED: "اعتبار الجلسة مكتملة",
  MARK_PATIENT_NO_SHOW: "اعتبار المريض لم يحضر",
  MARK_PRACTITIONER_NO_SHOW: "اعتبار المعالج لم يحضر",
  MARK_BOTH_NO_SHOW: "اعتبار الطرفين لم يحضرا",
  MARK_TECHNICAL_REVIEW: "إحالة لمراجعة تقنية",
  MARK_INSUFFICIENT_EVIDENCE: "الأدلة غير كافية",
};

const DECISION_TYPE_LABELS_EN: Record<SessionAdminDecisionType, string> = {
  MARK_COMPLETED: "Mark Session Completed",
  MARK_PATIENT_NO_SHOW: "Mark Patient No-Show",
  MARK_PRACTITIONER_NO_SHOW: "Mark Practitioner No-Show",
  MARK_BOTH_NO_SHOW: "Mark Both No-Show",
  MARK_TECHNICAL_REVIEW: "Mark Technical Review",
  MARK_INSUFFICIENT_EVIDENCE: "Mark Insufficient Evidence",
};

const REVIEW_REASON_CODES = new Set([
  "INSUFFICIENT_EVIDENCE",
  "COMPLETION_CANDIDATE",
  "PATIENT_NO_SHOW_CANDIDATE",
  "PRACTITIONER_NO_SHOW_CANDIDATE",
  "BOTH_NO_SHOW_CANDIDATE",
  "TECHNICAL_REVIEW_CANDIDATE",
  "MANUAL_REVIEW_REQUIRED",
  "ACTIVE_COMPLAINT",
  "OPEN_RESOLUTION_CASE",
]);

function getReviewReasonLabel(
  code: string | null | undefined,
  isAr: boolean,
  t: ReturnType<typeof useTranslations>,
) {
  const normalized = code && REVIEW_REASON_CODES.has(code) ? code : "MANUAL_REVIEW_REQUIRED";
  const translated = t(`reviewWorkspace.reasonCodes.${normalized}` as never);
  return translated || (isAr ? "تتطلب مراجعة" : "Review required");
}

export default function AdminSessionReviewWorkspaceScreen({ sessionId }: Props) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const tSessions = useTranslations("admin-sessions");
  const router = useRouter();

  const tr = (key: string, fallback: string) => {
    try {
      const res = tSessions(key as any);
      if (
        !res ||
        typeof res !== "string" ||
        res.includes("admin-sessions.") ||
        res.startsWith("[")
      ) {
        return fallback;
      }
      return res;
    } catch {
      return fallback;
    }
  };

  const settingsQuery = useMySettings(true);
  const viewerTimeZone = settingsQuery.data?.item.preferences.timezone;

  // Queue context query (fetch list to allow Next/Previous navigation)
  const queueQuery = useAdminSessions({
    limit: 50,
    view: "review",
    sort: "oldest",
  });

  const queueItems = queueQuery.data?.items ?? [];
  const queueIndex = useMemo(
    () => queueItems.findIndex((item) => item.id === sessionId),
    [queueItems, sessionId],
  );

  const prevSessionId = queueIndex > 0 ? queueItems[queueIndex - 1]?.id : null;
  const nextSessionId =
    queueIndex >= 0 && queueIndex < queueItems.length - 1
      ? queueItems[queueIndex + 1]?.id
      : null;

  // Session-specific detail queries
  const runtimeQuery = useAdminSessionRuntimeInspection(sessionId);
  const attendanceQuery = useAdminSessionAttendance(sessionId);
  const manualDecisionsQuery = useAdminSessionManualDecisions(sessionId);
  const resolutionCasesQuery = useResolutionCases();
  const createDecision = useCreateAdminSessionManualDecision();
  const executeResolution = useExecuteResolution();
  const previewResolution = usePreviewResolution();

  // Find queue item if available for immediate metadata
  const queueItem = useMemo(
    () => queueItems.find((item) => item.id === sessionId) ?? null,
    [queueItems, sessionId],
  );

  const runtimeItem = runtimeQuery.data?.item ?? null;
  const attendanceData = attendanceQuery.data ?? null;
  const decisionItems = manualDecisionsQuery.data?.items ?? [];

  const resolutionCase = useMemo(
    () =>
      resolutionCasesQuery.data?.find(
        (c) => c.sessionId === sessionId && c.status === "OPEN",
      ) ?? null,
    [resolutionCasesQuery.data, sessionId],
  );
  const reviewedSession = resolutionCase?.session;
  const isPackageSession = classifyPackageSession({ paymentCoverageType: reviewedSession?.paymentCoverageType, packagePurchaseId: reviewedSession?.packagePurchaseId });
  const isReplacementSession = classifyReplacementSession({ originalSessionId: reviewedSession?.originalSessionId, fundingSource: reviewedSession?.fundingSource });
  const contextSessionType = isReplacementSession ? (isAr ? "جلسة بديلة" : "Replacement Session") : isPackageSession ? (isAr ? "جلسة من باقة" : "Package Session") : (isAr ? "جلسة فردية" : "Individual Session");
  const contextFunding = isReplacementSession ? (isAr ? "بدون دفع جديد · ممولة من الإدارة" : "No new payment · Admin funded") : isPackageSession ? (isAr ? "استحقاق باقة" : "Package entitlement") : (isAr ? "دفع مباشر" : "Direct payment");
  const contextOriginalSessionId = reviewedSession?.originalSessionId ?? runtimeItem?.originalSessionId ?? null;
  const patientRemedyOptions: PatientRemedy[] = getAvailablePatientRemedies({ paymentCoverageType: reviewedSession?.paymentCoverageType, packagePurchaseId: reviewedSession?.packagePurchaseId });

  // Progressive Disclosure State for Accordions
  const [openAccordions, setOpenAccordions] = useState<{
    timeline: boolean;
    room: boolean;
    package: boolean;
    audit: boolean;
  }>({
    timeline: false,
    room: false,
    package: false,
    audit: false,
  });

  const toggleAccordion = (key: keyof typeof openAccordions) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // State for Decision Controls
  const [showNeedsResolutionFlow, setShowNeedsResolutionFlow] = useState(false);
  const [selectedDecisionType, setSelectedDecisionType] =
    useState<SessionAdminDecisionType>("MARK_PATIENT_NO_SHOW");
  const [decisionReasonCode, setDecisionReasonCode] = useState(
    "PATIENT_DID_NOT_JOIN",
  );
  const [decisionAdminNote, setDecisionAdminNote] = useState("");
  const [confirmEvidence, setConfirmEvidence] = useState(true);
  const [confirmNoRefund, setConfirmNoRefund] = useState(true);
  const [confirmNoPayout, setConfirmNoPayout] = useState(true);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // State for Resolution Case controls (if resolution case exists)
  const [resOutcome, setResOutcome] = useState<ResolutionOutcome>(
    resolutionCase?.suggestedOutcome ?? "PATIENT_NO_SHOW",
  );
  const [resFinding, setResFinding] = useState<ResolutionFinding>(
    (resolutionCase?.suggestedOutcome as ResolutionFinding) ?? "INSUFFICIENT_EVIDENCE",
  );
  const [resPatientRemedy, setResPatientRemedy] = useState<PatientRemedy>(
    resolutionCase?.suggestedPatientRemedy ?? "KEEP_ORIGINAL",
  );
  const [resPractitionerRemedy, setResPractitionerRemedy] =
    useState<PractitionerRemedy>(
      resolutionCase?.suggestedPractitionerRemedy ?? "NO_EARNING",
    );
  const [resReasonCode, setResReasonCode] = useState("PATIENT_DID_NOT_ATTEND");
  const [resNotes, setResNotes] = useState("");
  const [resReplacementStart, setResReplacementStart] = useState("");
  const [previewFingerprint, setPreviewFingerprint] = useState<string | null>(null);
  const notesRequired = resFinding === "OTHER" || resReasonCode === "OTHER";

  useEffect(() => {
    if (!isPackageSession && resPatientRemedy === "RESTORE_PACKAGE") {
      setResPatientRemedy("KEEP_ORIGINAL");
      setPreviewFingerprint(null);
    }
  }, [isPackageSession, resPatientRemedy]);

  // Key metrics
  const patientDisplayName =
    queueItem?.patient?.displayName ??
    runtimeItem?.participants?.patient?.displayName ??
    attendanceData?.participants?.patient?.displayName ??
    (isAr ? "المريض" : "Patient");

  const practitionerDisplayName =
    queueItem?.practitioner?.displayName ??
    runtimeItem?.participants?.practitioner?.displayName ??
    attendanceData?.participants?.practitioner?.displayName ??
    (isAr ? "المعالج" : "Practitioner");

  const sessionCode =
    queueItem?.sessionCode ?? runtimeItem?.sessionCode ?? "S-REVISION";

  const scheduledStartAt =
    queueItem?.scheduledStartAt ?? runtimeItem?.scheduledStartAt;

  const durationMinutes = queueItem?.durationMinutes ?? 60;

  const overlapMinutes =
    queueItem?.attendance?.overlapMinutes ??
    attendanceData?.extendedSummary?.overlap?.overlapMinutes ??
    0;

  const rawOverlapPercent =
    queueItem?.attendance?.overlapPercent ??
    attendanceData?.extendedSummary?.overlap?.overlapPercentOfScheduledDuration;

  const overlapPercent =
    typeof rawOverlapPercent === "number"
      ? rawOverlapPercent
      : Math.min(100, Math.round((overlapMinutes / Math.max(1, durationMinutes)) * 100));

  const patientMinutes =
    queueItem?.attendance?.patientMinutes ??
    (attendanceData?.extendedSummary?.patient?.totalPresenceSeconds
      ? Math.round(attendanceData.extendedSummary.patient.totalPresenceSeconds / 60)
      : 0);

  const practitionerMinutes =
    queueItem?.attendance?.practitionerMinutes ??
    (attendanceData?.extendedSummary?.practitioner?.totalPresenceSeconds
      ? Math.round(attendanceData.extendedSummary.practitioner.totalPresenceSeconds / 60)
      : 0);

  const hasActiveComplaint =
    queueItem?.hasActiveComplaint ??
    Boolean(runtimeItem?.relatedSupportTickets?.some((t) => t.status === "OPEN"));

  const recommendationText =
    queueItem?.recommendation ??
    attendanceData?.extendedSummary?.recommendation?.recommendedOutcome ??
    (overlapPercent >= 80
      ? "MARK_COMPLETED"
      : isAr
        ? "مراجعة يدوية مطلوبة"
        : "Manual Review Required");
  const reviewDecision = attendanceData?.extendedSummary?.reviewDecision;
  const requiresResolution = reviewDecision
    ? reviewDecision.requiresResolution || !reviewDecision.canApproveNormally
    : true;
  const reviewReasonLabel = getReviewReasonLabel(
    reviewDecision?.reasonCode ??
      attendanceData?.extendedSummary?.recommendation?.recommendedOutcome,
    isAr,
    tSessions,
  );

  // Primary Action: Approve & Send to Accounting (MARK_COMPLETED)
  const handleApproveNormalSession = async (autoNext = false) => {
    setDecisionError(null);
    try {
      await createDecision.mutateAsync({
        sessionId,
        body: {
          decisionType: "MARK_COMPLETED",
          reasonCode: "EVIDENCE_SUPPORTS_COMPLETION",
          adminNote: isAr
            ? "تم اعتماد الجلسة وإرسالها للمحاسبة بناءً على أدلة الحضور الكافية."
            : "Session approved and sent to accounting based on sufficient attendance evidence.",
          confirmEvidenceReviewed: true as const,
          confirmNoAutomaticRefund: true as const,
          confirmNoAutomaticPayout: true as const,
        },
      });

      if (autoNext && nextSessionId) {
        router.push(`/admin/sessions/${nextSessionId}/review`);
      } else {
        router.push("/admin/sessions");
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setDecisionError(
        errObj?.message ??
          (isAr ? "تعذر اعتماد الجلسة حالياً." : "Could not approve session."),
      );
    }
  };

  const handleStartResolution = async () => {
    setDecisionError(null);
    try {
      await createDecision.mutateAsync({
        sessionId,
        body: {
          decisionType: "MARK_INSUFFICIENT_EVIDENCE",
          reasonCode: reviewDecision?.reasonCode ?? "INSUFFICIENT_EVIDENCE",
          adminNote: isAr
            ? "تمت إحالة الجلسة إلى التسوية بسبب عدم كفاية الأدلة."
            : "Session routed to resolution because the evidence is insufficient.",
          confirmEvidenceReviewed: true as const,
          confirmNoAutomaticRefund: true as const,
          confirmNoAutomaticPayout: true as const,
        },
      });
      router.refresh();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setDecisionError(errObj?.message ?? (isAr ? "تعذر بدء التسوية." : "Could not start resolution."));
    }
  };

  // Custom Manual Decision Submit (Needs Resolution flow)
  const handleSubmitCustomDecision = async () => {
    setDecisionError(null);
    try {
      await createDecision.mutateAsync({
        sessionId,
        body: {
          decisionType: selectedDecisionType,
          reasonCode: decisionReasonCode,
          adminNote: decisionAdminNote.trim() || null,
          confirmEvidenceReviewed: (confirmEvidence ? true : false) as true,
          confirmNoAutomaticRefund: (confirmNoRefund ? true : false) as true,
          confirmNoAutomaticPayout: (confirmNoPayout ? true : false) as true,
        },
      });
      router.push("/admin/sessions");
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setDecisionError(
        errObj?.message ??
          (isAr ? "تعذر تسجيل القرار اليدوي." : "Could not record decision."),
      );
    }
  };

  // Resolution Case Submit
  const handleExecuteResolutionSubmit = async () => {
    setDecisionError(null);
    const fingerprint = JSON.stringify({ resFinding, resOutcome, resPatientRemedy, resPractitionerRemedy, resReasonCode, resNotes, resReplacementStart });
    if (previewFingerprint !== fingerprint) {
      setDecisionError(isAr ? "يرجى تحديث معاينة التأثير قبل التنفيذ." : "Refresh the impact preview before execution.");
      return;
    }
    try {
      await executeResolution.mutateAsync({
        sessionId,
        body: {
          findingCode: resFinding,
          attendanceOutcome: resOutcome,
          patientRemedy: resPatientRemedy,
          practitionerRemedy: resPractitionerRemedy,
          reasonCode: resReasonCode,
          previewHash: previewResolution.data?.planHash,
          ...(resFinding === "OTHER" ? { customReasonNote: resNotes } : {}),
          adminNotes: resNotes,
          idempotencyKey: crypto.randomUUID(),
          ...(resReplacementStart
            ? { replacementStartAt: new Date(resReplacementStart).toISOString() }
            : {}),
        },
      });
      router.push("/admin/sessions");
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setDecisionError(
        errObj?.message ??
          (isAr ? "تعذر تنفيذ قرار التسوية." : "Could not execute resolution."),
      );
    }
  };

  const previewFingerprintCandidate = JSON.stringify({ resFinding, resOutcome, resPatientRemedy, resPractitionerRemedy, resReasonCode, resNotes, resReplacementStart });
  const previewRequiredMessage = previewResolution.data && previewFingerprint !== previewFingerprintCandidate
    ? (isAr ? "تم تغيير القرار — حدّث المعاينة قبل التنفيذ." : "Decision changed — refresh the preview before executing.")
    : !previewResolution.data
      ? (isAr ? "عاين تأثير القرار أولاً." : "Preview the decision impact first.")
      : null;
  const missingResolutionInput = getResolutionFormBlocker({ finding: resFinding, reasonCode: resReasonCode, notes: resNotes, patientRemedy: resPatientRemedy, replacementStart: resReplacementStart, hasPreview: true, previewMatches: true }, isAr);
  const handlePreviewResolution = async () => {
    setDecisionError(null);
    try {
      await previewResolution.mutateAsync({
        sessionId,
        body: {
          findingCode: resFinding,
          attendanceOutcome: resOutcome,
          patientRemedy: resPatientRemedy,
          practitionerRemedy: resPractitionerRemedy,
          reasonCode: resReasonCode,
          adminNotes: resNotes,
          idempotencyKey: `preview-${sessionId}-${Date.now()}`,
          ...(resFinding === "OTHER" ? { customReasonNote: resNotes } : {}),
          ...(resReplacementStart ? { replacementStartAt: new Date(resReplacementStart).toISOString() } : {}),
        },
      });
      setPreviewFingerprint(previewFingerprintCandidate);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setDecisionError(errObj?.message ?? (isAr ? "تعذر حساب تأثير القرار." : "Could not calculate decision impact."));
    }
  };

  return (
    <div className="space-y-4 text-text-primary">
      {/* ── WORKSPACE TOP HEADER BAR ── */}
      <header className="rounded-[22px] border border-border-light bg-surface-secondary/80 p-4 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/sessions"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border-light bg-surface-primary px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-surface-tertiary hover:text-text-primary"
            >
              {isAr ? (
                <>
                  <ArrowRight className="h-4 w-4" />
                  <span>{tr("reviewWorkspace.backToQueue", "العودة لقائمة الجلسات")}</span>
                </>
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4" />
                  <span>{tr("reviewWorkspace.backToQueue", "Back to Queue")}</span>
                </>
              )}
            </Link>

            <div className="h-4 w-px bg-border-light hidden sm:block" />

            <div className="flex items-center gap-2">
              <AdminSessionReference
                sessionId={sessionId}
                sessionCode={sessionCode}
                variant="detail"
                copyable
              />
              {queueItem?.status ? (
                <SessionStatusBadge status={queueItem.status} />
              ) : (
                <AdminStatusBadge tone="primary">
                  {isAr ? "قيد المراجعة" : "Under Review"}
                </AdminStatusBadge>
              )}
              {hasActiveComplaint ? (
                <AdminStatusBadge tone="danger">
                  {isAr ? "شكوى نشطة" : "Active Complaint"}
                </AdminStatusBadge>
              ) : null}
            </div>
          </div>

          {/* Quick Navigation in Queue */}
          <div className="flex items-center justify-between gap-2 lg:justify-end">
            <div className="text-xs text-text-muted">
              {queueIndex >= 0 ? (
                <span>
                  {isAr
                    ? `الجلسة ${queueIndex + 1} من ${queueItems.length} في القائمة`
                    : `Session ${queueIndex + 1} of ${queueItems.length} in queue`}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!prevSessionId}
                onClick={() =>
                  prevSessionId &&
                  router.push(`/admin/sessions/${prevSessionId}/review`)
                }
                className="inline-flex items-center gap-1 rounded-xl border border-border-light bg-surface-primary px-2.5 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-surface-tertiary disabled:opacity-40"
              >
                {isAr ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
                <span>{tr("reviewWorkspace.previousSession", isAr ? "السابقة" : "Previous")}</span>
              </button>
              <button
                type="button"
                disabled={!nextSessionId}
                onClick={() =>
                  nextSessionId &&
                  router.push(`/admin/sessions/${nextSessionId}/review`)
                }
                className="inline-flex items-center gap-1 rounded-xl border border-border-light bg-surface-primary px-2.5 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-surface-tertiary disabled:opacity-40"
              >
                <span>{tr("reviewWorkspace.nextSession", isAr ? "التالية" : "Next")}</span>
                {isAr ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <section aria-label={isAr ? "سياق الجلسة" : "Session context"} className="rounded-2xl border border-primary/15 bg-surface-primary px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs">
          <div className="min-w-[150px]"><p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{isAr ? "معرّف الجلسة" : "Session ID"}</p><p className="font-bold text-text-primary">{sessionCode}</p></div>
          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{isAr ? "نوع الجلسة" : "Session type"}</p><p className="font-bold text-text-primary">{contextSessionType}</p></div>
          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{isAr ? "التمويل" : "Funding"}</p><p className="font-semibold text-text-secondary">{contextFunding}</p></div>
          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{isAr ? "المريض" : "Patient"}</p><p className="font-semibold text-text-primary">{patientDisplayName}</p></div>
          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{isAr ? "المعالج" : "Practitioner"}</p><p className="font-semibold text-text-primary">{practitionerDisplayName}</p></div>
          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{isAr ? "الموعد والمدة" : "When"}</p><p className="font-semibold text-text-secondary">{formatDateTime(scheduledStartAt, locale, viewerTimeZone)} · {durationMinutes} {isAr ? "د" : "min"}</p></div>
          {runtimeItem?.payment && !isPackageSession && !isReplacementSession ? <div><p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{isAr ? "المدفوع فعلياً" : "Paid"}</p><p className="font-bold text-text-brand">{runtimeItem.payment.amount} {runtimeItem.payment.currency}</p></div> : null}
          {isPackageSession && runtimeItem?.packagePurchase ? <div><p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{isAr ? "الباقة / القيمة المخصصة" : "Package / allocation"}</p><p className="font-bold text-text-brand">{runtimeItem.packagePurchase.packagePlan.title} · {runtimeItem.packagePurchase.patientPayableTotalSnapshot ?? "-"} {runtimeItem.packagePurchase.selectedCurrencyCode ?? ""}</p></div> : null}
          {isReplacementSession ? <div><p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{isAr ? "الجلسة الأصلية" : "Original session"}</p><p className="font-bold text-text-brand">{contextOriginalSessionId ?? "-"}</p></div> : null}
          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{isAr ? "الحالة" : "State"}</p><p className="font-semibold text-text-secondary">{queueItem?.status ?? runtimeItem?.status ?? "-"}</p></div>
        </div>
      </section>

      {/* ── WORKSPACE MAIN 2-COLUMN SPLIT GRID ── */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(340px,1.1fr)] items-start">
        {/* ── LEFT COLUMN: LEVEL 1 EVIDENCE & DETAILED FORENSIC ACCORDIONS ── */}
        <div className="space-y-4 min-w-0">
          {/* LEVEL 1: FIRST VIEWPORT EVIDENCE CARDS GRID */}
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Card 1: Participants & Schedule */}
            <div className="rounded-[22px] border border-border-light bg-surface-primary p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {isAr ? "الأطراف والموعد" : "Parties & Schedule"}
                </span>
                <Clock className="h-4 w-4 text-primary" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-text-brand">
                    {getInitials(patientDisplayName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-text-primary">
                      {patientDisplayName}
                    </p>
                    <p className="text-[10px] text-text-muted">{isAr ? "المريض" : "Patient"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-tertiary text-xs font-bold text-text-secondary">
                    {getInitials(practitionerDisplayName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-text-primary">
                      {practitionerDisplayName}
                    </p>
                    <p className="text-[10px] text-text-muted">{isAr ? "المعالج" : "Practitioner"}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border-light/60 text-xs">
                <p className="font-semibold text-text-primary">
                  {formatDateTime(scheduledStartAt, locale, viewerTimeZone)}
                </p>
                <p className="text-text-muted text-[11px]">
                  {isAr ? `المدة المجدولة: ${durationMinutes} دقيقة` : `Duration: ${durationMinutes} min`}
                </p>
              </div>
            </div>

            {/* Card 2: Attendance & Overlap Summary */}
            <div className="rounded-[22px] border border-border-light bg-surface-primary p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {isAr ? "الحضور والتداخل" : "Attendance & Overlap"}
                </span>
                {patientMinutes === 0 && practitionerMinutes === 0 ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              )}
              <AdminStatusBadge tone={isPackageSession ? "success" : isReplacementSession ? "warning" : "primary"}>
                {isPackageSession
                  ? (isAr ? "جلسة من باقة" : "Package session")
                  : isReplacementSession
                    ? (isAr ? "جلسة بديلة ممولة من الإدارة" : "Admin-funded replacement")
                    : (isAr ? "جلسة دفع مباشر" : "Direct-paid session")}
              </AdminStatusBadge>
            </div>

              <div>
                <p className="text-2xl font-black tracking-tight text-primary">
                  {overlapMinutes === 0 ? (isAr ? "لا يوجد تداخل مسجل" : "No overlap recorded") : <>{overlapMinutes} <span className="text-xs font-normal text-text-muted">{isAr ? "دقيقة تداخل" : "min overlap"}</span></>}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-surface-tertiary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.min(100, overlapPercent)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-text-brand">{overlapPercent}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="rounded-xl bg-surface-tertiary/70 p-2">
                  <p className="text-text-muted">{isAr ? "المريض" : "Patient"}</p>
                  <p className="font-semibold text-text-primary">{patientMinutes === 0 ? (isAr ? "لا يوجد حضور مسجل" : "No recorded attendance") : `${patientMinutes} ${isAr ? "دقيقة" : "min"}`}</p>
                </div>
                <div className="rounded-xl bg-surface-tertiary/70 p-2">
                  <p className="text-text-muted">{isAr ? "المعالج" : "Practitioner"}</p>
                  <p className="font-semibold text-text-primary">{practitionerMinutes === 0 ? (isAr ? "لا يوجد حضور مسجل" : "No recorded attendance") : `${practitionerMinutes} ${isAr ? "دقيقة" : "min"}`}</p>
                </div>
              </div>
            </div>

            {/* Card 3: Complaint, Recommendation & Critical Risk State */}
            <div className="rounded-[22px] border border-border-light bg-surface-primary p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {isAr ? "الشكوى والتوصية" : "Complaint & Recommendation"}
                </span>
                {hasActiveComplaint ? (
                  <ShieldAlert className="h-4 w-4 text-rose-600 animate-pulse" />
                ) : (
                  <Sparkles className="h-4 w-4 text-amber-500" />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <AdminStatusBadge tone={hasActiveComplaint ? "danger" : "muted"}>
                    {hasActiveComplaint
                      ? tr("reviewWorkspace.activeComplaint", isAr ? "شكوى نشطة" : "Active Complaint")
                      : tr("reviewWorkspace.noActiveComplaint", isAr ? "لا توجد شكوى نشطة" : "No Active Complaint")}
                  </AdminStatusBadge>
                  {resolutionCase ? (
                    <AdminStatusBadge tone="warning">
                      {isAr ? "تحتاج تسوية" : "Resolution Case"}
                    </AdminStatusBadge>
                  ) : null}
                </div>

                <div className="rounded-xl border border-primary/15 bg-primary-light/30 p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {tr("reviewWorkspace.recommendationPrefix", isAr ? "التوصية النظامية" : "System Recommendation")}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-text-brand">
                    {getReviewReasonLabel(
                      attendanceData?.extendedSummary?.reviewDecision?.recommendation ??
                        attendanceData?.extendedSummary?.recommendation?.recommendedOutcome,
                      isAr,
                      tSessions,
                    )}
                  </p>
                </div>
              </div>

              {overlapPercent < 80 || queueItem?.isDelayed ? (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {overlapPercent < 80
                      ? isAr
                        ? "تداخل الحضور أقل من 80%"
                        : "Overlap < 80%"
                      : isAr
                        ? "بدء الجلسة متأخر"
                        : "Start delayed"}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* LEVEL 2 & 3: PROGRESSIVE DISCLOSURE ACCORDIONS FOR FORENSIC EVIDENCE */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
              {isAr ? "أدلة الجلسة والسجل التشغيلي" : "Forensic Evidence & Operational Log"}
            </h3>

            {/* Accordion 1: Attendance Timeline & Events */}
            <div className="rounded-[22px] border border-border-light bg-surface-primary overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => toggleAccordion("timeline")}
                className="flex w-full items-center justify-between p-4 text-start hover:bg-surface-secondary/50 transition"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-text-primary">
                    {tr("reviewWorkspace.timelineAccordion", isAr ? "سجل الأحداث والجدول الزمني للحضور" : "Attendance Timeline & Events")}
                  </span>
                  <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] font-semibold text-text-muted">
                    {attendanceData?.timeline?.length ?? 0} {isAr ? "حدث" : "events"}
                  </span>
                </div>
                {openAccordions.timeline ? (
                  <ChevronUp className="h-4 w-4 text-text-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-muted" />
                )}
              </button>

              {openAccordions.timeline ? (
                <div className="border-t border-border-light/60 p-4 space-y-2.5 bg-surface-secondary/30">
                  {attendanceData?.timeline?.length ? (
                    attendanceData.timeline.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border-light/80 bg-surface-primary p-3 text-xs flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-semibold text-text-primary">
                            {getSafeText(item.attendanceEventType)} · {getSafeText(item.participantRole)}
                          </p>
                          <p className="text-text-muted text-[11px] mt-0.5">
                            {getSafeText(item.providerEventType)}
                            {getSafeText(item.providerEventRef) !== "-"
                              ? ` · ${getSafeText(item.providerEventRef)}`
                              : ""}
                          </p>
                        </div>
                        <span className="text-text-muted text-[11px] font-medium">
                          {formatDateTime(item.occurredAt, locale, viewerTimeZone)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-text-muted p-2">
                      {isAr ? "لا توجد أحداث حضور مسجلة." : "No attendance events recorded."}
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {/* Accordion 2: Room Close Evidence & Support Tickets */}
            <div className="rounded-[22px] border border-border-light bg-surface-primary overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => toggleAccordion("room")}
                className="flex w-full items-center justify-between p-4 text-start hover:bg-surface-secondary/50 transition"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-text-primary">
                    {tr("reviewWorkspace.roomEvidenceAccordion", isAr ? "أدلة إغلاق الغرفة والتذاكر ذات الصلة" : "Room Close Evidence & Support Tickets")}
                  </span>
                </div>
                {openAccordions.room ? (
                  <ChevronUp className="h-4 w-4 text-text-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-muted" />
                )}
              </button>

              {openAccordions.room ? (
                <div className="border-t border-border-light/60 p-4 bg-surface-secondary/30">
                  {attendanceData ? (
                    <AdminSessionRoomCloseEvidencePanel
                      videoRoomClose={attendanceData.videoRoomClose}
                      relatedSupportTickets={attendanceData.relatedSupportTickets}
                    />
                  ) : (
                    <p className="text-xs text-text-muted p-2">
                      {isAr ? "لا توجد أدلة إغلاق غرفة." : "No room close evidence."}
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {/* Accordion 3: Package Entitlement & Replacement Details */}
            <div className="rounded-[22px] border border-border-light bg-surface-primary overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => toggleAccordion("package")}
                className="flex w-full items-center justify-between p-4 text-start hover:bg-surface-secondary/50 transition"
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-text-primary">
                    {tr("reviewWorkspace.packageEntitlementAccordion", isAr ? "تفاصيل استحقاق الباقة" : "Package Entitlement & Replacement Details")}
                  </span>
                </div>
                {openAccordions.package ? (
                  <ChevronUp className="h-4 w-4 text-text-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-muted" />
                )}
              </button>

              {openAccordions.package ? (
                <div className="border-t border-border-light/60 p-4 bg-surface-secondary/30">
                  {runtimeItem ? (
                    <AdminSessionPackageEntitlementPanel item={runtimeItem} />
                  ) : (
                    <p className="text-xs text-text-muted p-2">
                      {isAr ? "هذه الجلسة غير مرتبطة بباقة." : "No package entitlement linked."}
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {/* Accordion 4: Decision History & Audit log */}
            <div className="rounded-[22px] border border-border-light bg-surface-primary overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => toggleAccordion("audit")}
                className="flex w-full items-center justify-between p-4 text-start hover:bg-surface-secondary/50 transition"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-text-secondary" />
                  <span className="text-sm font-semibold text-text-primary">
                    {tr("reviewWorkspace.auditHistoryAccordion", isAr ? "سجل القرارات الإدارية السابقة" : "Admin Decision Audit History")}
                  </span>
                  <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] font-semibold text-text-muted">
                    {decisionItems.length} {isAr ? "قرارات" : "decisions"}
                  </span>
                </div>
                {openAccordions.audit ? (
                  <ChevronUp className="h-4 w-4 text-text-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-muted" />
                )}
              </button>

              {openAccordions.audit ? (
                <div className="border-t border-border-light/60 p-4 space-y-2 bg-surface-secondary/30">
                  {decisionItems.length > 0 ? (
                    decisionItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border-light/80 bg-surface-primary p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text-primary">
                            {isAr
                              ? DECISION_TYPE_LABELS_AR[item.decisionType] ?? item.decisionType
                              : DECISION_TYPE_LABELS_EN[item.decisionType] ?? item.decisionType}
                          </span>
                          {item.isFinal ? (
                            <AdminStatusBadge tone="success">
                              {isAr ? "قرار نهائي" : "Final"}
                            </AdminStatusBadge>
                          ) : null}
                        </div>
                        <p className="text-text-muted text-[11px]">
                          {isAr ? "كود السبب:" : "Reason:"} {item.reasonCode}
                        </p>
                        {item.adminNote ? (
                          <p className="text-text-secondary text-[11px] bg-surface-tertiary p-2 rounded-lg mt-1">
                            "{item.adminNote}"
                          </p>
                        ) : null}
                        <p className="text-[10px] text-text-muted pt-1">
                          {formatDateTime(item.createdAt, locale, viewerTimeZone)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-text-muted p-2">
                      {isAr ? "لا توجد قرارات إدارية مسجلة سابقاً." : "No previous admin decisions."}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: STICKY ADMIN DECISION PANEL (~30-35%) ── */}
        <div className="lg:sticky lg:top-20 space-y-4">
          <div className="rounded-[26px] border border-primary/20 bg-surface-primary p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-border-light/70 pb-3">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  {tr("reviewWorkspace.decisionTitle", isAr ? "قرار مراجعة الجلسة" : "Session Review Decision")}
                </h3>
                <p className="text-xs text-text-muted">
                  {isAr ? "مراجعة واعتماد نتيجة الجلسة" : "Review & approve session outcome"}
                </p>
              </div>
              <AdminStatusBadge tone="primary">
                {isAr ? "صلاحية الأدمن" : "Admin Only"}
              </AdminStatusBadge>
            </div>

            {decisionError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {decisionError}
              </div>
            ) : null}

            {/* ── CASE A: OPEN RESOLUTION CASE CONTROLS ── */}
            {resolutionCase || queueItem?.status === "AWAITING_ADMIN_RESOLUTION" ? (
              <div className="space-y-3 bg-amber-50/60 dark:bg-amber-500/10 p-4 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{isAr ? "حالة تسوية مفتوحة" : "Open Resolution Case"}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="block">
                    <span className="font-semibold text-text-secondary">{isAr ? "ماذا حدث في الجلسة؟" : "What happened?"}</span>
                    <select value={resFinding} onChange={(e) => { setResFinding(e.target.value as ResolutionFinding); setPreviewFingerprint(null); }} className="mt-1 w-full rounded-xl border border-border-light bg-surface-primary p-2 text-xs font-medium">
                      <option value="PATIENT_NO_SHOW">{isAr ? "المريض لم يحضر" : "Patient did not attend"}</option>
                      <option value="PRACTITIONER_NO_SHOW">{isAr ? "المختص لم يحضر" : "Practitioner did not attend"}</option>
                      <option value="BOTH_NO_SHOW">{isAr ? "لم يحضر أي من الطرفين" : "Neither attended"}</option>
                      <option value="TECHNICAL_ISSUE">{isAr ? "مشكلة تقنية أو بالفيديو" : "Technical/video problem"}</option>
                      <option value="INSUFFICIENT_EVIDENCE">{isAr ? "الأدلة غير كافية" : "Attendance could not be verified"}</option>
                      <option value="SESSION_COMPLETED_AFTER_REVIEW">{isAr ? "اكتملت الجلسة بعد المراجعة" : "Completed after review"}</option>
                      <option value="OTHER">{isAr ? "سبب آخر" : "Other"}</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="font-semibold text-text-secondary">{isAr ? "النتيجة" : "Outcome"}</span>
                    <select
                      value={resOutcome}
                      onChange={(e) => { setResOutcome(e.target.value as ResolutionOutcome); setPreviewFingerprint(null); }}
                      className="mt-1 w-full rounded-xl border border-border-light bg-surface-primary p-2 text-xs font-medium"
                    >
                      {Object.entries(isAr ? OUTCOME_LABELS_AR : OUTCOME_LABELS_EN).map(([val, lbl]) => (
                        <option key={val} value={val}>
                          {lbl}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="font-semibold text-text-secondary">{isAr ? "تعويض المريض" : "Patient Compensation"}</span>
                    <select
                      value={resPatientRemedy}
                      onChange={(e) => { setResPatientRemedy(e.target.value as PatientRemedy); setPreviewFingerprint(null); }}
                      className="mt-1 w-full rounded-xl border border-border-light bg-surface-primary p-2 text-xs font-medium"
                    >
                      {patientRemedyOptions.map((remedy) => (
                        <option key={remedy} value={remedy}>
                          {remedy === "KEEP_ORIGINAL" ? (isAr ? "بدون تعويض للمريض" : "No patient compensation") : remedy === "RESTORE_PACKAGE" ? (isAr ? "إرجاع الجلسة إلى الباقة" : "Restore package entitlement") : remedy === "CREDIT_WALLET" ? (isAr ? "رد القيمة إلى المحفظة" : "Credit customer wallet") : (isAr ? "إنشاء جلسة بديلة" : "Create replacement session")}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="font-semibold text-text-secondary">{isAr ? "علاج المعالج" : "Practitioner Remedy"}</span>
                    <select
                      value={resPractitionerRemedy}
                      onChange={(e) => { setResPractitionerRemedy(e.target.value as PractitionerRemedy); setPreviewFingerprint(null); }}
                      className="mt-1 w-full rounded-xl border border-border-light bg-surface-primary p-2 text-xs font-medium"
                    >
                      <option value="NO_EARNING">{isAr ? "بدون استحقاق للمختص" : "No practitioner earning"}</option>
                      <option value="CREATE_EARNING_REVIEW">{isAr ? "مؤهل للمراجعة المحاسبية" : "Eligible for accounting review"}</option>
                    </select>
                  </label>

                  {resPatientRemedy === "CREATE_REPLACEMENT_SESSION" ? (
                    <label className="block">
                      <span className="font-semibold text-text-secondary">{isAr ? "موعد البديل" : "Replacement Start"}</span>
                      <input
                        type="datetime-local"
                        value={resReplacementStart}
                        onChange={(e) => { setResReplacementStart(e.target.value); setPreviewFingerprint(null); }}
                        className="mt-1 w-full rounded-xl border border-border-light bg-surface-primary p-2 text-xs"
                      />
                    </label>
                  ) : null}

                  <label className="block">
                    <span className="font-semibold text-text-secondary">{isAr ? "رمز السبب" : "Reason Code"}</span>
                    <select value={resReasonCode} onChange={(e) => { setResReasonCode(e.target.value); setPreviewFingerprint(null); }} className="mt-1 w-full rounded-xl border border-border-light bg-surface-primary p-2 text-xs">
                      {RESOLUTION_REASON_CATALOG.map(([value, ar, en]) => <option key={value} value={value}>{isAr ? ar : en}</option>)}
                    </select>
                  </label>

                  <label className="block">
                    <span className="font-semibold text-text-secondary">{isAr ? "ملاحظات المسؤول" : "Admin Notes"}</span>
                    <textarea
                      rows={2}
                      value={resNotes}
                      onChange={(e) => { setResNotes(e.target.value); setPreviewFingerprint(null); }}
                      placeholder={isAr ? "ملاحظات إلزامية للتسوية..." : "Required notes..."}
                      className="mt-1 w-full rounded-xl border border-border-light bg-surface-primary p-2 text-xs"
                    />
                  </label>
                  {notesRequired ? <p className="rounded-lg bg-amber-100/70 p-2 text-[11px] text-amber-900">{isAr ? "اكتب سبباً واضحاً ومختصراً للحالة الأخرى." : "Provide a concise explanation for the custom finding."}</p> : null}
                </div>

                {missingResolutionInput ? <p role="status" className="rounded-lg border border-amber-200 bg-amber-50/80 p-2 text-[11px] font-semibold text-amber-800">{missingResolutionInput}</p> : null}

                {previewResolution.data ? (
                  <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs dark:border-sky-500/30 dark:bg-sky-500/10">
                    <p className="font-bold text-sky-900 dark:text-sky-100">{isAr ? "تأثير القرار" : "Decision impact"}</p>
                    <div className="mt-2 space-y-1 text-sky-900/90 dark:text-sky-100/90">
                      <p>{isAr ? "المريض:" : "Patient:"} {previewResolution.data.patient.walletCredit ? `${isAr ? "إضافة" : "Credit"} ${previewResolution.data.patient.walletCredit.amount} ${previewResolution.data.patient.walletCredit.currency} ${isAr ? "إلى المحفظة" : "to wallet"}` : (isAr ? "لا يوجد رصيد محفظة" : "No wallet credit")}</p>
                      <p>{isAr ? "المختص:" : "Practitioner:"} {previewResolution.data.practitioner.accountingReviewWillBeCreated ? (isAr ? "مؤهل للمراجعة المحاسبية" : "Eligible for accounting review") : (isAr ? "بدون استحقاق" : "No earning")}</p>
                      <p>{isAr ? "الجلسة البديلة:" : "Replacement:"} {previewResolution.data.replacement.willCreate ? (isAr ? "سيتم إنشاؤها" : "Will be created") : (isAr ? "لن يتم إنشاؤها" : "Will not be created")}</p>
                    </div>
                  </div>
                ) : null}

                <button type="button" onClick={handlePreviewResolution} disabled={previewResolution.isPending || Boolean(missingResolutionInput)} className="w-full rounded-xl border border-sky-500 px-4 py-2.5 text-xs font-bold text-sky-700 transition hover:bg-sky-50 disabled:opacity-50">
                  {previewResolution.isPending ? (isAr ? "جار حساب التأثير…" : "Calculating impact…") : (isAr ? "معاينة تأثير القرار" : "Preview decision impact")}
                </button>

                <button
                  type="button"
                  disabled={executeResolution.isPending || Boolean(missingResolutionInput) || previewFingerprint !== previewFingerprintCandidate}
                  onClick={handleExecuteResolutionSubmit}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  {executeResolution.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>{isAr ? "تأكيد وتنفيذ التسوية" : "Confirm & Execute Resolution"}</span>
                  )}
                </button>
                {previewRequiredMessage ? <p role="status" className="text-center text-[11px] font-semibold text-text-muted">{previewRequiredMessage}</p> : null}
              </div>
            ) : requiresResolution ? (
              <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-bold">{reviewReasonLabel}</span>
                </div>
                <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
                  {isAr
                    ? "هذه الجلسة تحتاج إلى تسوية قبل تسجيل نتيجة نهائية."
                    : "This Session requires resolution before a final outcome can be recorded."}
                </p>
                <button
                  type="button"
                  onClick={handleStartResolution}
                  disabled={createDecision.isPending}
                  className="w-full rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
                >
                  {isAr ? "بدء التسوية" : "Start Resolution"}
                </button>
              </div>
            ) : (
              /* ── CASE B: NORMAL & EXCEPTION DECISION WORKFLOW ── */
              <div className="space-y-4">
                {/* PRIMARY ACTION: NORMAL SESSION APPROVAL */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      {isAr ? "المسار القياسي الموصى به" : "Recommended Standard Path"}
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>

                  <button
                    type="button"
                    disabled={createDecision.isPending}
                    onClick={() => handleApproveNormalSession(false)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-md transition active:scale-95 disabled:opacity-50"
                  >
                    {createDecision.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{tr("reviewWorkspace.approvePrimary", isAr ? "اعتماد وإرسال للمحاسبة" : "Approve & Send to Accounting")}</span>
                      </>
                    )}
                  </button>

                  {nextSessionId ? (
                    <button
                      type="button"
                      disabled={createDecision.isPending}
                      onClick={() => handleApproveNormalSession(true)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-white dark:bg-surface-primary px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{tr("reviewWorkspace.approveAndNext", isAr ? "اعتماد وانتقال للتالية" : "Approve & Go to Next")}</span>
                    </button>
                  ) : null}
                </div>

                {/* SECONDARY ACTION: PROGRESSIVE DISCLOSURE FOR EXCEPTION / RESOLUTION FLOW */}
                <div className="pt-2 border-t border-border-light/60">
                  <button
                    type="button"
                    onClick={() => setShowNeedsResolutionFlow(!showNeedsResolutionFlow)}
                    className="flex w-full items-center justify-between rounded-xl border border-border-light bg-surface-secondary/70 p-3 text-xs font-semibold text-text-secondary hover:bg-surface-tertiary transition"
                  >
                    <span>{tr("reviewWorkspace.needsResolution", isAr ? "يتطلب تسوية" : "Needs Resolution")}</span>
                    {showNeedsResolutionFlow ? (
                      <ChevronUp className="h-4 w-4 text-text-muted" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-text-muted" />
                    )}
                  </button>

                  {showNeedsResolutionFlow ? (
                    <div className="mt-3 space-y-3 p-3 rounded-2xl border border-border-light bg-surface-tertiary/40 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                          {isAr ? "نوع القرار الإداري" : "Decision Type"}
                        </label>
                        <select
                          value={selectedDecisionType}
                          onChange={(e) =>
                            setSelectedDecisionType(
                              e.target.value as SessionAdminDecisionType,
                            )
                          }
                          className="w-full rounded-xl border border-border-light bg-surface-primary p-2 text-xs font-medium"
                        >
                          {Object.entries(
                            isAr ? DECISION_TYPE_LABELS_AR : DECISION_TYPE_LABELS_EN,
                          ).map(([val, lbl]) => (
                            <option key={val} value={val}>
                              {lbl}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                          {isAr ? "كود السبب" : "Reason Code"}
                        </label>
                        <input
                          type="text"
                          value={decisionReasonCode}
                          onChange={(e) => setDecisionReasonCode(e.target.value)}
                          className="w-full rounded-xl border border-border-light bg-surface-primary p-2 text-xs font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
                          {isAr ? "ملاحظات الإدارة" : "Admin Note"}
                        </label>
                        <textarea
                          rows={2}
                          value={decisionAdminNote}
                          onChange={(e) => setDecisionAdminNote(e.target.value)}
                          placeholder={isAr ? "ملاحظة اختيارية..." : "Optional note..."}
                          className="w-full rounded-xl border border-border-light bg-surface-primary p-2 text-xs"
                        />
                      </div>

                      {/* Confirmations */}
                      <div className="space-y-2 pt-1 border-t border-border-light/60 text-[11px]">
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={confirmEvidence}
                            onChange={(e) => setConfirmEvidence(e.target.checked)}
                            className="mt-0.5 rounded text-primary"
                          />
                          <span>{isAr ? "تمت مراجعة أدلة الحضور" : "Evidence reviewed"}</span>
                        </label>
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={confirmNoRefund}
                            onChange={(e) => setConfirmNoRefund(e.target.checked)}
                            className="mt-0.5 rounded text-primary"
                          />
                          <span>{isAr ? "بدون استرداد تلقائي" : "No automatic refund"}</span>
                        </label>
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={confirmNoPayout}
                            onChange={(e) => setConfirmNoPayout(e.target.checked)}
                            className="mt-0.5 rounded text-primary"
                          />
                          <span>{isAr ? "بدون استحقاق تلقائي" : "No automatic payout"}</span>
                        </label>
                      </div>

                      <button
                        type="button"
                        disabled={createDecision.isPending || !confirmEvidence}
                        onClick={handleSubmitCustomDecision}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                      >
                        {createDecision.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <span>{isAr ? "تسجيل القرار اليدوي" : "Submit Custom Decision"}</span>
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
