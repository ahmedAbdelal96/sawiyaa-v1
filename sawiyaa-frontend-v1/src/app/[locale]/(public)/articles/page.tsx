import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import PublicPageState from "@/components/public/PublicPageState";
import { buildPublicMetadata } from "@/lib/seo/public-metadata";
import PublicArticlesIndexScreen from "@/features/articles-public/components/PublicArticlesIndexScreen";
import { fetchPublicArticles } from "@/features/articles-public/api/articles-public-ssr.api";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public-articles.meta" });

  return buildPublicMetadata({
    locale,
    pathname: "/articles",
    title: t("title"),
    description: t("description"),
  });
}

export default async function PublicArticlesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { page = "1" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const tUnavailable = await getTranslations({
    locale,
    namespace: "public-pages.unavailable",
  });

  let data: Awaited<ReturnType<typeof fetchPublicArticles>>;
  try {
    data = await fetchPublicArticles(locale, {
      page: currentPage,
      limit: 9,
    });
  } catch {
    return (
      <PublicPageState
        compact
        icon={<AlertTriangle size={36} />}
        eyebrow={tUnavailable("eyebrow")}
        title={tUnavailable("title")}
        description={tUnavailable("description")}
        actions={[
          { href: "/articles", label: tUnavailable("retry"), primary: true },
          { href: "/practitioners", label: tUnavailable("practitioners") },
        ]}
      />
    );
  }

  return <PublicArticlesIndexScreen data={data} />;
}
