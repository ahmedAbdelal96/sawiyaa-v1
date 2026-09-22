import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, BookOpen, Calendar, Clock, User } from "lucide-react";
import type { PublicArticleListItem } from "../types/articles-public.types";
import { resolveCoverImageUrl } from "../lib/resolve-cover-image-url";

type Props = {
  article: PublicArticleListItem;
};

export default async function PatientArticleCard({ article }: Props) {
  const [t, locale, format] = await Promise.all([
    getTranslations("public-articles.patient.card"),
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
    : t("noPublishDate");
  const coverImageUrl = resolveCoverImageUrl(article.coverImageUrl);

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border-light/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:bg-surface-secondary dark:border-border-dark text-start">
      {/* Top Image / Cover */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-tertiary dark:bg-surface-tertiary">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/15 via-teal-500/10 to-primary/5 text-primary">
            <BookOpen className="h-10 w-10 opacity-60" />
          </div>
        )}

        {/* Category Pill Overlaid */}
        {article.category?.title && (
          <div className="absolute start-3 top-3">
            <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-primary shadow-xs backdrop-blur-xs dark:bg-surface-secondary/90 dark:text-primary-light">
              {article.category.title}
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
        <div className="space-y-2">
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>{publishedLabel}</span>
            </span>
            {article.trust.authorDisplayName && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium truncate max-w-[150px]">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>{article.trust.authorDisplayName}</span>
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h3
            dir="auto"
            className="text-base sm:text-lg font-bold text-text-primary dark:text-white group-hover:text-primary transition-colors line-clamp-2 leading-snug"
          >
            {article.title}
          </h3>

          {/* Excerpt */}
          <p
            dir="auto"
            className="text-xs sm:text-sm text-text-secondary dark:text-text-muted leading-relaxed line-clamp-2"
          >
            {article.excerpt ?? t("noExcerpt")}
          </p>
        </div>

        {/* Card Footer CTA */}
        <div className="border-t border-border-light/60 pt-3 flex items-center justify-between">
          <span className="text-[11px] font-medium text-text-muted flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>4 دقائق قراءة</span>
          </span>

          <Link
            href={`/patient/articles/${article.slug}` as never}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform"
          >
            <span>{t("readArticle")}</span>
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </article>
  );
}

