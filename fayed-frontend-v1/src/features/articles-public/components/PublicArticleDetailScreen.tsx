import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PublicArticleTrustBadges from "./PublicArticleTrustBadges";
import type { PublicArticleDetails } from "../types/articles-public.types";

type Props = {
  article: PublicArticleDetails;
};

export default async function PublicArticleDetailScreen({ article }: Props) {
  const [t, format] = await Promise.all([
    getTranslations("public-articles"),
    getFormatter(),
  ]);

  const publishedLabel = article.publishedAt
    ? format.dateTime(new Date(article.publishedAt), {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : t("detail.noPublishDate");

  return (
    <article className="bg-surface px-6 py-12 dark:bg-surface">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <span className="rtl:rotate-180">←</span>
          {t("detail.backToArticles")}
        </Link>

        <header className="app-panel space-y-5 rounded-[34px] p-7 md:p-9">
          <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
            {article.category?.title ? (
              <span className="rounded-full bg-surface-tertiary px-3 py-1 font-medium dark:bg-white/6">
                {article.category.title}
              </span>
            ) : null}
            <span>{publishedLabel}</span>
            {article.trust.authorDisplayName ? (
              <span>
                {t("card.byAuthor", {
                  author: article.trust.authorDisplayName,
                })}
              </span>
            ) : null}
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-[-0.03em] text-text-primary dark:text-white/92">
              {article.title}
            </h1>
            {article.excerpt ? (
              <p className="text-lg leading-8 text-text-secondary">
                {article.excerpt}
              </p>
            ) : null}
          </div>

          <PublicArticleTrustBadges trust={article.trust} />
        </header>

        {article.coverImageUrl ? (
          <div className="overflow-hidden rounded-[32px] border border-border-light bg-white dark:bg-surface">
            <img
              src={article.coverImageUrl}
              alt={article.title}
              className="h-auto max-h-[440px] w-full object-cover"
            />
          </div>
        ) : null}

        <section className="app-panel rounded-[34px] p-7 md:p-9">
          <div
            className="prose prose-lg max-w-none prose-headings:text-text-primary prose-p:text-text-secondary prose-a:text-primary dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </section>

        <section className="app-panel-soft rounded-[30px] p-6 md:p-7">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-text-primary dark:text-white/92">
              {t("detail.nextStep.title")}
            </h2>
            <p className="text-sm leading-7 text-text-secondary">
              {t("detail.nextStep.note")}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
          href="/signup?mode=patient"
              className="inline-flex items-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              {t("detail.nextStep.startMatching")}
            </Link>
            <Link
              href="/practitioners"
              className="inline-flex items-center rounded-2xl border border-border-light px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-primary hover:bg-primary-light hover:text-primary dark:text-white/90"
            >
              {t("detail.nextStep.browsePractitioners")}
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
