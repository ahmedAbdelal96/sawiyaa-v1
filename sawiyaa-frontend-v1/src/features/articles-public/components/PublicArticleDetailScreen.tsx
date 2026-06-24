import { getFormatter, getTranslations } from "next-intl/server";
import type { PublicArticleDetails } from "../types/articles-public.types";
import ArticleDetailShell from "./ArticleDetailShell";

type Props = {
  article: PublicArticleDetails;
};

export default async function PublicArticleDetailScreen({ article }: Props) {
  const [t, format] = await Promise.all([
    getTranslations("public-articles.detail"),
    getFormatter(),
  ]);

  const publishedLabel = article.publishedAt
    ? format.dateTime(new Date(article.publishedAt), {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : t("noPublishDate");

  const authorLabel = article.trust.authorDisplayName
    ? t("byAuthor", { author: article.trust.authorDisplayName })
    : null;

  return (
    <ArticleDetailShell
      article={article}
      backHref="/articles"
      backLabel={t("backToArticles")}
      publishedLabel={publishedLabel}
      authorLabel={authorLabel}
      nextStepTitle={t("nextStep.title")}
      nextStepNote={t("nextStep.note")}
      readingNotesLabel={t("readingNotes")}
      publicationLabel={t("publicationLabel")}
      authorHeadingLabel={t("authorLabel")}
      trustHeadingLabel={t("trustLabel")}
      primaryCtaHref="/signup?mode=patient"
      primaryCtaLabel={t("nextStep.startMatching")}
      secondaryCtaHref="/practitioners"
      secondaryCtaLabel={t("nextStep.browsePractitioners")}
    />
  );
}
