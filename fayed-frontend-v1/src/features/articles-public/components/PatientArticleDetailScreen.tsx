import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PublicArticleTrustBadges from "./PublicArticleTrustBadges";
import type { PublicArticleDetails } from "../types/articles-public.types";
import { resolveCoverImageUrl } from "../lib/resolve-cover-image-url";

type Props = {
  article: PublicArticleDetails;
};

export default async function PatientArticleDetailScreen({ article }: Props) {
  const [t, format] = await Promise.all([
    getTranslations("public-articles.patient.detail"),
    getFormatter(),
  ]);

  const publishedLabel = article.publishedAt
    ? format.dateTime(new Date(article.publishedAt), {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : t("noPublishDate");
  const coverImageUrl = resolveCoverImageUrl(article.coverImageUrl);

  return (
    <article className="space-y-8">
      <Link
        href="/patient/articles"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
      >
        <span className="rtl:rotate-180">←</span>
        {t("backToArticles")}
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
            <span>{t("byAuthor", { author: article.trust.authorDisplayName })}</span>
          ) : null}
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-[-0.03em] text-text-primary dark:text-white/92">
            {article.title}
          </h1>
          {article.excerpt ? (
            <p className="text-lg leading-8 text-text-secondary">{article.excerpt}</p>
          ) : null}
        </div>

        <PublicArticleTrustBadges trust={article.trust} />
      </header>

      {coverImageUrl ? (
        <div className="overflow-hidden rounded-[32px] border border-border-light bg-white dark:bg-surface">
          <img
            src={coverImageUrl}
            alt={article.title}
            className="h-auto max-h-[560px] w-full bg-surface-tertiary object-contain"
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
            {t("nextStep.title")}
          </h2>
          <p className="text-sm leading-7 text-text-secondary">{t("nextStep.note")}</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/patient/matching"
            className="inline-flex items-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            {t("nextStep.startMatching")}
          </Link>
          <Link
            href="/patient/practitioners"
            className="inline-flex items-center rounded-2xl border border-border-light px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-primary hover:bg-primary-light hover:text-primary dark:text-white/90"
          >
            {t("nextStep.browsePractitioners")}
          </Link>
        </div>
      </section>
    </article>
  );
}
