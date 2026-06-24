import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import PublicPageState from "@/components/public/PublicPageState";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";
import PublicArticleDetailScreen from "@/features/articles-public/components/PublicArticleDetailScreen";
import { fetchPublicArticleBySlug } from "@/features/articles-public/api/articles-public-ssr.api";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const fallback = await getTranslations({
    locale,
    namespace: "public-pages.meta.articleFallback",
  });

  try {
    const article = await fetchPublicArticleBySlug(slug, locale);
    if (!article) {
      return buildPublicMetadata({
        locale,
        pathname: `/articles/${slug}`,
        title: fallback("title"),
        description: fallback("description"),
      });
    }

    return buildPublicMetadata({
      locale,
      pathname: `/articles/${slug}`,
      title: article.seo.metaTitle ?? article.title,
      description:
        article.seo.metaDescription ?? article.excerpt ?? fallback("description"),
    });
  } catch {
    return buildPublicMetadata({
      locale,
      pathname: `/articles/${slug}`,
      title: fallback("title"),
      description: fallback("description"),
    });
  }
}

export default async function PublicArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const tUnavailable = await getTranslations({
    locale,
    namespace: "public-pages.unavailable",
  });

  let article: Awaited<ReturnType<typeof fetchPublicArticleBySlug>>;
  try {
    article = await fetchPublicArticleBySlug(slug, locale);
  } catch {
    return (
      <PublicPageState
        compact
        icon={<AlertTriangle size={36} />}
        eyebrow={tUnavailable("eyebrow")}
        title={tUnavailable("title")}
        description={tUnavailable("description")}
        actions={[
          { href: `/articles/${slug}`, label: tUnavailable("retry"), primary: true },
          { href: "/articles", label: tUnavailable("articles") },
        ]}
      />
    );
  }

  if (!article) notFound();

  return <PublicArticleDetailScreen article={article} />;
}
