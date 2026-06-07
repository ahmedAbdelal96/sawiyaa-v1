import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PublicArticleTrustBadges from "./PublicArticleTrustBadges";
import type { PublicArticleDetails } from "../types/articles-public.types";
import { resolveCoverImageUrl } from "../lib/resolve-cover-image-url";

type Props = {
  article: PublicArticleDetails;
};

export default async function PublicArticleDetailScreen({ article }: Props) {
  const [t, format, locale] = await Promise.all([
    getTranslations("public-articles.detail"),
    getFormatter(),
    getLocale(),
  ]);

  const isAr = locale === "ar";
  const publishedLabel = article.publishedAt
    ? format.dateTime(new Date(article.publishedAt), {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : t("noPublishDate");
  const coverImageUrl = resolveCoverImageUrl(article.coverImageUrl);

  return (
    <div className="px-4 sm:px-5">
      {/* Back link */}
      <Link
        href="/articles"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
      >
        <span className={isAr ? "rotate-180" : ""}>←</span>
        {t("backToArticles")}
      </Link>

      {/* Article reader */}
      <div className="space-y-4">
        {/* Article header card */}
        <div className="rounded-[20px] border border-[#d9e0e6] bg-white px-5 py-[18px] shadow-[0_4px_12px_-4px_rgba(34,52,56,0.10),0_2px_4px_-2px_rgba(34,52,56,0.04)] dark:border-[rgba(143,198,191,0.16)] dark:bg-[#15201f] dark:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.24)]">
          {/* Meta row: category chip + date + author */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[#7a8891] rtl:flex-row-reverse">
            {article.category?.title ? (
              <span className="rounded-full bg-[#f7f9fb] px-3 py-1 font-medium dark:bg-[rgba(255,255,255,0.06)] dark:text-[rgba(181,194,192,0.58)]">
                {article.category.title}
              </span>
            ) : null}
            <span>{publishedLabel}</span>
            {article.trust.authorDisplayName ? (
              <span>{t("byAuthor", { author: article.trust.authorDisplayName })}</span>
            ) : null}
          </div>

          {/* Title */}
          <h1 className="mb-3 text-[22px] font-semibold leading-[31px] tracking-[-0.02em] text-[#1f2a2d] dark:text-[rgba(242,247,246,0.96)] rtl:text-right">
            {article.title}
          </h1>

          {/* Excerpt */}
          {article.excerpt ? (
            <p className="text-[14px] leading-[24px] text-[#56656b] rtl:text-right">
              {article.excerpt}
            </p>
          ) : null}
        </div>

        {/* Cover image */}
        {coverImageUrl ? (
          <div className="overflow-hidden rounded-[20px] border border-[#d9e0e6] bg-white dark:border-[rgba(143,198,191,0.16)] dark:bg-[#15201f]">
            <img
              src={coverImageUrl}
              alt={article.title}
              className="h-[180px] w-full object-cover"
            />
          </div>
        ) : null}

        {/* Content reader card */}
        <div className="rounded-[20px] border border-[#d9e0e6] bg-white px-5 py-[18px] shadow-[0_4px_12px_-4px_rgba(34,52,56,0.10),0_2px_4px_-2px_rgba(34,52,56,0.04)] dark:border-[rgba(143,198,191,0.16)] dark:bg-[#15201f] dark:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.24)]">
          <div
            className="space-y-4 rtl:text-right"
            style={{
              fontSize: "15px",
              lineHeight: "27px",
              color: "#56656b",
            }}
          >
            {/* Simple markdown-style renderer */}
            {article.content.split("\n\n").map((block, i) => {
              const trimmed = block.trim();
              if (!trimmed) return null;
              if (trimmed.startsWith("# ")) {
                return (
                  <h1
                    key={i}
                    className="text-[20px] font-semibold leading-[29px] tracking-[-0.02em] text-[#1f2a2d] dark:text-[rgba(242,247,246,0.96)] rtl:text-right"
                  >
                    {trimmed.slice(2)}
                  </h1>
                );
              }
              if (trimmed.startsWith("## ")) {
                return (
                  <h2
                    key={i}
                    className="text-[18px] font-semibold leading-[27px] tracking-[-0.01em] text-[#1f2a2d] dark:text-[rgba(242,247,246,0.96)] rtl:text-right"
                  >
                    {trimmed.slice(3)}
                  </h2>
                );
              }
              if (trimmed.startsWith("### ")) {
                return (
                  <h3
                    key={i}
                    className="text-[16px] font-semibold leading-[25px] text-[#1f2a2d] dark:text-[rgba(242,247,246,0.96)] rtl:text-right"
                  >
                    {trimmed.slice(4)}
                  </h3>
                );
              }
              // Regular paragraph
              return (
                <p
                  key={i}
                  className="rtl:text-right"
                  style={{ marginBottom: "12px" }}
                >
                  {trimmed}
                </p>
              );
            })}
          </div>
        </div>

        {/* Trust badges */}
        <PublicArticleTrustBadges trust={article.trust} />

        {/* Bottom CTA */}
        <div className="rounded-[20px] border border-[#d9e0e6] bg-white px-5 py-[18px] shadow-[0_4px_12px_-4px_rgba(34,52,56,0.10),0_2px_4px_-2px_rgba(34,52,56,0.04)] dark:border-[rgba(143,198,191,0.16)] dark:bg-[#15201f] dark:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.24)]">
          <h2 className="mb-2 text-[18px] font-semibold leading-[27px] tracking-[-0.01em] text-[#1f2a2d] dark:text-[rgba(242,247,246,0.96)] rtl:text-right">
            {t("nextStep.title")}
          </h2>
          <p className="mb-5 text-[14px] leading-[23px] text-[#56656b] rtl:text-right">
            {t("nextStep.note")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup?mode=patient"
              className="inline-flex items-center rounded-2xl bg-[#44a194] px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-[#3d9286]"
            >
              {t("nextStep.startMatching")}
            </Link>
            <Link
              href="/practitioners"
              className="inline-flex items-center rounded-2xl border border-[#d9e0e6] px-5 py-3 text-[14px] font-semibold text-[#1f2a2d] transition hover:border-[#44a194] hover:bg-[#e8f4f2] hover:text-[#44a194] dark:text-[rgba(242,247,246,0.90)] dark:border-[rgba(143,198,191,0.28)] dark:hover:bg-[rgba(99,201,188,0.10)] dark:hover:text-[#63c9bc]"
            >
              {t("nextStep.browsePractitioners")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}