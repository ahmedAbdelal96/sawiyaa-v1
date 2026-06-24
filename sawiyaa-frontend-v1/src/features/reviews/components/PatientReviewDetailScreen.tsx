"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CalendarDays, ClipboardList, MessageSquareText, Star } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import DirectionalArrowIcon from "@/components/ui/navigation/DirectionalArrowIcon";
import { usePatientReview } from "../hooks/use-reviews";
import { getPatientReviewErrorKey } from "../lib/reviews-errors";
import type { SessionReviewStatus } from "../types/reviews.types";

type Props = {
  reviewId: string;
};

const STATUS_TONE: Partial<Record<SessionReviewStatus, string>> = {
  SUBMITTED: "bg-primary-light text-text-brand",
  PENDING_MODERATION:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300",
  PUBLISHED: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300",
  REJECTED: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300",
  HIDDEN: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/60",
  ARCHIVED: "bg-zinc-100 text-zinc-500 dark:bg-white/8 dark:text-white/40",
};

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: locale !== "ar",
  });
}

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < value ? "fill-primary text-primary" : "fill-transparent text-border-light dark:text-white/25"}`}
        />
      ))}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-light py-3 last:border-b-0 dark:border-white/8">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span className="text-sm text-text-primary dark:text-white/90">{value}</span>
    </div>
  );
}

export default function PatientReviewDetailScreen({ reviewId }: Props) {
  const t = useTranslations("reviews");
  const locale = useLocale();
  const review = usePatientReview(reviewId);

  if (review.isLoading) {
    return <ListStateSkeleton items={2} heightClass="h-40" />;
  }

  if (review.isError || !review.data) {
    const errorKey = getPatientReviewErrorKey(review.error);
    return (
      <StateCard
        icon={<MessageSquareText className="h-6 w-6 text-primary" />}
        title={t("patient.detail.states.error.heading")}
        note={t(errorKey as Parameters<typeof t>[0])}
        action={{
          label: t("patient.detail.states.error.back"),
          href: (
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => review.refetch()}
                className="inline-flex items-center justify-center rounded-2xl border border-border-light px-5 py-2 text-sm text-text-secondary transition hover:bg-surface-tertiary dark:hover:bg-white/5"
              >
                {t("patient.detail.states.error.retry")}
              </button>
              <Link
                href="/patient/reviews"
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                {t("patient.detail.states.error.back")}
              </Link>
            </div>
          ),
        }}
      />
    );
  }

  const item = review.data.item;
  const statusClass =
    STATUS_TONE[item.status] ?? "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/70";
  const practitionerName = item.practitioner.displayName ?? item.practitioner.slug;

  return (
    <div className="space-y-5">
      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <Link
          href="/patient/reviews"
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <DirectionalArrowIcon direction="back" className="h-4 w-4" />
          {t("patient.detail.back")}
        </Link>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("patient.detail.eyebrow")}
        </p>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {item.title?.trim() || t("patient.list.untitled")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              {t("patient.detail.note")}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
            {t(`patient.statuses.${item.status}` as Parameters<typeof t>[0])}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Rating value={item.overallRating} />
          <span className="text-sm font-medium text-text-secondary">
            {t("patient.list.rating", { value: item.overallRating })}
          </span>
        </div>
      </section>

      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
          {t("patient.detail.sections.summary")}
        </h2>
        <div className="mt-4 rounded-[22px] border border-border-light px-4 dark:border-white/8">
          <DetailRow label={t("patient.detail.fields.practitioner")} value={practitionerName} />
          <DetailRow label={t("patient.detail.fields.sessionId")} value={item.sessionId} />
          <DetailRow
            label={t("patient.detail.fields.submittedAt")}
            value={formatDateTime(item.submittedAt, locale)}
          />
          <DetailRow
            label={t("patient.detail.fields.publishedAt")}
            value={formatDateTime(item.publishedAt, locale)}
          />
          <DetailRow
            label={t("patient.detail.fields.moderatedAt")}
            value={formatDateTime(item.moderatedAt, locale)}
          />
        </div>
      </section>

      <section className="app-panel-soft rounded-[28px] p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
          {t("patient.detail.sections.reviewText")}
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-text-secondary">
          {item.textReview?.trim() || t("patient.list.noText")}
        </p>
      </section>

      <section className="app-panel-soft rounded-[28px] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/15 dark:text-primary-light">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("patient.boundaries.heading")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">{t("patient.boundaries.note")}</p>
          </div>
        </div>
      </section>

      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("patient.detail.nextStep.heading")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {t("patient.detail.nextStep.note")}
            </p>
          </div>
          <Link
            href="/patient/sessions"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <ClipboardList className="h-4 w-4" />
            {t("patient.detail.nextStep.action")}
          </Link>
        </div>
      </section>
    </div>
  );
}
