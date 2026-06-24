import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type QuickNavItem = {
  href: string;
  label: string;
};

type Props = {
  totalCount: number;
  categoryCount: number;
  query: string;
  quickNav: QuickNavItem[];
};

export default async function SpecialtiesPageHero({
  totalCount,
  categoryCount,
  query,
  quickNav,
}: Props) {
  const t = await getTranslations("specialties-public.listing");

  const countLabel =
    totalCount === 1 ? t("resultCountSingle") : t("resultCount", { count: totalCount });
  const categoryLabel =
    categoryCount === 1
      ? t("categoryCountSingle")
      : t("categoryCount", { count: categoryCount });

  return (
    <div className="app-page-hero px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <p className="mb-3 text-sm text-text-muted">
          <span className="text-primary">Sawiyaa</span>
          {" / "}
          <span>{t("breadcrumb")}</span>
        </p>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
              {t("eyebrow")}
            </p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.03em] text-text-primary md:text-5xl dark:text-white/92">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-text-secondary">
              {t("subtitle")}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="app-panel rounded-2xl px-4 py-3">
                <p className="text-xs font-medium text-text-muted">
                  {t("summarySpecialties")}
                </p>
                <p className="mt-1 text-lg font-semibold text-text-primary dark:text-white/90">
                  {countLabel}
                </p>
              </div>

              <div className="app-panel rounded-2xl px-4 py-3">
                <p className="text-xs font-medium text-text-muted">
                  {t("summaryCategories")}
                </p>
                <p className="mt-1 text-lg font-semibold text-text-primary dark:text-white/90">
                  {categoryLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="app-panel rounded-[30px] p-5">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-text-primary dark:text-white/90">
                {t("searchTitle")}
              </h2>
              <p className="mt-2 text-sm leading-7 text-text-secondary">
                {t("searchSubtitle")}
              </p>
            </div>

            <form method="get" className="space-y-3">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-text-primary dark:text-white/85">
                  {t("search.label")}
                </span>
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder={t("search.placeholder")}
                  className="app-control-subtle w-full px-4 py-3"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
                >
                  {t("search.submit")}
                </button>

                {query ? (
                  <Link
                    href="/specialties"
                    className="app-panel inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium text-text-secondary transition hover:bg-primary-light"
                  >
                    {t("search.clear")}
                  </Link>
                ) : null}
              </div>
            </form>

            <div className="mt-5 border-t border-border-light pt-4 dark:border-border-light">
              <p className="mb-3 text-sm font-medium text-text-primary dark:text-white/85">
                {t("quickNavTitle")}
              </p>
              <div className="flex flex-wrap gap-2">
                {quickNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="app-chip rounded-full px-3 py-2 text-sm transition hover:bg-primary-light hover:text-text-brand"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {query ? (
              <p className="app-panel-soft mt-4 rounded-2xl px-4 py-3 text-sm text-text-secondary">
                {t("search.current", { query })}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
