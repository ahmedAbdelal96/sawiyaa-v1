import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { PublicArticleListItem } from "@/features/articles-public/types/articles-public.types";

type PractitionerTrustSummary = {
  averageOverallRating: number | null;
  totalPublicReviews: number;
  totalPublishedReviews: number;
  totalSubmittedReviews: number;
  latestPublishedReviewAt: string | null;
  hasEnoughPublicReviews: boolean;
  volumeLevel: "NONE" | "LOW" | "ESTABLISHED";
  freshness: "NONE" | "RECENT" | "STALE";
  rationaleCodes: string[];
};

type PublicReviewItem = {
  id: string;
  overallRating: number;
  textReview: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
};

type Props = {
  trustBlock: {
    summary: PractitionerTrustSummary;
    highlightedReviews: PublicReviewItem[];
    contentSuggestions: PublicArticleListItem[];
  };
};

export default async function ProfileTrustSection({ trustBlock }: Props) {
  const [t, format] = await Promise.all([
    getTranslations("practitioner-profile.trust"),
    getFormatter(),
  ]);

  const { summary, highlightedReviews, contentSuggestions } = trustBlock;
  const ratingValue =
    summary.averageOverallRating !== null
      ? summary.averageOverallRating.toFixed(1)
      : t("summary.noRating");

  return (
    <section className="app-panel rounded-[34px] p-6 md:p-7">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
            {t("eyebrow")}
          </p>
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-text-primary dark:text-white/92">
            {t("title")}
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-text-secondary">
            {t("description")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="app-panel-soft rounded-[24px] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("summary.averageRating")}
            </p>
            <p className="mt-3 text-3xl font-bold text-text-primary dark:text-white/92">
              {ratingValue}
            </p>
          </div>
          <div className="app-panel-soft rounded-[24px] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("summary.publicReviews")}
            </p>
            <p className="mt-3 text-3xl font-bold text-text-primary dark:text-white/92">
              {summary.totalPublicReviews}
            </p>
          </div>
          <div className="app-panel-soft rounded-[24px] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t("summary.freshness")}
            </p>
            <p className="mt-3 text-base font-semibold text-text-primary dark:text-white/92">
              {t(`freshness.${summary.freshness}`)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {summary.rationaleCodes.map((code) => (
            <span
              key={code}
              className="rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary dark:bg-white/6 dark:text-white/70"
            >
              {t(`rationale.${code}`)}
            </span>
          ))}
        </div>

        {highlightedReviews.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-text-primary dark:text-white/92">
              {t("reviews.title")}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {highlightedReviews.map((review) => {
                const publishedLabel = review.publishedAt
                  ? format.dateTime(new Date(review.publishedAt), {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : null;

                return (
                  <article
                    key={review.id}
                    className="app-panel-soft rounded-[24px] p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-text-primary dark:text-white/92">
                        {t("reviews.rating", { rating: review.overallRating })}
                      </p>
                      {publishedLabel ? (
                        <span className="text-xs text-text-muted">{publishedLabel}</span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-text-secondary">
                      {review.textReview ?? t("reviews.noText")}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}

        {contentSuggestions.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-text-primary dark:text-white/92">
              {t("content.title")}
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {contentSuggestions.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.slug}`}
                  className="app-panel-soft rounded-[24px] p-5 transition-transform hover:-translate-y-1"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">
                    {article.category?.title ?? t("content.general")}
                  </p>
                  <h4 className="mt-3 text-base font-bold leading-7 text-text-primary dark:text-white/92">
                    {article.title}
                  </h4>
                  <p className="mt-2 text-sm leading-7 text-text-secondary">
                    {article.excerpt ?? t("content.fallbackExcerpt")}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="app-panel-soft flex flex-col gap-4 rounded-[24px] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text-primary dark:text-white/92">
              {t("nextSteps.title")}
            </p>
            <p className="text-sm leading-7 text-text-secondary">
              {t("nextSteps.note")}
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Link
            href="/signup?mode=patient"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover sm:text-xs"
            >
              {t("nextSteps.matching")}
            </Link>
            <Link
              href="/articles"
              className="inline-flex items-center justify-center rounded-2xl border border-border-light px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary hover:bg-primary-light hover:text-primary dark:text-white/90 sm:text-xs"
            >
              {t("nextSteps.articles")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
