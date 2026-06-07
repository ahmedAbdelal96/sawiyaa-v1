import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchPublicArticles } from "@/features/articles-public/api/articles-public-ssr.api";
import PublicArticleCard from "@/features/articles-public/components/PublicArticleCard";

type Props = {
  locale: string;
};

export default async function ArticlesPreviewSection({ locale }: Props) {
  const t = await getTranslations("home.articles");

  let articles: Awaited<ReturnType<typeof fetchPublicArticles>>["items"] = [];

  try {
    const data = await fetchPublicArticles(locale, { page: 1, limit: 3 });
    articles = data.items;
  } catch {
    // Silently fail — show minimal teaser instead of error card
  }

  // Minimal teaser when no articles are available
  if (articles.length === 0) {
    return (
      <section className="px-6 py-12 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/75">
                {t("eyebrow")}
              </p>
              <p className="mt-2 text-lg font-bold text-text-primary dark:text-white/90">
                {t("title")}
              </p>
            </div>
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover"
            >
              {t("viewAll")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-14 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary/75">
              {t("eyebrow")}
            </p>
            <h2 className="text-2xl font-bold text-text-primary dark:text-white/92">
              {t("title")}
            </h2>
          </div>
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover"
          >
            {t("viewAll")}
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {articles.map((article) => (
            <PublicArticleCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </section>
  );
}