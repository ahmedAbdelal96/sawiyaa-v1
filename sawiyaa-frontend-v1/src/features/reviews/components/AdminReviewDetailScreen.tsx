"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ArrowRight, Loader2, Star } from "lucide-react";
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
    <span className="inline-flex items-center gap-1">
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
      <span className="ms-1 text-sm font-medium text-text-secondary">{getRatingLabel(rating)}</span>
    </span>
  );
}

const DECISION_BADGE_COLOR: Record<ReviewModerationDecision, Parameters<typeof Badge>[0]["color"]> = {
  AUTO_APPROVED_POSITIVE: "success",
  APPROVE_AS_IS: "success",
  EDIT_AND_APPROVE: "success",
  REJECT_PUBLISHING: "error",
  INTERNAL_NOTE_ONLY: "info",
  EXCLUDE_FROM_PUBLIC_AVERAGE: "warning",
};

type DecisionCard = {
  decision: ReviewModerationRequestDecision;
  titleKey: string;
  descriptionKey: string;
};

function SummaryField({
  label,
  value,
}: {
  label: string;
  value: string | ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-text-primary dark:text-white/90">{value}</dd>
    </div>
  );
}

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
      className={`rounded-[22px] border p-4 text-start transition ${
        selected
          ? `${toneClass} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-surface-secondary`
          : "border-border-light bg-white hover:border-primary/40 dark:border-white/10 dark:bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-text-primary dark:text-white/95">{title}</p>
          <p className="text-xs leading-6 text-text-secondary">{description}</p>
        </div>
        <span
          className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${
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
      decision: "APPROVE_AS_IS",
      titleKey: "admin.moderation.decisions.APPROVE_AS_IS.title",
      descriptionKey: "admin.moderation.decisions.APPROVE_AS_IS.description",
    },
    {
      decision: "EDIT_AND_APPROVE",
      titleKey: "admin.moderation.decisions.EDIT_AND_APPROVE.title",
      descriptionKey: "admin.moderation.decisions.EDIT_AND_APPROVE.description",
    },
    {
      decision: "REJECT_PUBLISHING",
      titleKey: "admin.moderation.decisions.REJECT_PUBLISHING.title",
      descriptionKey: "admin.moderation.decisions.REJECT_PUBLISHING.description",
    },
    {
      decision: "INTERNAL_NOTE_ONLY",
      titleKey: "admin.moderation.decisions.INTERNAL_NOTE_ONLY.title",
      descriptionKey: "admin.moderation.decisions.INTERNAL_NOTE_ONLY.description",
    },
    {
      decision: "EXCLUDE_FROM_PUBLIC_AVERAGE",
      titleKey: "admin.moderation.decisions.EXCLUDE_FROM_PUBLIC_AVERAGE.title",
      descriptionKey: "admin.moderation.decisions.EXCLUDE_FROM_PUBLIC_AVERAGE.description",
    },
  ];

  const selectedDecisionConfig = decisionCards.find((item) => item.decision === selectedDecision);
  const requiresPublicRating = selectedDecision === "EDIT_AND_APPROVE";
  const requiresReason = Boolean(selectedDecision) && selectedDecision !== "APPROVE_AS_IS";

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

      <p className="mt-2 text-sm leading-6 text-text-secondary">
        {t("admin.moderation.note")}
      </p>

      <div className="mt-4 space-y-3">
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
                if (item.decision !== "EDIT_AND_APPROVE") {
                  setPublicRatingValue(originalRatingValue);
                }
                setFeedback(null);
              }}
              tone={
                item.decision === "REJECT_PUBLISHING"
                  ? "error"
                  : item.decision === "EXCLUDE_FROM_PUBLIC_AVERAGE"
                    ? "warning"
                    : item.decision === "INTERNAL_NOTE_ONLY"
                      ? "info"
                      : "success"
              }
            />
          ))}
      </div>

      {selectedDecisionConfig ? (
        <div className="mt-5 space-y-4 rounded-[22px] border border-border-light bg-surface-secondary/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div>
            <p className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("admin.moderation.selectedDecision")}
            </p>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {t(selectedDecisionConfig.titleKey as Parameters<typeof t>[0])}
            </p>
          </div>

          {requiresPublicRating ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("admin.detail.publicRating")}
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  const active = value <= publicRatingValue;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPublicRatingValue(value)}
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
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
              <p className="text-xs text-text-muted">
                {t("admin.detail.publicRatingHint")}
              </p>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-text-primary dark:text-white/90">
              {t("admin.moderation.reasonLabel")}
              {requiresReason ? " *" : ""}
            </span>
            <textarea
              value={moderationReason}
              onChange={(event) => setModerationReason(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder={t("admin.moderation.reasonPlaceholder")}
              className="w-full resize-none rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary/40 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/95"
            />
            <p className="mt-2 text-xs text-text-muted">
              {requiresReason
                ? t("admin.moderation.reasonRequiredHint")
                : t("admin.moderation.reasonOptionalHint")}
            </p>
          </label>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedDecision || moderate.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {moderate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {moderate.isPending
            ? t("admin.moderation.submitting")
            : t("admin.moderation.submit")}
        </button>

        {feedback ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div className="app-panel space-y-5 rounded-[24px] p-6">
        <div className="h-5 w-32 animate-pulse rounded bg-surface-tertiary dark:bg-white/10" />
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-surface-tertiary dark:bg-white/10" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-surface-tertiary dark:bg-white/10" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-surface-tertiary dark:bg-white/10" />
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
      <div>
        <Link
          href="/admin/reviews"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
        >
          <BackIcon className="h-4 w-4" />
          {t("admin.detail.back")}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95">
          {t("admin.detail.heading")}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
          {t("admin.detail.subtitle")}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <section className="app-panel rounded-[24px] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StarRating rating={originalRatingValue} />
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

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[18px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("admin.detail.originalRating")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary dark:text-white/95">
                  {getRatingLabel(originalRatingValue)}
                </p>
              </div>
              <div className="rounded-[18px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("admin.detail.publicRating")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary dark:text-white/95">
                  {publicRatingValue != null ? getRatingLabel(publicRatingValue) : "—"}
                </p>
              </div>
              <div className="rounded-[18px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("admin.detail.averageContribution")}
                </p>
                <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
                  {countsLabel}
                </p>
              </div>
              <div className="rounded-[18px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("admin.detail.moderationState")}
                </p>
                <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
                  {displayDecision
                    ? t(`admin.decisions.${displayDecision}` as Parameters<typeof t>[0])
                    : t("admin.decisions.pending")}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              <div className="rounded-[18px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("admin.detail.moderationReason")}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                  {item.moderationReason?.trim() || t("admin.detail.none")}
                </p>
              </div>
              <div className="rounded-[18px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("admin.detail.moderatedBy")}
                </p>
                <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
                  {item.moderatedByUserId
                    ? t("admin.detail.moderatedByFallback")
                    : t("admin.detail.none")}
                </p>
              </div>
            </div>
            {item.moderatedAt ? (
              <div className="mt-3 rounded-[18px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  {t("admin.detail.moderatedAt")}
                </p>
                <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white/95">
                  {formatDate(item.moderatedAt, locale)}
                </p>
              </div>
            ) : null}
          </section>

          <section className="app-panel rounded-[24px] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("admin.detail.sessionSection")}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SummaryField
                label={t("admin.detail.practitioner")}
                value={item.practitioner.displayName ?? t("admin.detail.unknown")}
              />
              <SummaryField
                label={t("admin.detail.patient")}
                value={
                  item.patient.isAnonymous
                    ? t("admin.detail.anonymousPatient")
                    : item.patient.displayName ?? t("admin.detail.patientFallback")
                }
              />
              <SummaryField
                label={t("admin.detail.sessionDate")}
                value={formatDate(item.session.scheduledStartAt, locale)}
              />
              <SummaryField
                label={t("admin.detail.submittedAt")}
                value={formatDate(item.submittedAt, locale)}
              />
            </div>
          </section>

          <section className="app-panel rounded-[24px] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("admin.detail.patientNote")}
            </h2>
            <div className="mt-4 rounded-[22px] border border-border-light bg-surface-secondary/70 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              {item.title ? (
                <p className="text-base font-semibold text-text-primary dark:text-white/95">
                  {item.title}
                </p>
              ) : null}
              {item.textReview ? (
                <p className={`${item.title ? "mt-3" : ""} whitespace-pre-wrap text-sm leading-7 text-text-secondary`}>
                  {item.textReview}
                </p>
              ) : (
                <p className="text-sm italic text-text-muted">{t("admin.detail.noText")}</p>
              )}
              <p className="mt-4 text-xs leading-6 text-text-muted">
                {t("admin.detail.internalOnlyNote")}
              </p>
            </div>
          </section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <ModerationPanel
            reviewId={reviewId}
            status={item.status}
            originalRatingValue={originalRatingValue}
            t={t}
          />

          <div className="app-panel rounded-[24px] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("admin.detail.visibility")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              {t("admin.detail.visibilityNote")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
