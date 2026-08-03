"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { ListStateSkeleton } from "@/components/shared/ContentStates";
import { useAdminSessionManualDecisions } from "../hooks/use-admin-session-manual-decisions";
import type { AdminSessionDecisionItem } from "../types/admin-session-manual-decisions.types";
import { formatInspectorDateTime } from "../lib/inspector-utils";
import { useRuntimeViewerTimeZone } from "../lib/runtime-time";

/**
 * Safely resolve a translation label.
 * Uses the current locale to select the correct fallback string.
 * Falls back to unknownAr/unknownEn only when the key is genuinely missing.
 *
 * next-intl returns the full namespace-prefixed key when a translation is missing
 * (e.g. "admin-session-runtime.inspector.manualDecision.reasonCode.MISSING").
 * We detect this by checking if the returned string starts with the namespace prefix.
 */
function safeLabel(
  t: ReturnType<typeof useTranslations>,
  locale: string,
  key: string,
  unknownAr: string,
  unknownEn: string,
): string {
  const translated = t(key as Parameters<typeof t>[0]);
  // next-intl returns the full namespace key when translation is missing
  // e.g. "admin-session-runtime.inspector.manualDecision.reasonCode.MISSING"
  if (translated === key || translated.startsWith("admin-session-runtime.")) {
    return locale === "ar" ? unknownAr : unknownEn;
  }
  return translated;
}

/**
 * Resolve a reason code label with a reason-specific unknown fallback.
 * reasonCode unknown: Arabic "سبب غير معروف", English "Unknown reason"
 */
function getReasonCodeLabel(
  t: ReturnType<typeof useTranslations>,
  locale: string,
  reasonCode: string,
): string {
  return safeLabel(
    t,
    locale,
    `inspector.manualDecision.reasonCode.${reasonCode}`,
    "سبب غير معروف",
    "Unknown reason",
  );
}

function DecisionSnapshot({
  item,
  t,
  locale,
}: {
  item: AdminSessionDecisionItem;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  const summary = item.attendanceSummarySnapshot;
  const recommended = item.recommendedOutcomeSnapshot;

  return (
    <div className="border-border-light mt-2 rounded-xl border p-3 dark:border-white/8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-start"
      >
        <span className="text-text-muted text-[11px] font-semibold tracking-[0.18em] uppercase">
          {t("inspector.manualDecision.history.snapshot.evidenceSnapshotAt")}
        </span>
        <ChevronDown
          className={`text-text-muted h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="mt-3 space-y-2">
          {recommended ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-text-muted text-[11px] font-medium">
                {t(
                  "inspector.manualDecision.history.snapshot.recommendedOutcome",
                )}
                :
              </span>
              <span className="bg-surface-tertiary text-text-secondary rounded-full px-2 py-0.5 text-[11px] font-medium dark:bg-white/10 dark:text-white/70">
                {recommended.recommendedOutcome
                  ? safeLabel(
                      t,
                      locale,
                      `inspector.outcomes.${recommended.recommendedOutcome}`,
                      "غير معروف",
                      "Unknown",
                    )
                  : "—"}
              </span>
            </div>
          ) : null}
          {summary ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-text-muted text-[11px] font-medium">
                  {t("inspector.manualDecision.history.snapshot.patientJoined")}
                  :
                </span>
                <span className="text-text-secondary text-[11px] font-medium dark:text-white/70">
                  {summary.patient?.hasJoined === true
                    ? t("labels.yes")
                    : summary.patient?.hasJoined === false
                      ? t("labels.no")
                      : "—"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-text-muted text-[11px] font-medium">
                  {t(
                    "inspector.manualDecision.history.snapshot.practitionerJoined",
                  )}
                  :
                </span>
                <span className="text-text-secondary text-[11px] font-medium dark:text-white/70">
                  {summary.practitioner?.hasJoined === true
                    ? t("labels.yes")
                    : summary.practitioner?.hasJoined === false
                      ? t("labels.no")
                      : "—"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-text-muted text-[11px] font-medium">
                  {t(
                    "inspector.manualDecision.history.snapshot.overlapMinutes",
                  )}
                  :
                </span>
                <span className="text-text-secondary text-[11px] font-medium dark:text-white/70">
                  {summary.overlap?.overlapMinutes != null
                    ? `${summary.overlap.overlapMinutes} min`
                    : "—"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-text-muted text-[11px] font-medium">
                  {t(
                    "inspector.manualDecision.history.snapshot.sourceConfidence",
                  )}
                  :
                </span>
                <span className="text-text-secondary text-[11px] font-medium dark:text-white/70">
                  {summary.meeting?.sourceConfidence ?? "—"}
                </span>
              </div>
              {recommended?.riskFlags && recommended.riskFlags.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-text-muted text-[11px] font-medium">
                    {t("inspector.manualDecision.history.snapshot.riskFlags")}:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {recommended.riskFlags.slice(0, 3).map((flag) => (
                      <span
                        key={flag}
                        className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                      >
                        {safeLabel(
                          t,
                          locale,
                          `inspector.outcomes.${flag}`,
                          flag,
                          flag,
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DecisionCard({
  item,
  t,
  locale,
}: {
  item: AdminSessionDecisionItem;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}) {
  const viewerTimeZone = useRuntimeViewerTimeZone();
  // Safe label resolution — never show raw enum values
  const decisionTypeLabel = safeLabel(
    t,
    locale,
    `inspector.manualDecision.decisionType.${item.decisionType}`,
    "غير معروف",
    "Unknown",
  );
  const reasonCodeLabel = getReasonCodeLabel(t, locale, item.reasonCode);

  const statusLabel = item.nextSessionStatus
    ? safeLabel(
        t,
        locale,
        `statuses.${item.nextSessionStatus}`,
        "غير معروف",
        "Unknown",
      )
    : t("inspector.manualDecision.history.noStatusChange");

  const createdAt = item.createdAt
    ? formatInspectorDateTime(item.createdAt, locale, viewerTimeZone)
    : "—";

  return (
    <div className="border-border-light rounded-2xl border p-4 dark:border-white/8">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-text-primary text-sm font-semibold dark:text-white/95">
            {decisionTypeLabel}
          </span>
          {item.isFinal ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              {t("inspector.manualDecision.history.finalBadge")}
            </span>
          ) : (
            <span className="bg-surface-tertiary text-text-muted inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold dark:bg-white/10 dark:text-white/70">
              {t("inspector.manualDecision.history.supersededBadge")}
            </span>
          )}
        </div>
        <span className="text-text-muted text-[11px]">{createdAt}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <span className="text-text-secondary text-xs dark:text-white/70">
          {t("inspector.manualDecision.history.decidedBy")}{" "}
          {item.decidedBy?.displayName ??
            t("inspector.manualDecision.history.decidedByUnknown")}
        </span>
        <span className="text-text-secondary text-xs dark:text-white/70">
          {reasonCodeLabel}
        </span>
        <span className="text-text-secondary text-xs dark:text-white/70">
          {statusLabel}
        </span>
      </div>

      {item.previousSessionStatus ? (
        <div className="mt-1.5">
          <span className="text-text-muted text-xs">
            {t("inspector.manualDecision.history.previousStatus")}{" "}
            <span className="text-text-secondary dark:text-white/70">
              {safeLabel(
                t,
                locale,
                `statuses.${item.previousSessionStatus}`,
                "غير معروف",
                "Unknown",
              )}
            </span>
          </span>
        </div>
      ) : null}

      {item.supersedesDecisionId ? (
        <div className="mt-1.5">
          <span className="text-text-muted text-xs">
            {t("inspector.manualDecision.history.supersedesRelation")}{" "}
            <span className="text-text-muted font-mono text-[11px]">
              {item.supersedesDecisionId.slice(0, 8)}...
            </span>
          </span>
        </div>
      ) : null}

      {item.adminNote ? (
        <p className="text-text-secondary mt-2 line-clamp-2 text-xs leading-5 dark:text-white/70">
          {item.adminNote}
        </p>
      ) : null}

      <DecisionSnapshot item={item} t={t} locale={locale} />
    </div>
  );
}

export default function AdminSessionManualDecisionHistory({
  sessionId,
}: {
  sessionId: string;
}) {
  const t = useTranslations("admin-session-runtime");
  const locale = useLocale();
  const decisions = useAdminSessionManualDecisions(sessionId);

  const items: AdminSessionDecisionItem[] = decisions.data?.items ?? [];

  return (
    <section className="app-panel rounded-[28px] p-5 sm:p-6">
      <h2 className="text-text-primary text-base font-semibold dark:text-white/95">
        {t("inspector.manualDecision.history.title")}
      </h2>

      {decisions.isLoading ? (
        <ListStateSkeleton items={2} heightClass="h-24" />
      ) : items.length === 0 ? (
        <p className="text-text-secondary mt-3 text-sm dark:text-white/70">
          {t("inspector.manualDecision.history.empty")}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <DecisionCard key={item.id} item={item} t={t} locale={locale} />
          ))}
        </div>
      )}
    </section>
  );
}
