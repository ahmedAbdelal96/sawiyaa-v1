"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  usePractitionerApplicationStatus,
  usePractitionerReadiness,
  useSubmitPractitionerApplication,
} from "../hooks/use-practitioners";
import { Skeleton } from "@/components/shared/LoadingStates";
import type { PractitionerApplicationStatus as AppStatus } from "../types/practitioners.types";

// ---------------------------------------------------------------------------
// Status badge colours
// ---------------------------------------------------------------------------

const statusColour: Record<AppStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  SUBMITTED: "bg-primary-light text-text-brand dark:bg-primary/20 dark:text-primary-light",
  UNDER_REVIEW: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  APPROVED: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  CHANGES_REQUESTED: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  ARCHIVED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PractitionerApplicationStatus() {
  const t = useTranslations("practitioner-area");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    data: appData,
    isLoading: appLoading,
    isError: appError,
    refetch: refetchApp,
  } = usePractitionerApplicationStatus();

  const {
    data: readinessData,
    isLoading: readinessLoading,
  } = usePractitionerReadiness();

  const { mutate: submitApp, isPending: isSubmitting, isError: isSubmitError } =
    useSubmitPractitionerApplication();

  const isLoading = appLoading || readinessLoading;

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Skeleton className="mb-3 h-4 w-32" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Skeleton className="mb-4 h-4 w-40" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="mb-2 h-3 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Error
  // -------------------------------------------------------------------------

  if (appError || !appData) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
            <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
            </svg>
          </div>
          <p className="mb-4 text-sm font-medium text-gray-800 dark:text-white">
            {t("application.feedback.loadError")}
          </p>
          <button
            type="button"
            onClick={() => refetchApp()}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t("application.feedback.retry")}
          </button>
        </div>
      </div>
    );
  }

  const app = appData.application;
  const readiness = readinessData?.readiness;
  const canSubmit = app.canSubmitApplication;

  // Statuses where the application lifecycle is in a non-interactive state.
  // For these, we show a contextual message and hide the submit UI.
  // CHANGES_REQUESTED is intentionally NOT in this list — the practitioner
  // must be able to re-submit after addressing the requested changes.
  const INFORM_ONLY_STATUSES: AppStatus[] = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "ARCHIVED"];
  const isInformOnly = app.status !== null && INFORM_ONLY_STATUSES.includes(app.status);

  const handleSubmit = () => {
    setSubmitSuccess(false);
    submitApp(undefined, {
      onSuccess: () => setSubmitSuccess(true),
    });
  };

  return (
    <div className="space-y-4">

      {/* Application status card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
          {t("application.status.heading")}
        </p>
        {app.status ? (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              statusColour[app.status as AppStatus]
            }`}
          >
            {t(`application.status.${app.status as AppStatus}`)}
          </span>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("application.status.noApplication")}
          </p>
        )}
        {app.reviewNotes && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{app.reviewNotes}</p>
        )}
      </div>

      {/* Readiness checks */}
      {readiness && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("application.readiness.heading")}
          </p>

          {readiness.missingRequirements.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-success-600 dark:text-success-400">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t("application.readiness.allPassed")}
            </div>
          ) : (
            <div>
              <p className="mb-2 text-xs font-medium text-gray-400 dark:text-gray-500">
                {t("application.readiness.missing")}
              </p>
              <ul className="space-y-1">
                {readiness.missingRequirements.map((req) => (
                  <li key={req} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning-400" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Contextual message for non-interactive statuses */}
      {isInformOnly && app.status && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t(`application.statusMessage.${app.status as AppStatus}`)}
          </p>
        </div>
      )}

      {/* Submit section — shown for null / DRAFT / CHANGES_REQUESTED / REJECTED */}
      {!isInformOnly && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {canSubmit
              ? t("application.submit.confirmHint")
              : t("application.submit.notReady")}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              disabled={!canSubmit || isSubmitting}
              onClick={handleSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-theme-xs transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isSubmitting
                ? t("application.submit.submitting")
                : t("application.submit.label")}
            </button>

            {submitSuccess && (
              <p className="text-sm font-medium text-success-600 dark:text-success-400">
                {t("application.feedback.submitSuccess")}
              </p>
            )}
            {isSubmitError && (
              <p className="text-sm font-medium text-error-500">
                {t("application.feedback.submitError")}
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
