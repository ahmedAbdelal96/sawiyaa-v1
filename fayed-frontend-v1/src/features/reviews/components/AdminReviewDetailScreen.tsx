"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ArrowRight, Loader2, Star } from "lucide-react";
import { useAdminReview, useModerateReview } from "../hooks/use-reviews";
import { ALLOWED_MODERATION_ACTIONS } from "../types/reviews.types";
import type { ReviewModerationAction, SessionReviewStatus } from "../types/reviews.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
      <span className="ms-1 text-sm font-medium text-text-secondary">{rating}/5</span>
    </span>
  );
}

const STATUS_BADGE: Partial<Record<SessionReviewStatus, string>> = {
  PENDING_MODERATION:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  PUBLISHED:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  REJECTED: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  HIDDEN: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/60",
  ARCHIVED: "bg-zinc-100 text-zinc-500 dark:bg-white/8 dark:text-white/40",
  DRAFT: "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light",
  SUBMITTED: "bg-primary-light text-text-brand dark:bg-primary/15 dark:text-primary-light",
};

// ---------------------------------------------------------------------------
// Moderation panel
// ---------------------------------------------------------------------------

function ModerationPanel({
  reviewId,
  status,
}: {
  reviewId: string;
  status: SessionReviewStatus;
}) {
  const t = useTranslations("reviews");
  const [selectedAction, setSelectedAction] = useState<ReviewModerationAction | "">("");
  const [moderatorNote, setModeratorNote] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const moderate = useModerateReview(reviewId);
  const allowedActions = ALLOWED_MODERATION_ACTIONS[status] ?? [];

  async function handleSubmit() {
    if (!selectedAction) return;
    setFeedback(null);
    try {
      await moderate.mutateAsync({
        action: selectedAction,
        moderatorNote: moderatorNote.trim() || undefined,
      });
      setSelectedAction("");
      setModeratorNote("");
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

      <div className="mt-4 space-y-4">
        {/* Current status */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-text-muted">
            {t("admin.moderation.currentStatus")}
          </p>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
              STATUS_BADGE[status] ?? "bg-surface-tertiary text-text-muted dark:bg-white/10"
            }`}
          >
            {t(`admin.statuses.${status}` as Parameters<typeof t>[0])}
          </span>
        </div>

        {/* Action selector */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">
            {t("admin.moderation.actionLabel")}
          </label>
          <select
            value={selectedAction}
            onChange={(e) =>
              setSelectedAction(e.target.value as ReviewModerationAction | "")
            }
            className="w-full rounded-xl border border-border-light bg-surface-secondary px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none dark:border-white/12 dark:bg-white/6 dark:text-white/95"
          >
            <option value="">{t("admin.moderation.selectAction")}</option>
            {allowedActions.map((action) => (
              <option key={action} value={action}>
                {t(`admin.actions.${action}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
        </div>

        {/* Moderator note */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-muted">
            {t("admin.moderation.noteLabel")}
          </label>
          <textarea
            value={moderatorNote}
            onChange={(e) => setModeratorNote(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={t("admin.moderation.notePlaceholder")}
            className="w-full resize-none rounded-xl border border-border-light bg-surface-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none dark:border-white/12 dark:bg-white/6 dark:text-white/95"
          />
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedAction || moderate.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {moderate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {moderate.isPending
            ? t("admin.moderation.submitting")
            : t("admin.moderation.submit")}
        </button>

        {/* Feedback */}
        {feedback && (
          <p
            className={`text-xs ${
              feedback.type === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {feedback.message}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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
        <div className="h-8 w-32 animate-pulse rounded bg-surface-tertiary dark:bg-white/10" />
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

  const { item } = data;
  const badgeClass =
    STATUS_BADGE[item.status] ?? "bg-surface-tertiary text-text-muted dark:bg-white/10";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      {/* Back link + heading */}
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
      </div>

      {/* Two-column layout */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* Left: review content */}
        <div className="app-panel rounded-[24px] p-6">
          {/* Status + rating row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StarRating rating={item.overallRating} />
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}>
              {t(`admin.statuses.${item.status}` as Parameters<typeof t>[0])}
            </span>
          </div>

          {/* Title */}
          {item.title && (
            <h2 className="mt-4 text-base font-semibold text-text-primary dark:text-white/95">
              {item.title}
            </h2>
          )}

          {/* Body */}
          {item.textReview ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
              {item.textReview}
            </p>
          ) : (
            <p className="mt-3 text-sm italic text-text-muted">{t("admin.detail.noText")}</p>
          )}

          {/* Metadata grid */}
          <dl className="mt-6 grid gap-x-6 gap-y-3 border-t border-border-light pt-5 dark:border-white/8 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-text-muted">
                {t("admin.detail.practitioner")}
              </dt>
              <dd className="mt-0.5 text-sm text-text-primary dark:text-white/90">
                {item.practitioner.displayName ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-text-muted">
                {t("admin.detail.patientProfileId")}
              </dt>
              <dd className="mt-0.5 font-mono text-xs text-text-secondary">
                {item.patientProfileId}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-text-muted">
                {t("admin.detail.sessionDate")}
              </dt>
              <dd className="mt-0.5 text-sm text-text-secondary">
                {formatDate(item.session.scheduledStartAt, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-text-muted">
                {t("admin.detail.submittedAt")}
              </dt>
              <dd className="mt-0.5 text-sm text-text-secondary">
                {formatDate(item.submittedAt, locale)}
              </dd>
            </div>
            {item.publishedAt && (
              <div>
                <dt className="text-xs font-medium text-text-muted">
                  {t("admin.detail.publishedAt")}
                </dt>
                <dd className="mt-0.5 text-sm text-text-secondary">
                  {formatDate(item.publishedAt, locale)}
                </dd>
              </div>
            )}
            {item.moderatedAt && (
              <div>
                <dt className="text-xs font-medium text-text-muted">
                  {t("admin.detail.moderatedAt")}
                </dt>
                <dd className="mt-0.5 text-sm text-text-secondary">
                  {formatDate(item.moderatedAt, locale)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Right: moderation panel */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ModerationPanel reviewId={reviewId} status={item.status} />
        </div>
      </div>
    </div>
  );
}
