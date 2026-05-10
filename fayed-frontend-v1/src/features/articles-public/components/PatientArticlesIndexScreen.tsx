import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PatientArticleCard from "./PatientArticleCard";
import type { PublicArticlesListData } from "../types/articles-public.types";
import type {
  PublicSpecialtyCategoryFilterItem,
  PublicSpecialtyFilterItem,
} from "../api/articles-public-ssr.api";

type Props = {
  data: PublicArticlesListData;
  locale: string;
  specialtyCategories: PublicSpecialtyCategoryFilterItem[];
  specialties: PublicSpecialtyFilterItem[];
  filters: {
    q: string;
    categoryRoot: string;
    categorySlug: string;
  };
};

function createPageHref(input: {
  page: number;
  q: string;
  categoryRoot: string;
  categorySlug: string;
}) {
  const search = new URLSearchParams();
  search.set("page", String(input.page));
  if (input.q) search.set("q", input.q);
  if (input.categoryRoot) search.set("categoryRoot", input.categoryRoot);
  if (input.categorySlug) search.set("categorySlug", input.categorySlug);
  return `/patient/articles?${search.toString()}`;
}

export default async function PatientArticlesIndexScreen({
  data,
  locale,
  specialtyCategories,
  specialties,
  filters,
}: Props) {
  const t = await getTranslations("public-articles.patient");
  const isArabic = locale.startsWith("ar");
  const normalizedRootFilter = filters.categoryRoot.trim().toLowerCase();
  const formAction = `/${locale}/patient/articles`;

  const rootLabel = isArabic ? "التخصص الرئيسي" : "Main specialty";
  const subLabel = isArabic ? "التخصص الفرعي" : "Sub-specialty";
  const searchLabel = isArabic ? "ابحث بعنوان المقال" : "Search by article title";
  const searchPlaceholder = isArabic
    ? "مثال: القلق، النوم، الاكتئاب..."
    : "e.g. anxiety, sleep, depression...";
  const applyLabel = isArabic ? "تطبيق" : "Apply";
  const resetLabel = isArabic ? "إعادة ضبط" : "Reset";
  const allMainLabel = isArabic ? "كل التخصصات الرئيسية" : "All main specialties";
  const allSubLabel = isArabic ? "كل التخصصات الفرعية" : "All sub-specialties";

  const rootOptions = specialtyCategories
    .map((item) => ({
      value: item.slug.trim().toLowerCase(),
      label: item.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const subOptions = specialties
    .filter((item) => {
      const categorySlug = item.category?.slug?.trim().toLowerCase();
      if (!categorySlug) return false;
      if (!normalizedRootFilter) return true;
      return categorySlug === normalizedRootFilter;
    })
    .map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.name ?? item.slug,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const filterForm = (
    <form method="GET" action={formAction} className="app-panel rounded-[28px] p-5 sm:p-6">
      <div className="grid gap-3 lg:grid-cols-4">
        <input type="hidden" name="page" value="1" />
        <input
          type="text"
          name="q"
          defaultValue={filters.q}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
          className="rounded-xl border border-border-light bg-white px-4 py-2.5 text-sm text-text-primary dark:bg-white/5 dark:text-white"
        />
        <select
          name="categoryRoot"
          defaultValue={filters.categoryRoot}
          aria-label={rootLabel}
          className="rounded-xl border border-border-light bg-white px-4 py-2.5 text-sm text-text-primary dark:bg-white/5 dark:text-white"
        >
          <option value="">{allMainLabel}</option>
          {rootOptions.map((root) => (
            <option key={root.value} value={root.value}>
              {root.label}
            </option>
          ))}
        </select>
        <select
          name="categorySlug"
          defaultValue={filters.categorySlug}
          aria-label={subLabel}
          className="rounded-xl border border-border-light bg-white px-4 py-2.5 text-sm text-text-primary dark:bg-white/5 dark:text-white"
        >
          <option value="">{allSubLabel}</option>
          {subOptions.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.title}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            {applyLabel}
          </button>
          <Link
            href="/patient/articles"
            className="inline-flex w-full items-center justify-center rounded-xl border border-border-light px-4 py-2.5 text-sm font-medium text-text-primary dark:text-white/90"
          >
            {resetLabel}
          </Link>
        </div>
      </div>
    </form>
  );

  if (data.items.length === 0) {
    return (
      <section className="space-y-6">
        {filterForm}
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
      </section>
    );
  }

  return (
    <section className="space-y-8">
      {filterForm}

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
                href={
                  createPageHref({
                    page: data.pagination.page - 1,
                    q: filters.q,
                    categoryRoot: filters.categoryRoot,
                    categorySlug: filters.categorySlug,
                  }) as never
                }
                className="rounded-xl border border-border-light px-4 py-2 font-medium text-text-primary dark:text-white/90"
              >
                {t("pagination.previous")}
              </Link>
            ) : null}
            {data.pagination.page < data.pagination.totalPages ? (
              <Link
                href={
                  createPageHref({
                    page: data.pagination.page + 1,
                    q: filters.q,
                    categoryRoot: filters.categoryRoot,
                    categorySlug: filters.categorySlug,
                  }) as never
                }
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
