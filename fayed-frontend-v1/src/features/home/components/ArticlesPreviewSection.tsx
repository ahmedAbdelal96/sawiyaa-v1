import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchPublicArticles } from "@/features/articles-public/api/articles-public-ssr.api";
import PublicArticleCard from "@/features/articles-public/components/PublicArticleCard";

type Props = {
  locale: string;
};

export default async function ArticlesPreviewSection({ locale }: Props) {
  const t = await getTranslations("home.articles");

  let data;
  try {
    data = await fetchPublicArticles(locale, { page: 1, limit: 3 });
  } catch {
    return (
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="app-panel rounded-[32px] p-7 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
              {t("eyebrow")}
            </p>
            <h2 className="text-2xl font-bold text-text-primary dark:text-white/92">
              {t("unavailableTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
              {t("unavailableNote")}
            </p>
            <Link
              href="/practitioners"
              className="mt-6 inline-flex rounded-2xl border border-border-light px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-primary hover:bg-primary-light hover:text-primary dark:text-white/90"
            >
              {t("viewPractitioners")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (data.items.length === 0) {
    return (
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="app-panel rounded-[32px] p-7 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
              {t("eyebrow")}
            </p>
            <h2 className="text-2xl font-bold text-text-primary dark:text-white/92">
              {t("emptyTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
              {t("emptyNote")}
            </p>
            <Link
              href="/practitioners"
              className="mt-6 inline-flex rounded-2xl border border-border-light px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-primary hover:bg-primary-light hover:text-primary dark:text-white/90"
            >
              {t("viewPractitioners")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
            {t("eyebrow")}
          </p>
          <h2 className="mb-4 text-3xl font-bold text-text-primary md:text-4xl dark:text-white/92">
            {t("title")}
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-text-secondary">
            {t("subtitle")}
          </p>
        </div>

        <div className="space-y-8 rounded-[38px] bg-surface p-4 ring-1 ring-inset ring-border-light sm:p-6 dark:bg-surface dark:ring-border-light">
          <div className="grid gap-7 md:grid-cols-3">
            {data.items.map((article) => (
              <PublicArticleCard key={article.id} article={article} />
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/articles"
              className="inline-flex rounded-2xl border border-border-light px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-primary hover:text-primary dark:text-white/90"
            >
              {t("viewAll")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
