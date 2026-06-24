"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { useCreateAdminSessionManualDecision } from "../hooks/use-admin-session-manual-decisions";
import type {
  AdminSessionDecisionItem,
  CreateAdminSessionManualDecisionRequest,
  SessionAdminDecisionType,
} from "../types/admin-session-manual-decisions.types";

const DECISION_TYPES: SessionAdminDecisionType[] = [
  "MARK_COMPLETED",
  "MARK_PATIENT_NO_SHOW",
  "MARK_PRACTITIONER_NO_SHOW",
  "MARK_BOTH_NO_SHOW",
  "MARK_TECHNICAL_REVIEW",
  "MARK_INSUFFICIENT_EVIDENCE",
];

const REASON_CODES = [
  "EVIDENCE_SUPPORTS_COMPLETION",
  "PATIENT_DID_NOT_JOIN",
  "PRACTITIONER_DID_NOT_JOIN",
  "BOTH_PARTIES_DID_NOT_JOIN",
  "TECHNICAL_ISSUE_REVIEW",
  "INSUFFICIENT_EVIDENCE",
  "ADMIN_REVIEW_OVERRIDE",
  "LOCAL_ADMIN_REVIEW",
] as const;

const STATUS_MUTATING_TYPES: SessionAdminDecisionType[] = [
  "MARK_COMPLETED",
  "MARK_PATIENT_NO_SHOW",
];

const MAX_NOTE_LENGTH = 2000;

type StatusImpact = {
  label: string;
  tone: "warning" | "neutral";
};

function getStatusImpact(
  decisionType: SessionAdminDecisionType | null,
  t: ReturnType<typeof useTranslations>,
): StatusImpact | null {
  if (!decisionType) return null;
  if (decisionType === "MARK_COMPLETED") {
    return {
      label: t("inspector.manualDecision.statusImpact.willMutate", {
        status: t("statuses.COMPLETED"),
      }),
      tone: "warning",
    };
  }
  if (decisionType === "MARK_PATIENT_NO_SHOW") {
    return {
      label: t("inspector.manualDecision.statusImpact.willMutate", {
        status: t("statuses.NO_SHOW"),
      }),
      tone: "warning",
    };
  }
  return {
    label: t("inspector.manualDecision.statusImpact.noChange"),
    tone: "neutral",
  };
}

/**
 * Safely extract an error code from multiple possible backend response shapes.
 * Handles: errorCode, messageKey, message, error, statusCode
 */
function extractErrorCode(error: unknown): string {
  if (!error) return "";
  const err = error as Record<string, unknown>;
  const data = err.response as Record<string, unknown> | undefined;
  // Navigate: err.response.data.X or err.data.X (some backends flatten)
  const body = (data?.data ?? err) as Record<string, unknown>;
  return (
    (body.errorCode as string) ||
    (body.messageKey as string) ||
    (body.message as string) ||
    (body.error as string) ||
    (err.statusCode as string) ||
    ""
  );
}

function getErrorMessage(
  error: unknown,
  t: ReturnType<typeof useTranslations>,
): string {
  const code = extractErrorCode(error);
  const key = `inspector.manualDecision.errors.${code}`;
  const translated = t(key);
  if (translated !== key) return translated;
  if (code === "SESSION_DECISION_ALREADY_FINAL")
    return t("inspector.manualDecision.errors.SESSION_DECISION_ALREADY_FINAL");
  if (code === "SESSION_DECISION_REQUIRES_PAST_END")
    return t("inspector.manualDecision.errors.SESSION_DECISION_REQUIRES_PAST_END");
  if (code === "SESSION_DECISION_NOT_ALLOWED_STATUS")
    return t("inspector.manualDecision.errors.SESSION_DECISION_NOT_ALLOWED_STATUS");
  if (code === "SESSION_DECISION_NOT_ELIGIBLE")
    return t("inspector.manualDecision.errors.SESSION_DECISION_NOT_ELIGIBLE");
  if (code === "SESSION_DECISION_CONFIRMATION_REQUIRED")
    return t("inspector.manualDecision.errors.SESSION_DECISION_CONFIRMATION_REQUIRED");
  if (code === "Forbidden" || code === "403")
    return t("inspector.manualDecision.errors.forbidden");
  if (code === "Unauthorized" || code === "401")
    return t("inspector.manualDecision.errors.unauthorized");
  return t("inspector.manualDecision.errors.generic");
}

export default function AdminSessionManualDecisionPanel({
  sessionId,
  hasWritePermission,
  hasExistingFinal,
  latestFinalDecision,
}: {
  sessionId: string;
  /** Whether the current user has SESSIONS_MANUAL_DECISIONS_WRITE permission.
   *  If undefined, permission check is not available — form stays visible and
   *  relies on backend 403 for access control. */
  hasWritePermission?: boolean;
  hasExistingFinal: boolean;
  latestFinalDecision: AdminSessionDecisionItem | null;
}) {
  const t = useTranslations("admin-session-runtime");
  const [decisionType, setDecisionType] = useState<SessionAdminDecisionType | null>(null);
  const [reasonCode, setReasonCode] = useState<string>("");
  const [adminNote, setAdminNote] = useState("");
  const [confirmEvidenceReviewed, setConfirmEvidenceReviewed] = useState(false);
  const [confirmNoAutomaticRefund, setConfirmNoAutomaticRefund] = useState(false);
  const [confirmNoAutomaticPayout, setConfirmNoAutomaticPayout] = useState(false);
  const [supersedeChecked, setSupersedeChecked] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const createDecision = useCreateAdminSessionManualDecision();
  const statusImpact = getStatusImpact(decisionType, t);
  const latestFinalDecisionTypeKey = latestFinalDecision
    ? `inspector.manualDecision.decisionType.${
        (latestFinalDecision as { decisionType?: string | null }).decisionType ?? ""
      }`
    : "";
  const latestFinalReasonCodeKey = latestFinalDecision
    ? `inspector.manualDecision.reasonCode.${
        (latestFinalDecision as { reasonCode?: string | null }).reasonCode ?? ""
      }`
    : "";

  const isFormValid =
    decisionType !== null &&
    reasonCode !== "" &&
    confirmEvidenceReviewed &&
    confirmNoAutomaticRefund &&
    confirmNoAutomaticPayout &&
    (!hasExistingFinal || supersedeChecked);

  const isSubmitting = createDecision.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !decisionType || !reasonCode) return;

    const body: CreateAdminSessionManualDecisionRequest = {
      decisionType,
      reasonCode,
      adminNote: adminNote.trim() || null,
      confirmEvidenceReviewed: true,
      confirmNoAutomaticRefund: true,
      confirmNoAutomaticPayout: true,
      supersedePrevious: hasExistingFinal ? supersedeChecked : undefined,
    };

    try {
      await createDecision.mutateAsync({ sessionId, body });
      setSuccessVisible(true);
      setDecisionType(null);
      setReasonCode("");
      setAdminNote("");
      setConfirmEvidenceReviewed(false);
      setConfirmNoAutomaticRefund(false);
      setConfirmNoAutomaticPayout(false);
      setSupersedeChecked(false);
      setTimeout(() => setSuccessVisible(false), 4000);
    } catch {
      // Error is surfaced via createDecision.error
    }
  };

  const errorMessage = createDecision.error
    ? getErrorMessage(createDecision.error, t)
    : null;

  // Permission-aware: if hasWritePermission is explicitly false, show read-only message
  if (hasWritePermission === false) {
    return (
      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-text-primary dark:text-white/95">
          {t("inspector.manualDecision.title")}
        </h2>
        <div className="flex items-start gap-3 rounded-2xl border border-border-light bg-surface-tertiary p-4 dark:border-white/8 dark:bg-white/[0.03]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
          <p className="text-sm text-text-secondary dark:text-white/70">
            {t("inspector.manualDecision.noPermission")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="app-panel rounded-[28px] p-5 sm:p-6">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
          {t("inspector.manualDecision.title")}
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          {t("inspector.manualDecision.subtitle")}
        </p>
      </div>

      {/* Safety notice */}
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-xs leading-6 text-amber-800 dark:text-amber-200">
          {t("inspector.manualDecision.safetyNotice")}
        </p>
      </div>

      {/* Success message */}
      {successVisible ? (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
            ✓
          </span>
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              {t("inspector.manualDecision.success.title")}
            </p>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
              {t("inspector.manualDecision.success.note")}
            </p>
          </div>
        </div>
      ) : null}

      {/* Error message */}
      {errorMessage ? (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <p className="text-xs leading-6 text-rose-800 dark:text-rose-200">
            {errorMessage}
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Decision type selector */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("inspector.manualDecision.decisionType.label")}
          </label>
          <div className="space-y-2">
            {DECISION_TYPES.map((dt) => {
              const isSelected = decisionType === dt;
              const isMutatingType = STATUS_MUTATING_TYPES.includes(dt);
              return (
                <button
                  key={dt}
                  type="button"
                  onClick={() => setDecisionType(dt)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-start transition ${
                    isSelected
                      ? isMutatingType
                        ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10"
                        : "border-primary/30 bg-primary-light/30 dark:border-primary/40 dark:bg-primary/10"
                      : "border-border-light bg-white dark:border-white/8 dark:bg-white/5"
                  }`}
                >
                  <span
                    className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      isSelected
                        ? "border-primary bg-primary dark:border-primary-light dark:bg-primary-light"
                        : "border-border-light dark:border-white/20"
                    }`}
                  >
                    {isSelected ? (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    ) : null}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isSelected
                        ? "text-text-primary dark:text-white/95"
                        : "text-text-secondary dark:text-white/70"
                    }`}
                  >
                    {t(
                      `inspector.manualDecision.decisionType.${dt}` as Parameters<typeof t>[0],
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status impact preview */}
        {decisionType && statusImpact ? (
          <div
            className={`rounded-2xl border p-4 ${
              statusImpact.tone === "warning"
                ? "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
                : "border-border-light bg-surface-tertiary dark:border-white/8 dark:bg-white/[0.03]"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("inspector.manualDecision.statusImpact.label")}
            </p>
            <p
              className={`mt-1 text-sm font-medium ${
                statusImpact.tone === "warning"
                  ? "text-amber-800 dark:text-amber-200"
                  : "text-text-secondary dark:text-white/70"
              }`}
            >
              {statusImpact.label}
            </p>
          </div>
        ) : null}

        {/* Reason code selector */}
        <div>
          <label
            htmlFor="reasonCode"
            className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted"
          >
            {t("inspector.manualDecision.reasonCode.label")}
          </label>
          <select
            id="reasonCode"
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
            className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
          >
            <option value="">
              {t("inspector.manualDecision.reasonCode.placeholder")}
            </option>
            {REASON_CODES.map((code) => (
              <option key={code} value={code}>
                {t(
                  `inspector.manualDecision.reasonCode.${code}` as Parameters<typeof t>[0],
                )}
              </option>
            ))}
          </select>
        </div>

        {/* Admin note */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="adminNote"
              className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted"
            >
              {t("inspector.manualDecision.adminNote.label")}
            </label>
            <span className="text-[11px] text-text-muted">
              {MAX_NOTE_LENGTH - adminNote.length}{" "}
              {t("inspector.manualDecision.adminNote.remaining", {
                count: MAX_NOTE_LENGTH - adminNote.length,
              })}
            </span>
          </div>
          <textarea
            id="adminNote"
            value={adminNote}
            onChange={(e) =>
              setAdminNote(e.target.value.slice(0, MAX_NOTE_LENGTH))
            }
            placeholder={t("inspector.manualDecision.adminNote.placeholder")}
            rows={3}
            className="w-full resize-none rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
          />
          <p className="mt-1.5 text-[11px] text-text-muted">
            {t("inspector.manualDecision.adminNote.noSensitiveData")}
          </p>
        </div>

        {/* Supersede warning */}
        {hasExistingFinal && latestFinalDecision ? (
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  {t("inspector.manualDecision.supersede.warningTitle")}
                </p>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                  {t("inspector.manualDecision.supersede.warningNote")}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-200/50 bg-amber-100/30 p-3 dark:border-amber-500/20 dark:bg-amber-500/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                {t("inspector.manualDecision.supersede.currentFinal")}
              </p>
              <p className="mt-1 text-sm font-medium text-amber-900 dark:text-amber-100">
                {latestFinalDecisionTypeKey ? t(latestFinalDecisionTypeKey as Parameters<typeof t>[0]) : ""}
              </p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                {latestFinalReasonCodeKey ? t(latestFinalReasonCodeKey as Parameters<typeof t>[0]) : ""}
              </p>
            </div>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={supersedeChecked}
                onChange={(e) => setSupersedeChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border-light accent-primary"
              />
              <span className="text-sm text-amber-800 dark:text-amber-200">
                {t("inspector.manualDecision.supersede.checkboxLabel")}
              </span>
            </label>
          </div>
        ) : null}

        {/* Three required confirmations */}
        <div className="space-y-3">
          {[
            {
              checked: confirmEvidenceReviewed,
              onChange: setConfirmEvidenceReviewed,
              label: t("inspector.manualDecision.confirmations.evidenceReviewed"),
            },
            {
              checked: confirmNoAutomaticRefund,
              onChange: setConfirmNoAutomaticRefund,
              label: t("inspector.manualDecision.confirmations.noAutomaticRefund"),
            },
            {
              checked: confirmNoAutomaticPayout,
              onChange: setConfirmNoAutomaticPayout,
              label: t("inspector.manualDecision.confirmations.noAutomaticPayout"),
            },
          ].map(({ checked, onChange, label }, idx) => (
            <label key={idx} className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border-light accent-primary"
              />
              <span className="text-sm text-text-secondary dark:text-white/70">
                {label}
              </span>
            </label>
          ))}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
            isFormValid && !isSubmitting
              ? "bg-primary text-white hover:bg-primary-hover"
              : "cursor-not-allowed bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/40"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("inspector.manualDecision.actions.submitting")}
            </>
          ) : (
            t("inspector.manualDecision.actions.submit")
          )}
        </button>
      </form>
    </section>
  );
}
