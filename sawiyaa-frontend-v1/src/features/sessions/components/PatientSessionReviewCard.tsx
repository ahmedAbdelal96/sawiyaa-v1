"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Loader2, Star } from "lucide-react";
import { toAppError } from "@/lib/api/errors";
import { useAuthState } from "@/stores/auth-store";
import {
  usePatientReviews,
  useSubmitPatientSessionReview,
} from "@/features/reviews";
import { getPatientReviewErrorKey } from "@/features/reviews/lib/reviews-errors";
import type { PatientReviewItem } from "@/features/reviews/types/reviews.types";

type Props = {
  sessionId: string;
  practitionerName?: string | null;
  completedAt: string | null;
  onSubmitted?: (review: PatientReviewItem) => void;
  onCancel?: () => void;
  hideHeader?: boolean;
};

function formatCompletedAt(locale: string, value: string | null): string | null {
  if (!value) return null;

  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: locale !== "ar",
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString(locale === "ar" ? "ar-EG" : "en-US");
  }
}

export default function PatientSessionReviewCard({
  sessionId,
  practitionerName,
  completedAt,
  onSubmitted,
  onCancel,
  hideHeader = false,
}: Props) {
  const t = useTranslations("reviews");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const { user } = useAuthState();
  const reviewListQuery = usePatientReviews(
    { page: 1, limit: 100 },
    Boolean(completedAt) && Boolean(user),
  );
  const submitMutation = useSubmitPatientSessionReview(sessionId);
  const [overallRating, setOverallRating] = useState(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [textReview, setTextReview] = useState("");
  const [submittedReview, setSubmittedReview] = useState<PatientReviewItem | null>(null);
  const [submitErrorKey, setSubmitErrorKey] = useState<string | null>(null);

  const existingReview = useMemo(
    () => reviewListQuery.data?.items.find((item) => item.sessionId === sessionId) ?? null,
    [reviewListQuery.data?.items, sessionId],
  );

  const activeReview = submittedReview ?? existingReview;

  if (!completedAt) {
    return null;
  }

  // Success State
  if (activeReview) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF2F1] text-[#24564F] dark:bg-[#24564F]/20 dark:text-[#52B788]">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-text-primary dark:text-white/95">
          {t("patient.ratingModal.success")}
        </h3>
        <div className="mt-2 flex items-center justify-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-4.5 w-4.5 ${
                i < activeReview.overallRating
                  ? "fill-[#F59E0B] text-[#F59E0B]"
                  : "text-[#E5E7EB] dark:text-gray-700"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  const handleRatingSubmit = async () => {
    if (overallRating < 1) {
      setSubmitErrorKey("patient.ratingModal.validationRatingRequired");
      return;
    }

    setSubmitErrorKey(null);

    try {
      const result = await submitMutation.mutateAsync({
        overallRating,
        textReview: textReview.trim() || undefined,
      });
      setSubmittedReview(result.item);
      onSubmitted?.(result.item);
    } catch (error) {
      const appError = toAppError(error);
      const errorKey = getPatientReviewErrorKey(appError);
      setSubmitErrorKey(errorKey);
    }
  };

  const displayRating = hoverRating !== null ? hoverRating : overallRating;
  const hasPractitionerName = Boolean(practitionerName?.trim());
  const completedAtLabel = formatCompletedAt(locale, completedAt);
  const sessionContextLabel = hasPractitionerName && completedAtLabel
    ? t("patient.ratingModal.sessionContext", {
        name: practitionerName!.trim(),
        date: completedAtLabel,
      })
    : t("patient.ratingModal.sessionFallback");

  return (
    <div className="w-full text-center" dir={isRtl ? "rtl" : "ltr"}>
      {/* Title & Subtitle */}
      {!hideHeader && (
        <>
          <h3 className="text-lg font-bold text-text-primary dark:text-white/95">
            {t("patient.ratingModal.title")}
          </h3>
          <p className="mt-1.5 text-sm text-[#6B7280] dark:text-gray-300">
            {t("patient.ratingModal.subtitle")}
          </p>
        </>
      )}

      <p className="mt-3 text-xs leading-5 text-text-muted dark:text-gray-400">
        {sessionContextLabel}
      </p>

      {/* Star Selector */}
      <div className="mt-6 flex flex-col items-center">
        <div className="flex gap-2.5">
          {Array.from({ length: 5 }).map((_, index) => {
            const val = index + 1;
            const active = val <= displayRating;
            return (
              <button
                key={val}
                type="button"
                onClick={() => setOverallRating(val)}
                onMouseEnter={() => setHoverRating(val)}
                onMouseLeave={() => setHoverRating(null)}
                className="relative cursor-pointer transition-transform hover:scale-110 active:scale-95 outline-none"
                aria-label={`Rate ${val} stars`}
              >
                <Star
                  className={`h-9 w-9 transition-colors ${
                    active
                      ? "fill-[#F59E0B] text-[#F59E0B]"
                      : "text-[#E5E7EB] hover:text-[#F59E0B]/50 dark:text-gray-700"
                  }`}
                />
              </button>
            );
          })}
        </div>
        {/* Star Helper Row */}
        <div className="mt-2.5 flex w-full max-w-[220px] justify-between text-[11px] font-medium text-[#9CA3AF] dark:text-gray-400">
          <span>{t("patient.ratingModal.starHelperMin")}</span>
          <span>{t("patient.ratingModal.starHelperMax")}</span>
        </div>
      </div>

      {/* Optional Note Textarea */}
      <div className="mt-6 text-right">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-text-secondary dark:text-gray-300 text-start">
            {t("patient.ratingModal.noteLabel")}
          </span>
          <textarea
            value={textReview}
            onChange={(e) => setTextReview(e.target.value.slice(0, 4000))}
            placeholder={t("patient.ratingModal.notePlaceholder")}
            rows={3}
            className="w-full min-h-[90px] rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-[#24564F] focus:ring-1 focus:ring-[#24564F] dark:border-white/10 dark:bg-gray-800 dark:text-white"
          />
        </label>
      </div>

      {/* Validation Error */}
      {submitErrorKey ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-error-50 p-3 text-xs text-error-700 dark:bg-error-500/10 dark:text-error-400 text-start">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{t(submitErrorKey as never) || submitErrorKey}</p>
        </div>
      ) : null}

      {/* Buttons */}
      <div className="mt-6 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleRatingSubmit}
          disabled={submitMutation.isPending}
          className="flex w-full items-center justify-center rounded-xl bg-[#24564F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1A3E39] disabled:opacity-50 cursor-pointer"
        >
          {submitMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("patient.ratingModal.submit")
          )}
        </button>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex w-full items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#374151] transition hover:bg-gray-50 dark:border-white/10 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/50 cursor-pointer"
          >
            {t("patient.ratingModal.later")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
