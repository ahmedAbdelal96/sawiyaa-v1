"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ArrowRight, Loader2, Star, User, Calendar, FileText } from "lucide-react";
import Badge from "@/components/ui/badge/Badge";
import { useAdminReview, useModerateReview } from "../hooks/use-reviews";
import { ALLOWED_MODERATION_DECISIONS } from "../types/reviews.types";
import type {
  ReviewModerationDecision,
  ReviewModerationRequestDecision,
  SessionReviewStatus,
} from "../types/reviews.types";
import type { ReactNode } from "react";

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRatingLabel(rating: number) {
  return `${rating}/5`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-border-light dark:text-white/20"
          }`}
        />
      ))}
      <span className="ms-1.5 text-sm font-semibold text-text-primary dark:text-white">{getRatingLabel(rating)}</span>
    </span>
  );
}

const DECISION_BADGE_COLOR: Record<ReviewModerationDecision, Parameters<typeof Badge>[0]["color"]> = {
  AUTO_APPROVED_POSITIVE: "success",
  APPROVED_AS_IS: "success",
  EDITED_AND_APPROVED: "success",
  REJECTED_PUBLISHING: "error",
  INTERNAL_NOTE_ONLY: "info",
  EXCLUDED_FROM_PUBLIC_AVERAGE: "warning",
};

type DecisionCard = {
  decision: ReviewModerationRequestDecision;
  titleKey: string;
  descriptionKey: string;
};

function DecisionChoice({
  selected,
  title,
  description,
  onSelect,
  tone,
}: {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
  tone: "success" | "warning" | "error" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/10"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10"
        : tone === "error"
          ? "border-rose-200 bg-rose-50/70 dark:border-rose-500/20 dark:bg-rose-500/10"
          : "border-sky-200 bg-sky-50/70 dark:border-sky-500/20 dark:bg-sky-500/10";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border p-3.5 text-start transition w-full ${
        selected
          ? `${toneClass} ring-1 ring-primary`
          : "border-border-light bg-white hover:border-primary/40 dark:border-white/10 dark:bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-text-primary dark:text-white/95">{title}</p>
          {selected && (
            <p className="text-[11px] leading-relaxed text-text-secondary mt-1">{description}</p>
          )}
        </div>
        <span
          className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${
            selected
              ? "border-primary bg-primary text-white"
              : "border-border-light text-text-muted dark:border-white/20"
          }`}
        >
          {selected ? "✓" : ""}
        </span>
      </div>
    </button>
  );
}

function ModerationPanel({
  reviewId,
  status,
  originalRatingValue,
  t,
}: {
  reviewId: string;
  status: SessionReviewStatus;
  originalRatingValue: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const [selectedDecision, setSelectedDecision] = useState<
    ReviewModerationRequestDecision | ""
  >("");
  const [publicRatingValue, setPublicRatingValue] = useState<number>(originalRatingValue);
  const [moderationReason, setModerationReason] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const moderate = useModerateReview(reviewId);
  const allowedDecisions = ALLOWED_MODERATION_DECISIONS[status] ?? [];

  const decisionCards: DecisionCard[] = [
    {
      decision: "APPROVED_AS_IS",
      titleKey: "admin.moderation.decisions.APPROVED_AS_IS.title",
      descriptionKey: "admin.moderation.decisions.APPROVED_AS_IS.description",
    },
    {
      decision: "EDITED_AND_APPROVED",
      titleKey: "admin.moderation.decisions.EDITED_AND_APPROVED.title",
      descriptionKey: "admin.moderation.decisions.EDITED_AND_APPROVED.description",
    },
    {
      decision: "REJECTED_PUBLISHING",
      titleKey: "admin.moderation.decisions.REJECTED_PUBLISHING.title",
      descriptionKey: "admin.moderation.decisions.REJECTED_PUBLISHING.description",
    },
    {
      decision: "INTERNAL_NOTE_ONLY",
      titleKey: "admin.moderation.decisions.INTERNAL_NOTE_ONLY.title",
      descriptionKey: "admin.moderation.decisions.INTERNAL_NOTE_ONLY.description",
    },
    {
      decision: "EXCLUDED_FROM_PUBLIC_AVERAGE",
      titleKey: "admin.moderation.decisions.EXCLUDED_FROM_PUBLIC_AVERAGE.title",
      descriptionKey: "admin.moderation.decisions.EXCLUDED_FROM_PUBLIC_AVERAGE.description",
    },
  ];

  const selectedDecisionConfig = decisionCards.find((item) => item.decision === selectedDecision);
  const requiresPublicRating = selectedDecision === "EDITED_AND_APPROVED";
  const requiresReason = Boolean(selectedDecision) && selectedDecision !== "APPROVED_AS_IS";

  const validate = () => {
    if (!selectedDecision) {
      return t("admin.validation.decisionRequired");
    }

    if (requiresPublicRating && !Number.isInteger(publicRatingValue)) {
      return t("admin.validation.publicRatingRequired");
    }

    if (requiresPublicRating && (publicRatingValue < 1 || publicRatingValue > 5)) {
      return t("admin.validation.publicRatingRange");
    }

    if (requiresReason && !moderationReason.trim()) {
      return t("admin.validation.moderationReasonRequired");
    }

    return null;
  };

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setFeedback({ type: "error", message: validationError });
      return;
    }

    if (!selectedDecision) return;

    setFeedback(null);
    try {
      await moderate.mutateAsync({
        decision: selectedDecision,
        publicRatingValue: requiresPublicRating ? publicRatingValue : undefined,
        moderationReason: moderationReason.trim() || undefined,
      });
      setSelectedDecision("");
      setModerationReason("");
      setPublicRatingValue(originalRatingValue);
      setFeedback({ type: "success", message: t("admin.moderation.success") });
    } catch {
      setFeedback({ type: "error", message: t("admin.moderation.error") });
    }
  }

  return (
    <div className="app-panel rounded-[24px] p-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
        {t("admin.moderation.heading")}
      </h2>

      <div className="mt-4 space-y-2.5">
        {decisionCards
          .filter((item) => allowedDecisions.includes(item.decision))
          .map((item) => (
            <DecisionChoice
              key={item.decision}
              selected={selectedDecision === item.decision}
              title={t(item.titleKey as Parameters<typeof t>[0])}
              description={t(item.descriptionKey as Parameters<typeof t>[0])}
              onSelect={() => {
                setSelectedDecision(item.decision);
                if (item.decision !== "EDITED_AND_APPROVED") {
                  setPublicRatingValue(originalRatingValue);
                }
                setFeedback(null);
              }}
              tone={
                item.decision === "REJECTED_PUBLISHING"
                  ? "error"
                  : item.decision === "EXCLUDED_FROM_PUBLIC_AVERAGE"
                    ? "warning"
                    : item.decision === "INTERNAL_NOTE_ONLY"
                      ? "info"
                      : "success"
              }
            />
          ))}
      </div>

      {selectedDecisionConfig ? (
        <div className="mt-4 space-y-4 rounded-[18px] border border-border-light bg-surface-secondary/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          {requiresPublicRating ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-text-muted">
                {t("admin.detail.publicRating")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  const active = value <= publicRatingValue;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPublicRatingValue(value)}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                        active
                          ? "border-primary bg-primary-light text-primary"
                          : "border-border-light bg-white text-text-muted hover:border-primary/40 dark:bg-white/5"
                      }`}
                      aria-label={t("admin.detail.selectPublicRating", { value })}
                    >
                      <Star className={`h-4 w-4 ${active ? "fill-current" : "fill-transparent"}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-muted">
              {t("admin.moderation.reasonLabel")}
              {requiresReason ? " *" : ""}
            </span>
            <textarea
              value={moderationReason}
              onChange={(event) => setModerationReason(event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder={t("admin.moderation.reasonPlaceholder")}
              className="w-full resize-none rounded-xl border border-border-light bg-white px-3 py-2 text-xs text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary/40 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/95"
            />
          </label>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedDecision || moderate.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {moderate.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {moderate.isPending
            ? t("admin.moderation.submitting")
            : t("admin.moderation.submit")}
        </button>

        {feedback ? (
          <div
            className={`rounded-xl border px-3 py-2 text-xs ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="app-panel space-y-5 rounded-[24px] p-6">
        <div className="h-5 w-32 animate-pulse rounded bg-surface-tertiary dark:bg-white/10" />
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-surface-tertiary dark:bg-white/10" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-surface-tertiary dark:bg-white/10" />
        </div>
      </div>
      <div className="app-panel h-48 animate-pulse rounded-[24px]" />
    </div>
  );
}

interface Props {
  reviewId: string;
}

export default function AdminReviewDetailScreen({ reviewId }: Props) {
  const t = useTranslations("reviews");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const { data, isLoading, isError, refetch } = useAdminReview(reviewId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 animate-pulse rounded bg-surface-tertiary dark:bg-white/10" />
        <DetailSkeleton />
      </div>
    );
  }

  if (isError || !data?.item) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-text-secondary">{t("admin.states.detailError.message")}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 text-xs font-medium text-primary hover:underline"
        >
          {t("admin.states.detailError.retry")}
        </button>
      </div>
    );
  }

  const item = data.item;
  const originalRatingValue = item.originalRatingValue ?? item.overallRating;
  const publicRatingValue = item.publicRatingValue;
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const displayDecision = item.moderationDecision ?? null;
  const countsLabel = item.countsInPublicAverage
    ? t("admin.detail.countsInAverage")
    : t("admin.detail.excludedFromAverage");

  return (
    <div className="space-y-6">
      {/* Header section with back navigation and compact status badges */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-light pb-4 dark:border-white/10">
        <div>
          <Link
            href="/admin/reviews"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-primary transition-colors"
          >
            <BackIcon className="h-3.5 w-3.5" />
            {t("admin.detail.back")}
          </Link>
          <h1 className="mt-1.5 text-xl font-bold tracking-tight text-text-primary dark:text-white/95">
            {t("admin.detail.heading")}
          </h1>
        </div>
        
        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="light" size="sm" color="dark">
            {t(`admin.statuses.${item.status}` as Parameters<typeof t>[0])}
          </Badge>
          {displayDecision ? (
            <Badge
              variant="light"
              size="sm"
              color={DECISION_BADGE_COLOR[displayDecision]}
            >
              {t(`admin.decisions.${displayDecision}` as Parameters<typeof t>[0])}
            </Badge>
          ) : (
            <Badge variant="light" size="sm" color="warning">
              {t("admin.decisions.pending")}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        
        {/* Left Column: Details Area */}
        <div className="space-y-5">
          
          {/* Summary Card */}
          <section className="app-panel rounded-[20px] p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {t("admin.detail.sessionSection")}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-text-muted">{t("admin.detail.practitioner")}</span>
                <p className="text-sm font-bold text-text-primary dark:text-white">{item.practitioner.displayName ?? t("admin.detail.unknown")}</p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-text-muted">{t("admin.detail.patient")}</span>
                <p className="text-sm font-bold text-text-primary dark:text-white">
                  {item.patient.isAnonymous
                    ? <span className="italic text-text-muted">{t("admin.detail.anonymousPatient")}</span>
                    : item.patient.displayName ?? t("admin.detail.patientFallback")}
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-text-muted">{t("admin.detail.sessionDate")}</span>
                <p className="text-sm font-medium text-text-primary dark:text-white">{formatDate(item.session.scheduledStartAt, locale)}</p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-text-muted">{t("admin.detail.submittedAt")}</span>
                <p className="text-sm font-medium text-text-primary dark:text-white">{formatDate(item.submittedAt, locale)}</p>
              </div>
            </div>
          </section>

          {/* Rating Section */}
          <section className="app-panel rounded-[20px] p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5" />
              {locale === "ar" ? "تفاصيل التقييم" : "Rating Details"}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3 text-xs">
              <div className="space-y-1.5 border-e border-border-light/60 last:border-0 dark:border-white/5">
                <span className="font-semibold text-text-muted">{t("admin.detail.originalRating")}</span>
                <div>
                  <StarRating rating={originalRatingValue} />
                </div>
              </div>
              
              <div className="space-y-1.5 border-e border-border-light/60 last:border-0 dark:border-white/5">
                <span className="font-semibold text-text-muted">{t("admin.detail.publicRating")}</span>
                <div>
                  {publicRatingValue != null ? (
                    <StarRating rating={publicRatingValue} />
                  ) : (
                    <span className="text-text-muted font-medium">—</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-semibold text-text-muted">{t("admin.detail.averageContribution")}</span>
                <div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-[11px] ${
                    item.countsInPublicAverage
                      ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                      : "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400"
                  }`}>
                    {countsLabel}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Comment Section */}
          <section className="app-panel rounded-[20px] p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {t("admin.detail.patientNote")}
            </h2>
            <div className="mt-3.5 rounded-xl border border-border-light bg-surface-secondary/50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
              {item.title ? (
                <p className="text-sm font-bold text-text-primary dark:text-white mb-2">
                  {item.title}
                </p>
              ) : null}
              {item.textReview ? (
                <p className="text-xs leading-6 text-text-secondary whitespace-pre-wrap">
                  {item.textReview}
                </p>
              ) : (
                <p className="text-xs italic text-text-muted">{t("admin.detail.noText")}</p>
              )}
            </div>
          </section>

          {/* Moderation History (Rendered compactly only when history/previous moderation exists) */}
          {item.moderatedAt ? (
            <section className="app-panel rounded-[20px] p-5 border border-border-light/60 dark:border-white/5">
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">
                {locale === "ar" ? "تاريخ المراجعة" : "Moderation History"}
              </h2>
              <div className="mt-3.5 grid gap-3 sm:grid-cols-3 text-xs leading-normal">
                <div>
                  <span className="font-semibold text-text-muted">{t("admin.detail.moderatedBy")}</span>
                  <p className="mt-1 font-semibold text-text-primary dark:text-white">
                    {item.moderatedByUserId
                      ? t("admin.detail.moderatedByFallback")
                      : t("admin.detail.none")}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-text-muted">{t("admin.detail.moderatedAt")}</span>
                  <p className="mt-1 font-semibold text-text-primary dark:text-white">{formatDate(item.moderatedAt, locale)}</p>
                </div>
                <div>
                  <span className="font-semibold text-text-muted">{t("admin.detail.moderationReason")}</span>
                  <p className="mt-1 text-text-secondary max-w-[200px] truncate" title={item.moderationReason || ""}>
                    {item.moderationReason?.trim() || t("admin.detail.none")}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

        </div>

        {/* Right Column: Moderation Side Actions Panel */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <ModerationPanel
            reviewId={reviewId}
            status={item.status}
            originalRatingValue={originalRatingValue}
            t={t}
          />
        </div>

      </div>
    </div>
  );
}
