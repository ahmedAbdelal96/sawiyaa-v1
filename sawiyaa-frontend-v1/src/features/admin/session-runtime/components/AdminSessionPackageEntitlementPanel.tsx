"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { formatInspectorDateTime } from "../lib/inspector-utils";
import { getAdminSessionPackageEntitlementErrorKey } from "../lib/admin-session-runtime-errors";
import { useCreateAdminSessionPackageEntitlementDecision } from "../hooks/use-admin-session-runtime";
import type {
  AdminSessionPackageEntitlementDecisionType,
  AdminSessionPackageEntitlementReasonCode,
  AdminSessionRuntimeInspectionItem,
} from "../types/admin-session-runtime.types";

const DECISION_TYPES: AdminSessionPackageEntitlementDecisionType[] = [
  "RESTORE_TO_PACKAGE",
  "COUNT_AS_USED",
];

const REASON_CODES: AdminSessionPackageEntitlementReasonCode[] = [
  "PATIENT_FAULT",
  "PATIENT_NO_SHOW",
  "PRACTITIONER_FAULT",
  "ADMIN_EXCEPTION",
];

function safeLabel(
  t: ReturnType<typeof useTranslations>,
  locale: string,
  key: string,
  fallbackAr: string,
  fallbackEn: string,
): string {
  const translated = t(key as Parameters<typeof t>[0]);
  if (translated === key || translated.startsWith("admin-session-runtime.")) {
    return locale === "ar" ? fallbackAr : fallbackEn;
  }
  return translated;
}

function formatSnapshotAmount(
  amount: string | null,
  currencyCode: string | null,
  notAvailable: string,
): string {
  if (!amount || !currencyCode) {
    return notAvailable;
  }
  return `${amount} ${currencyCode}`;
}

function SummaryRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-light py-3 last:border-b-0 dark:border-white/8">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span
        className={`text-sm text-text-primary dark:text-white/90 ${mono ? "font-mono text-xs sm:text-sm" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function getDecisionTone(decisionType: AdminSessionPackageEntitlementDecisionType | null) {
  if (decisionType === "RESTORE_TO_PACKAGE") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  }
  if (decisionType === "COUNT_AS_USED") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
  }
  return "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/70";
}

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `pkg-entitlement-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AdminSessionPackageEntitlementPanel({
  item,
  hasWritePermission,
}: {
  item: AdminSessionRuntimeInspectionItem;
  hasWritePermission?: boolean;
}) {
  const t = useTranslations("admin-session-runtime");
  const locale = useLocale();
  const mutation = useCreateAdminSessionPackageEntitlementDecision();
  const [decisionType, setDecisionType] = useState<AdminSessionPackageEntitlementDecisionType | null>(null);
  const [reasonCode, setReasonCode] = useState<AdminSessionPackageEntitlementReasonCode | "">("");
  const [adminNote, setAdminNote] = useState("");
  const [successVisible, setSuccessVisible] = useState(false);
  const [lastSubmittedDecisionType, setLastSubmittedDecisionType] = useState<AdminSessionPackageEntitlementDecisionType | null>(null);

  const packagePurchase = item.packagePurchase ?? null;
  const existingDecision = item.packageEntitlementDecision ?? null;
  const canWrite = hasWritePermission !== false;

  const statusKey = packagePurchase
    ? `inspector.packageEntitlement.purchaseStatuses.${packagePurchase.status}`
    : null;
  const statusLabel = packagePurchase && statusKey
    ? safeLabel(
        t,
        locale,
        statusKey,
        "\u062d\u0627\u0644\u0629 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641\u0629",
        "Unknown status",
      )
    : t("inspector.notAvailable");

  const errorMessage = mutation.error
    ? t(getAdminSessionPackageEntitlementErrorKey(mutation.error) as Parameters<typeof t>[0])
    : null;

  const submitDisabled = !decisionType || !reasonCode || mutation.isPending;

  if (!packagePurchase) {
    return null;
  }

  const sessionProgress =
    item.packageSessionIndex && item.packageSessionCount
      ? `${item.packageSessionIndex} / ${item.packageSessionCount}`
      : t("inspector.notAvailable");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!decisionType || !reasonCode) {
      return;
    }

    try {
      await mutation.mutateAsync({
        sessionId: item.id,
        body: {
          decisionType,
          reasonCode,
          adminNote: adminNote.trim() || null,
          idempotencyKey: makeIdempotencyKey(),
        },
      });
      setLastSubmittedDecisionType(decisionType);
      setSuccessVisible(true);
      setDecisionType(null);
      setReasonCode("");
      setAdminNote("");
      window.setTimeout(() => setSuccessVisible(false), 4000);
    } catch {
      // Surfaced via mutation.error.
    }
  };

  return (
    <section className="app-panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light">
            <Info className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
              {t("inspector.packageEntitlement.title")}
            </h2>
            <p className="text-xs text-text-secondary">
              {t("inspector.packageEntitlement.subtitle")}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-surface-tertiary px-2.5 py-1 text-[11px] font-semibold text-text-muted dark:bg-white/10 dark:text-white/80">
          {t("inspector.packageEntitlement.summary.tag")}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs leading-6 text-amber-800 dark:text-amber-200">
            {t("inspector.packageEntitlement.safetyNotice")}
          </p>
        </div>
      </div>

      {successVisible ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              {t("inspector.packageEntitlement.success.title")}
            </p>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
              {lastSubmittedDecisionType === "COUNT_AS_USED"
                ? t("inspector.packageEntitlement.success.countAsUsedNote")
                : t("inspector.packageEntitlement.success.restoreToPackageNote")}
            </p>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <p className="text-xs leading-6 text-rose-800 dark:text-rose-200">{errorMessage}</p>
        </div>
      ) : null}

      <div className="mt-5 rounded-[24px] border border-border-light px-4 dark:border-white/8">
        <SummaryRow
          label={t("inspector.packageEntitlement.current.plan")}
          value={packagePurchase.packagePlan.title}
        />
        <SummaryRow
          label={t("inspector.packageEntitlement.current.purchaseStatus")}
          value={statusLabel}
        />
        <SummaryRow
          label={t("inspector.packageEntitlement.current.currency")}
          value={packagePurchase.selectedCurrencyCode ?? t("inspector.notAvailable")}
        />
        <SummaryRow
          label={t("inspector.packageEntitlement.current.payableSnapshot")}
          value={formatSnapshotAmount(
            packagePurchase.patientPayableTotalSnapshot,
            packagePurchase.selectedCurrencyCode,
            t("inspector.notAvailable"),
          )}
        />
        <SummaryRow
          label={t("inspector.packageEntitlement.current.sessionProgress")}
          value={sessionProgress}
        />
      </div>

      {existingDecision ? (
        <div className="mt-5 space-y-4 rounded-[24px] border border-border-light bg-surface-secondary/50 p-4 dark:border-white/8 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("inspector.packageEntitlement.recorded.title")}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {t("inspector.packageEntitlement.recorded.note")}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getDecisionTone(existingDecision.decisionType)}`}>
              {safeLabel(
                t,
                locale,
                `inspector.packageEntitlement.decisionType.${existingDecision.decisionType}`,
                "\u062a\u0645 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0642\u0631\u0627\u0631",
                "Decision recorded",
              )}
            </span>
          </div>

          <div className="rounded-[20px] border border-border-light px-4 dark:border-white/8">
            <SummaryRow
              label={t("inspector.packageEntitlement.recorded.decisionType")}
              value={safeLabel(
                t,
                locale,
                `inspector.packageEntitlement.decisionType.${existingDecision.decisionType}`,
                "\u0627\u062e\u062a\u064a\u0627\u0631 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641",
                "Unknown selection",
              )}
            />
            <SummaryRow
              label={t("inspector.packageEntitlement.recorded.reasonCode")}
              value={safeLabel(
                t,
                locale,
                `inspector.packageEntitlement.reasonCode.${existingDecision.reasonCode}`,
                "\u0633\u0628\u0628 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641",
                "Unknown reason",
              )}
            />
            {existingDecision.adminNote ? (
              <SummaryRow
                label={t("inspector.packageEntitlement.recorded.adminNote")}
                value={existingDecision.adminNote}
              />
            ) : null}
            <SummaryRow
              label={t("inspector.packageEntitlement.recorded.decidedBy")}
              value={
                existingDecision.decidedBy.displayName?.trim() ||
                t("inspector.packageEntitlement.recorded.teamAdmin")
              }
            />
            <SummaryRow
              label={t("inspector.packageEntitlement.recorded.decidedAt")}
              value={formatInspectorDateTime(existingDecision.decidedAt, locale)}
            />
            {existingDecision.resultingSessionEarningReviewId ? (
              <SummaryRow
                label={t("inspector.packageEntitlement.recorded.resultingReview")}
                value={existingDecision.resultingSessionEarningReviewId}
                mono
              />
            ) : null}
          </div>
        </div>
      ) : canWrite ? (
        <form onSubmit={handleSubmit} className="mt-5 space-y-5 rounded-[24px] border border-border-light bg-white p-4 dark:border-white/8 dark:bg-white/[0.03]">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("inspector.packageEntitlement.decisionType.label")}
            </label>
            <div className="space-y-2">
              {DECISION_TYPES.map((type) => {
                const selected = decisionType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDecisionType(type)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-start transition ${
                      selected
                        ? "border-primary/30 bg-primary-light/30 dark:border-primary/40 dark:bg-primary/10"
                        : "border-border-light bg-white dark:border-white/8 dark:bg-white/5"
                    }`}
                  >
                    <span
                      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected
                          ? "border-primary bg-primary dark:border-primary-light dark:bg-primary-light"
                          : "border-border-light dark:border-white/20"
                      }`}
                    >
                      {selected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                    </span>
                    <span className="text-sm font-medium text-text-secondary dark:text-white/80">
                      {safeLabel(
                        t,
                        locale,
                        `inspector.packageEntitlement.decisionType.${type}`,
                        "\u0627\u062e\u062a\u064a\u0627\u0631 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641",
                        "Unknown selection",
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {decisionType ? (
            <div className="rounded-2xl border border-border-light bg-surface-tertiary p-4 dark:border-white/8 dark:bg-white/[0.03]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("inspector.packageEntitlement.decisionPreview.label")}
              </p>
              <p className="mt-1 text-sm font-medium text-text-secondary dark:text-white/80">
                {safeLabel(
                  t,
                  locale,
                  `inspector.packageEntitlement.decisionPreview.${decisionType}`,
                  "\u0642\u0631\u0627\u0631 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641",
                  "Unknown decision",
                )}
              </p>
            </div>
          ) : null}

          <div>
            <label
              htmlFor={`package-reason-${item.id}`}
              className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted"
            >
              {t("inspector.packageEntitlement.reasonCode.label")}
            </label>
            <select
              id={`package-reason-${item.id}`}
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value as AdminSessionPackageEntitlementReasonCode | "")}
              className="w-full rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
            >
              <option value="">{t("inspector.packageEntitlement.reasonCode.placeholder")}</option>
              {REASON_CODES.map((code) => (
                <option key={code} value={code}>
                  {safeLabel(
                    t,
                    locale,
                    `inspector.packageEntitlement.reasonCode.${code}`,
                    "\u0633\u0628\u0628 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641",
                    "Unknown reason",
                  )}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor={`package-note-${item.id}`}
                className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted"
              >
                {t("inspector.packageEntitlement.adminNote.label")}
              </label>
              <span className="text-[11px] text-text-muted">
                {2000 - adminNote.length} {t("inspector.packageEntitlement.adminNote.remaining", { count: 2000 - adminNote.length })}
              </span>
            </div>
            <textarea
              id={`package-note-${item.id}`}
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value.slice(0, 2000))}
              placeholder={t("inspector.packageEntitlement.adminNote.placeholder")}
              rows={3}
              className="w-full resize-none rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary/35 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
            />
            <p className="mt-1.5 text-[11px] text-text-muted">
              {t("inspector.packageEntitlement.adminNote.noSensitiveData")}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitDisabled}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
              !submitDisabled
                ? "bg-primary text-white hover:bg-primary-hover"
                : "cursor-not-allowed bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/40"
            }`}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("inspector.packageEntitlement.actions.submitting")}
              </>
            ) : (
              t("inspector.packageEntitlement.actions.submit")
            )}
          </button>
        </form>
      ) : (
        <div className="mt-5 rounded-[24px] border border-border-light bg-surface-secondary/50 p-4 dark:border-white/8 dark:bg-white/[0.03]">
          <p className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("inspector.packageEntitlement.noPermission.title")}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {t("inspector.packageEntitlement.noPermission.note")}
          </p>
        </div>
      )}
    </section>
  );
}
