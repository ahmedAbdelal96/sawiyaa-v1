import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PublicArticleTrustBadges from "./PublicArticleTrustBadges";
import type { PublicArticleListItem } from "../types/articles-public.types";
import { resolveCoverImageUrl } from "../lib/resolve-cover-image-url";

type Props = {
  article: PublicArticleListItem;
};

export default async function PublicArticleCard({ article }: Props) {
  const [t, locale, format] = await Promise.all([
    getTranslations("public-articles"),
    getLocale(),
    getFormatter(),
  ]);

  const isAr = locale === "ar";
  const publishedLabel = article.publishedAt
    ? format.dateTime(new Date(article.publishedAt), {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : t("card.noPublishDate");
  const coverImageUrl = resolveCoverImageUrl(article.coverImageUrl);

  return (
    <article className="app-panel app-lift overflow-hidden rounded-[30px] border border-border-light/80">
      {coverImageUrl ? (
        <div className="aspect-[16/9] overflow-hidden bg-surface-tertiary p-2 dark:bg-white/5">
          <img
            src={coverImageUrl}
            alt={article.title}
            className="h-full w-full rounded-xl object-contain"
          />
        </div>
      ) : (
        <div className="flex aspect-[16/9] items-end bg-primary-light p-5 dark:bg-primary/15">
          <span className="rounded-full bg-surface-secondary/92 px-3 py-1 text-xs font-semibold text-text-primary shadow-sm dark:bg-surface-secondary">
            {article.category?.title ?? t("card.generalCategory")}
          </span>
        </div>
      )}

      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
          {article.category?.title ? (
            <span className="rounded-full bg-surface-tertiary px-3 py-1 dark:bg-white/6">
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

        <div className="space-y-3">
          <h3 className="text-xl font-bold tracking-[-0.02em] text-text-primary dark:text-white/92">
            {article.title}
          </h3>
          <p className="text-sm leading-7 text-text-secondary">
            {article.excerpt ?? t("card.noExcerpt")}
          </p>
        </div>

        <PublicArticleTrustBadges trust={article.trust} />

        <Link
          href={`/articles/${article.slug}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          {t("card.readArticle")}
          <span className={isAr ? "rotate-180" : ""}>→</span>
        </Link>
      </div>
    </article>
  );
}
