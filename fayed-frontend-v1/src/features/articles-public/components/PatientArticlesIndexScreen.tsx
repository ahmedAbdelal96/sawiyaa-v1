import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PatientArticleCard from "./PatientArticleCard";
import type { PublicArticlesListData } from "../types/articles-public.types";

type Props = {
  data: PublicArticlesListData;
};

export default async function PatientArticlesIndexScreen({ data }: Props) {
  const t = await getTranslations("public-articles.patient");

  if (data.items.length === 0) {
    return (
      <section className="app-panel rounded-[32px] p-8 text-center">
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
          href="/patient/practitioners"
          className="mt-6 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white"
        >
          {t("empty.cta")}
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="app-panel rounded-[32px] p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          {t("list.eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-text-primary dark:text-white/92 sm:text-4xl">
          {t("list.title")}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
          {t("list.description")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {data.items.map((article) => (
          <PatientArticleCard key={article.id} article={article} />
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
                href={`/patient/articles?page=${data.pagination.page - 1}` as never}
                className="rounded-xl border border-border-light px-4 py-2 font-medium text-text-primary dark:text-white/90"
              >
                {t("pagination.previous")}
              </Link>
            ) : null}
            {data.pagination.page < data.pagination.totalPages ? (
              <Link
                href={`/patient/articles?page=${data.pagination.page + 1}` as never}
                className="rounded-xl bg-primary px-4 py-2 font-semibold text-white"
              >
                {t("pagination.next")}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="app-panel-soft rounded-[28px] p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-text-primary dark:text-white/95">
          {t("boundary.heading")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{t("boundary.note")}</p>
      </section>
    </section>
  );
}
