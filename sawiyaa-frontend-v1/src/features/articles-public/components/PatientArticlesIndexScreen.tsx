import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BookOpen, Compass, RotateCcw, Search, Sparkles } from "lucide-react";
import PatientArticleCard from "./PatientArticleCard";
import type { PublicArticlesListData } from "../types/articles-public.types";
import type {
  PublicSpecialtyCategoryFilterItem,
  PublicSpecialtyFilterItem,
} from "../api/articles-public-ssr.api";
import {
  getLocalizedSpecialtyCategoryName,
  getLocalizedSpecialtyName,
} from "@/features/specialties/utils/localized-specialty";

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
  const normalizedRootFilter = filters.categoryRoot.trim().toLowerCase();
  const formAction = `/${locale}/patient/articles`;

  const rootOptions = specialtyCategories
    .map((item) => ({
      value: item.slug.trim().toLowerCase(),
      label: getLocalizedSpecialtyCategoryName(
        {
          name: item.name,
          nameAr: item.nameAr ?? null,
          nameEn: item.nameEn ?? null,
          slug: item.slug,
        },
        locale,
      ),
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
      title: getLocalizedSpecialtyName(
        {
          name: item.name,
          nameAr: item.nameAr ?? null,
          nameEn: item.nameEn ?? null,
          slug: item.slug,
        },
        locale,
      ),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const hasActiveFilters = Boolean(filters.q || filters.categoryRoot || filters.categorySlug);

  return (
    <div className="space-y-6 text-start">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-r from-primary-light/40 via-teal-50/30 to-white p-5 sm:p-7 shadow-xs dark:from-primary/10 dark:via-surface-secondary dark:to-surface-secondary dark:border-primary/25">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
              <Sparkles className="h-3.5 w-3.5" />
              <span>محتوى نفسي وتثقيفي موثوق</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary dark:text-white">
              مقالات تدعم خطوتك القادمة
            </h1>
            <p className="text-xs sm:text-sm leading-relaxed text-text-secondary dark:text-text-muted">
              اقرأ مقالات وإرشادات متخصصة لمساعدتك على فهم نفسك وتطوير صحتك النفسية بهدوء ووعي.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-2xl border border-border-light bg-white/90 p-3.5 text-center shadow-xs dark:bg-surface-secondary dark:border-border-dark">
              <p className="text-2xl font-extrabold text-primary font-mono">{data.pagination.totalItems}</p>
              <p className="text-[11px] font-semibold text-text-muted mt-0.5">مقال متاح</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter & Category Toolbar */}
      <form method="GET" action={formAction} className="rounded-3xl border border-border-light/80 bg-white p-4 shadow-2xs dark:bg-surface-secondary dark:border-border-dark space-y-3">
        <input type="hidden" name="page" value="1" />
        <div className="flex flex-col md:flex-row gap-2.5">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              name="q"
              defaultValue={filters.q}
              placeholder="ابحث عن موضوع، مثل: النوم، التوتر، العلاقات..."
              className="w-full rounded-2xl border border-border-light bg-surface-tertiary/40 py-2.5 ps-10 pe-4 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark"
            />
          </div>

          {/* Sub-specialty Dropdown */}
          {subOptions.length > 0 && (
            <div className="w-full md:w-56">
              <select
                name="categorySlug"
                defaultValue={filters.categorySlug}
                className="w-full rounded-2xl border border-border-light bg-surface-tertiary/40 py-2.5 px-3 text-xs sm:text-sm font-semibold text-text-primary focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark cursor-pointer"
              >
                <option value="">كل الفروع</option>
                {subOptions.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Submit and Reset */}
          <div className="flex gap-2 shrink-0">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition cursor-pointer"
            >
              بحث
            </button>
            {hasActiveFilters && (
              <Link
                href="/patient/articles"
                className="inline-flex items-center justify-center gap-1 rounded-2xl border border-border-light bg-white px-3.5 py-2.5 text-xs font-semibold text-text-secondary hover:border-primary hover:text-text-primary transition dark:bg-surface-secondary dark:border-border-dark"
                title="إعادة الضبط"
              >
                <RotateCcw size={13} />
              </Link>
            )}
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border-light/60">
          <Link
            href="/patient/articles"
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              !filters.categoryRoot
                ? "border-primary bg-primary text-white shadow-xs"
                : "border-border-light bg-white text-text-secondary hover:border-primary/40 hover:text-text-primary dark:bg-surface-secondary dark:border-border-dark"
            }`}
          >
            الكل
          </Link>
          {rootOptions.map((root) => {
            const isSelected = normalizedRootFilter === root.value;
            return (
              <Link
                key={root.value}
                href={
                  createPageHref({
                    page: 1,
                    q: filters.q,
                    categoryRoot: isSelected ? "" : root.value,
                    categorySlug: "",
                  }) as never
                }
                className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary text-white shadow-xs"
                    : "border-border-light bg-white text-text-secondary hover:border-primary/40 hover:text-text-primary dark:bg-surface-secondary dark:border-border-dark"
                }`}
              >
                {root.label}
              </Link>
            );
          })}
        </div>
      </form>

      {/* Articles Grid / Empty State */}
      {data.items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((article) => (
            <PatientArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <section className="rounded-3xl border border-border-light/80 bg-white p-8 text-center shadow-xs dark:bg-surface-secondary dark:border-border-dark max-w-lg mx-auto space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/20">
            <BookOpen size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-text-primary dark:text-white">
              {t("empty.title")}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {t("empty.description")}
            </p>
          </div>
          <Link
            href="/patient/articles"
            className="inline-flex rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition"
          >
            عرض كافة المقالات
          </Link>
        </section>
      )}

      {/* Pagination */}
      {data.pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between rounded-2xl border border-border-light bg-white px-5 py-3.5 text-xs font-semibold dark:bg-surface-secondary dark:border-border-dark">
          <span className="text-text-secondary">
            {t("pagination.status", {
              page: data.pagination.page,
              totalPages: data.pagination.totalPages,
            })}
          </span>
          <div className="flex gap-2">
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
                className="rounded-xl border border-border-light px-3.5 py-1.5 text-text-primary hover:border-primary transition dark:bg-surface-secondary"
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
                className="rounded-xl bg-primary px-3.5 py-1.5 text-white hover:bg-primary-hover transition shadow-xs"
              >
                {t("pagination.next")}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
