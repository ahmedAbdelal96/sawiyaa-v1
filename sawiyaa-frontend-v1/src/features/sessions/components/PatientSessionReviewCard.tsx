"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertCircle, CheckCircle2, Loader2, Star } from "lucide-react";
import Button from "@/components/ui/button/Button";
import TextArea from "@/components/form/input/TextArea";
import { toAppError } from "@/lib/api/errors";
import { formatViewerDateTime } from "@/lib/time-formatting";
import {
  usePatientReviews,
  useSubmitPatientSessionReview,
} from "@/features/reviews";
import { getPatientReviewErrorKey } from "@/features/reviews/lib/reviews-errors";
import type { PatientReviewItem } from "@/features/reviews/types/reviews.types";

type Props = {
  sessionId: string;
  practitionerName: string;
  completedAt: string | null;
};

type SessionTranslator = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

function formatDateTime(isoString: string | null, locale: string): string {
  return formatViewerDateTime(isoString, { locale: locale === "ar" ? "ar-SA" : "en-US" });
}

function StarButton({
  value,
  active,
  onClick,
}: {
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Rate ${value} out of 5`}
      aria-pressed={active}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
        active
          ? "border-primary bg-primary-light text-primary"
          : "border-border-light bg-white text-text-muted hover:border-primary/30 hover:text-primary dark:bg-white/5"
      }`}
    >
      <Star className={`h-4 w-4 ${active ? "fill-current" : "fill-transparent"}`} />
    </button>
  );
}

function ReviewSuccessCard({
  review,
  locale,
  t,
}: {
  review: PatientReviewItem;
  locale: string;
  t: SessionTranslator;
}) {
  const submittedAt = formatDateTime(review.submittedAt, locale);

  return (
    <div className="rounded-[28px] border border-success-200 bg-success-50 p-5 dark:border-success-500/20 dark:bg-success-500/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-success-600 shadow-sm dark:bg-surface-secondary dark:text-success-300">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-success-800 dark:text-success-200">
              {t("detail.reviewCard.successHeading")}
            </p>
            <p className="mt-1 text-sm leading-6 text-success-800/80 dark:text-success-100/80">
              {t("detail.reviewCard.successNote")}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-success-700 dark:bg-white/10 dark:text-success-200">
          {t(`detail.reviewCard.statuses.${review.status}` as Parameters<typeof t>[0])}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-success-200/80 bg-white px-4 py-3 dark:border-success-500/20 dark:bg-white/5">
          <p className="text-xs text-text-muted">{t("detail.reviewCard.fields.rating")}</p>
          <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
            {t("detail.reviewCard.ratingValue", { value: review.overallRating })}
          </p>
        </div>
        <div className="rounded-2xl border border-success-200/80 bg-white px-4 py-3 dark:border-success-500/20 dark:bg-white/5">
          <p className="text-xs text-text-muted">{t("detail.reviewCard.fields.submittedAt")}</p>
          <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
            {submittedAt || t("detail.reviewCard.notAvailable")}
          </p>
        </div>
        <div className="rounded-2xl border border-success-200/80 bg-white px-4 py-3 dark:border-success-500/20 dark:bg-white/5">
          <p className="text-xs text-text-muted">{t("detail.reviewCard.fields.practitioner")}</p>
          <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
            {review.practitioner.displayName ?? review.practitioner.slug}
          </p>
        </div>
      </div>

      {review.title || review.textReview ? (
        <div className="mt-4 rounded-2xl border border-success-200/80 bg-white px-4 py-3 dark:border-success-500/20 dark:bg-white/5">
          {review.title ? (
            <p className="text-sm font-semibold text-text-primary dark:text-white/90">
              {review.title}
            </p>
          ) : null}
          {review.textReview ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-text-secondary">
              {review.textReview}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={`/patient/reviews/${review.id}` as never}
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
        >
          {t("detail.reviewCard.viewDetail")}
        </Link>
        <Link
          href="/patient/reviews"
          className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary dark:bg-white/5 dark:text-white/90"
        >
          {t("detail.reviewCard.viewHistory")}
        </Link>
      </div>
    </div>
  );
}

export default function PatientSessionReviewCard({
  sessionId,
  practitionerName,
  completedAt,
}: Props) {
  const t = useTranslations("sessions");
  const locale = useLocale();
  const reviewListQuery = usePatientReviews(
    { page: 1, limit: 100 },
    Boolean(completedAt),
  );
  const submitMutation = useSubmitPatientSessionReview(sessionId);
  const [overallRating, setOverallRating] = useState(0);
  const [title, setTitle] = useState("");
  const [textReview, setTextReview] = useState("");
  const [submittedReview, setSubmittedReview] = useState<PatientReviewItem | null>(null);
  const [submitErrorKeyState, setSubmitErrorKeyState] = useState<string | null>(null);

  const existingReview = useMemo(
    () => reviewListQuery.data?.items.find((item) => item.sessionId === sessionId) ?? null,
    [reviewListQuery.data?.items, sessionId],
  );

  const activeReview = submittedReview ?? existingReview;

  if (!completedAt) {
    return null;
  }

  if (activeReview) {
    return (
      <section className="rounded-[28px] border border-success-200 bg-white p-5 shadow-[0_16px_34px_-28px_rgba(34,52,56,0.18)] dark:border-success-500/20 dark:bg-surface-secondary">
        <div className="mb-4 flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-300">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-success-700 dark:text-success-300">
              {t("detail.reviewCard.eyebrow")}
            </p>
            <h3 className="mt-1 text-base font-semibold text-text-primary dark:text-white/95">
              {t("detail.reviewCard.reviewedHeading")}
            </h3>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {t("detail.reviewCard.reviewedNote")}
            </p>
          </div>
        </div>
        <ReviewSuccessCard review={activeReview} locale={locale} t={t} />
      </section>
    );
  }

  const resolvedSubmitErrorKey = submitErrorKeyState
    ? submitErrorKeyState
    : submitMutation.error
      ? getPatientReviewErrorKey(submitMutation.error)
      : null;

  return (
    <section className="rounded-[28px] border border-border-light bg-white p-5 shadow-[0_16px_34px_-28px_rgba(34,52,56,0.18)] dark:border-border-light dark:bg-surface-secondary">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {t("detail.reviewCard.eyebrow")}
          </p>
          <h3 className="mt-1 text-base font-semibold text-text-primary dark:text-white/95">
            {t("detail.reviewCard.heading")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {t("detail.reviewCard.note")}
          </p>
        </div>

        <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-text-brand dark:bg-primary/15 dark:text-primary-light">
          {t("detail.reviewCard.eligibility")}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/5">
          <p className="text-xs text-text-muted">{t("detail.reviewCard.context.practitioner")}</p>
          <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
            {practitionerName}
          </p>
        </div>
        <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/5">
          <p className="text-xs text-text-muted">{t("detail.reviewCard.context.completedAt")}</p>
          <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
            {formatDateTime(completedAt, locale) || t("detail.reviewCard.notAvailable")}
          </p>
        </div>
        <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/5">
          <p className="text-xs text-text-muted">{t("detail.reviewCard.context.privacy")}</p>
          <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
            {t("detail.reviewCard.privacyNote")}
          </p>
        </div>
      </div>

      {resolvedSubmitErrorKey ? (
        <div className="mt-4 rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{t(resolvedSubmitErrorKey as Parameters<typeof t>[0])}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-semibold text-text-primary dark:text-white/90">
              {t("detail.reviewCard.ratingLabel")}
            </label>
            <span className="text-xs text-text-muted">
              {overallRating > 0
                ? t("detail.reviewCard.ratingPicked", { value: overallRating })
                : t("detail.reviewCard.ratingHelp")}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => {
              const value = index + 1;
              return (
                <StarButton
                  key={value}
                  value={value}
                  active={value <= overallRating}
                  onClick={() => setOverallRating(value)}
                />
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-text-primary dark:text-white/90">
            {t("detail.reviewCard.titleLabel")}
          </span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, 191))}
            placeholder={t("detail.reviewCard.titlePlaceholder")}
            className="w-full rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary/40 focus:bg-white dark:bg-white/5 dark:text-white/90 dark:focus:bg-surface-secondary"
            maxLength={191}
          />
          <p className="mt-2 text-xs text-text-muted">{t("detail.reviewCard.titleHint")}</p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-text-primary dark:text-white/90">
            {t("detail.reviewCard.noteLabel")}
          </span>
          <TextArea
            value={textReview}
            onChange={(value) => setTextReview(value.slice(0, 4000))}
            rows={6}
            placeholder={t("detail.reviewCard.notePlaceholder")}
            className="min-h-[160px] rounded-2xl"
            hint={t("detail.reviewCard.noteHint")}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          size="sm"
          onClick={async () => {
            if (overallRating < 1) {
              setSubmitErrorKeyState("detail.reviewCard.errors.ratingRequired");
              return;
            }

            setSubmitErrorKeyState(null);

            try {
              const result = await submitMutation.mutateAsync({
                overallRating,
                title: title.trim() || undefined,
                textReview: textReview.trim() || undefined,
              });
              setSubmittedReview(result.item);
            } catch (error) {
              const appError = toAppError(error);
              const errorKey = getPatientReviewErrorKey(appError);
              setSubmitErrorKeyState(errorKey);
            }
          }}
          disabled={submitMutation.isPending}
          startIcon={submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        >
          {submitMutation.isPending
            ? t("detail.reviewCard.submitting")
            : t("detail.reviewCard.submit")}
        </Button>

        <Link
          href="/patient/reviews"
          className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary dark:bg-white/5 dark:text-white/90"
        >
          {t("detail.reviewCard.viewHistory")}
        </Link>
      </div>
    </section>
  );
}
