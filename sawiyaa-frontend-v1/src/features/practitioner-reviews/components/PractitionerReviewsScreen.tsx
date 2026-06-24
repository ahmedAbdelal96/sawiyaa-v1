"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertCircle, Star } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { usePractitionerProfile } from "@/features/practitioners/hooks/use-practitioners";
import {
  usePractitionerPublicSlug,
  usePublicPractitionerReviews,
  usePublicPractitionerTrustSummary,
} from "../hooks/use-practitioner-reviews";
import { getPractitionerReviewsErrorKey } from "../lib/practitioner-reviews-errors";

const PAGE_SIZE = 10;

function formatDate(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PractitionerReviewsScreen() {
  const t = useTranslations("practitioner-reviews");
  const locale = useLocale();
  const [page, setPage] = useState(1);

  const profile = usePractitionerProfile();
  const profileData = profile.data?.profile;

  const slugQuery = usePractitionerPublicSlug(
    profileData?.practitionerProfileId ?? null,
    profileData?.displayName ?? null,
    Boolean(profileData),
  );
  const publicSlug = slugQuery.data ?? null;

  const trustSummary = usePublicPractitionerTrustSummary(
    publicSlug,
    Boolean(publicSlug),
  );
  const reviews = usePublicPractitionerReviews(
    publicSlug,
    { page, limit: PAGE_SIZE },
    Boolean(publicSlug),
  );

  if (profile.isLoading || slugQuery.isLoading) {
    return <ListStateSkeleton items={3} heightClass="h-28" />;
  }

  if (profile.isError) {
    return (
      <StateCard
        icon={<AlertCircle className="h-5 w-5 text-primary" />}
        title={t("states.profileError.heading")}
        note={t("states.profileError.note")}
        action={{
          label: t("states.profileError.retry"),
          onClick: () => profile.refetch(),
        }}
      />
    );
  }

  if (slugQuery.isError) {
    return (
      <StateCard
        icon={<AlertCircle className="h-5 w-5 text-primary" />}
        title={t("states.error.heading")}
        note={t(getPractitionerReviewsErrorKey(slugQuery.error) as Parameters<typeof t>[0])}
        action={{
          label: t("states.error.retry"),
          onClick: () => slugQuery.refetch(),
        }}
      />
    );
  }

  if (!publicSlug) {
    return (
      <StateCard
        icon={<Star className="h-5 w-5 text-primary" />}
        title={t("states.notPublicYet.heading")}
        note={t("states.notPublicYet.note")}
        action={{
          label: t("states.notPublicYet.action"),
          href: (
            <Link
              href="/practitioner/profile"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              {t("states.notPublicYet.action")}
            </Link>
          ),
        }}
      />
    );
  }

  const summary = trustSummary.data?.summary;
  const list = reviews.data;
  const listErrorKey = reviews.error ? getPractitionerReviewsErrorKey(reviews.error) : "states.error.note";

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[32px] p-6 sm:p-7">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {t("list.eyebrow")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
          {t("list.title")}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary sm:text-base">
          {t("list.note")}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="app-panel rounded-[24px] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("summary.averageRating")}
          </p>
          <p className="mt-3 text-2xl font-semibold text-text-primary dark:text-white/95">
            {summary?.averageOverallRating?.toFixed(1) ?? t("summary.noRating")}
          </p>
        </div>
        <div className="app-panel rounded-[24px] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("summary.totalPublicReviews")}
          </p>
          <p className="mt-3 text-2xl font-semibold text-text-primary dark:text-white/95">
            {summary?.totalPublicReviews ?? 0}
          </p>
        </div>
        <div className="app-panel rounded-[24px] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("summary.freshness")}
          </p>
          <p className="mt-3 text-sm font-semibold text-text-primary dark:text-white/95">
            {summary ? t(`freshness.${summary.freshness}` as Parameters<typeof t>[0]) : "-"}
          </p>
          <p className="mt-2 text-xs text-text-secondary">
            {summary?.latestPublishedReviewAt
              ? t("summary.latestPublishedAt", {
                  value: formatDate(summary.latestPublishedReviewAt, locale),
                })
              : t("summary.noLatestPublishedAt")}
          </p>
        </div>
      </section>

      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary dark:text-white/95">
            {t("reviews.heading")}
          </h2>
          {list ? (
            <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
              {t("reviews.count", { value: list.pagination.totalItems })}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-text-secondary">{t("reviews.note")}</p>

        {reviews.isLoading ? (
          <div className="mt-4">
            <ListStateSkeleton items={3} heightClass="h-24" />
          </div>
        ) : reviews.isError ? (
          <div className="mt-4">
            <StateCard
              icon={<AlertCircle className="h-5 w-5 text-primary" />}
              title={t("states.error.heading")}
              note={t(listErrorKey as Parameters<typeof t>[0])}
              action={{
                label: t("states.error.retry"),
                onClick: () => reviews.refetch(),
              }}
            />
          </div>
        ) : !list || list.items.length === 0 ? (
          <div className="mt-4">
            <StateCard
              icon={<Star className="h-5 w-5 text-primary" />}
              title={t("states.empty.heading")}
              note={t("states.empty.note")}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {list.items.map((review) => (
              <article
                key={review.id}
                className="rounded-[22px] border border-border-light bg-surface-secondary/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t("reviews.rating", { value: review.overallRating })}
                  </p>
                  <p className="text-xs text-text-muted">
                    {t("reviews.publishedAt", { value: formatDate(review.publishedAt, locale) })}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  {review.textReview?.trim() || t("reviews.noText")}
                </p>
              </article>
            ))}
          </div>
        )}

        {list && list.pagination.totalPages > 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-text-muted">
              {t("pagination.summary", {
                from: (list.pagination.page - 1) * list.pagination.limit + 1,
                to: Math.min(list.pagination.page * list.pagination.limit, list.pagination.totalItems),
                total: list.pagination.totalItems,
              })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={list.pagination.page <= 1}
                className="rounded-xl border border-border-light px-3 py-1.5 text-xs text-text-secondary disabled:opacity-50"
              >
                {t("pagination.previous")}
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(list.pagination.totalPages, prev + 1))}
                disabled={list.pagination.page >= list.pagination.totalPages}
                className="rounded-xl border border-border-light px-3 py-1.5 text-xs text-text-secondary disabled:opacity-50"
              >
                {t("pagination.next")}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-[24px] border border-border-light bg-surface-primary p-5 text-sm leading-6 text-text-secondary dark:bg-white/5">
        <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">{t("boundaries.heading")}</h3>
        <ul className="mt-3 space-y-2">
          <li>{t("boundaries.items.readOnly")}</li>
          <li>{t("boundaries.items.noReplies")}</li>
          <li>{t("boundaries.items.noModeration")}</li>
        </ul>
      </section>
    </div>
  );
}
