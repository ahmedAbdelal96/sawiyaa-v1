import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PublicArticleCard from "./PublicArticleCard";
import type { PublicArticlesListData } from "../types/articles-public.types";

type Props = {
  data: PublicArticlesListData;
};

export default async function PublicArticlesIndexScreen({ data }: Props) {
  const t = await getTranslations("public-articles");

  if (data.items.length === 0) {
    return (
      <section className="px-6 py-16">
        <div className="app-panel mx-auto max-w-4xl rounded-[32px] p-8 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
            {t("empty.eyebrow")}
          </p>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white/92">
            {t("empty.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-text-secondary">
            {t("empty.description")}
          </p>
          <Link
            href="/practitioners"
            className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white"
          >
            {t("empty.cta")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-surface px-6 py-12 dark:bg-surface">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
            {t("list.eyebrow")}
          </p>
          <h1 className="text-4xl font-bold tracking-[-0.03em] text-text-primary dark:text-white/92">
            {t("list.title")}
          </h1>
          <p className="text-base leading-8 text-text-secondary">
            {t("list.description")}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {data.items.map((article) => (
            <PublicArticleCard key={article.id} article={article} />
          ))}
        </div>

        {data.pagination.totalPages > 1 ? (
          <div className="app-panel-soft flex items-center justify-between rounded-[24px] px-5 py-4 text-sm">
            <span className="text-text-secondary">
              {t("pagination.status", {
                page: data.pagination.page,
                totalPages: data.pagination.totalPages,
              })}
            </span>
            <div className="flex gap-3">
              {data.pagination.page > 1 ? (
                <Link
                  href={`/articles?page=${data.pagination.page - 1}`}
                  className="rounded-xl border border-border-light px-4 py-2 font-medium text-text-primary dark:text-white/90"
                >
                  {t("pagination.previous")}
                </Link>
              ) : null}
              {data.pagination.page < data.pagination.totalPages ? (
                <Link
                  href={`/articles?page=${data.pagination.page + 1}`}
                  className="rounded-xl bg-primary px-4 py-2 font-semibold text-white"
                >
                  {t("pagination.next")}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
