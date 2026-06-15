"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ShieldCheck } from "lucide-react";
import type { AdminSessionInspectorRecommendation } from "../types/admin-session-runtime.types";
import {
  OUTCOME_TONE,
  OUTCOME_TONE_CLASS,
  type OutcomeTone,
} from "../lib/inspector-utils";
import { resolveInspectorReason } from "../lib/inspector-reason";

const TOP_FLAGS_LIMIT = 3;

export default function AdminSessionInspectorRecommendationPanel({
  recommendation,
}: {
  recommendation: AdminSessionInspectorRecommendation;
}) {
  const t = useTranslations("admin-session-runtime");
  const [showAll, setShowAll] = useState(false);

  const tone: OutcomeTone = OUTCOME_TONE[recommendation.recommendedOutcome];
  const outcomeLabel = t(
    `inspector.outcomes.${recommendation.recommendedOutcome}` as Parameters<typeof t>[0],
  );
  const reason = resolveInspectorReason(
    recommendation.recommendedOutcome,
    recommendation.recommendedReason,
    t,
  );
  const allFlags = recommendation.riskFlags ?? [];
  const topFlags = allFlags.slice(0, TOP_FLAGS_LIMIT);
  const remainingCount = Math.max(0, allFlags.length - TOP_FLAGS_LIMIT);

  return (
    <section className="app-panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
            {t("inspector.recommendation.title")}
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            {t("inspector.recommendation.subtitle")}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${OUTCOME_TONE_CLASS[tone]}`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {outcomeLabel}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-border-light p-4 dark:border-white/8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
          {t("inspector.recommendation.reason")}
        </p>
        <p className="mt-2 text-sm leading-6 text-text-primary dark:text-white/95">
          {reason}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2.5 py-1 text-[11px] font-semibold text-text-muted dark:bg-white/10 dark:text-white/80">
          {t("inspector.recommendation.isFinalDecision")}
        </span>
        <span className="inline-flex items-center rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold text-text-brand dark:bg-primary/15 dark:text-primary-light">
          {t("inspector.recommendation.requiresAdminReview")}
        </span>
      </div>

      {allFlags.length > 0 ? (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t("inspector.recommendation.topRiskFlags")}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {(showAll ? allFlags : topFlags).map((flag) => (
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
          {remainingCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:underline"
            >
              {showAll
                ? t("inspector.recommendation.hideAllRisks")
                : t("inspector.recommendation.showAllRisks")}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  showAll ? "rotate-180" : ""
                }`}
              />
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
