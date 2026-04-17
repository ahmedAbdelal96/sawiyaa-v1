import { getTranslations } from "next-intl/server";

type Props = {
  totalCount: number;
  filteredCount: number;
};

export default async function ListingPageHero({ totalCount, filteredCount }: Props) {
  const t = await getTranslations("practitioners-listing.page");
  const countLabel =
    filteredCount === 1
      ? t("resultCountSingle")
      : t("resultCount", { count: filteredCount });

  return (
    <div className="border-b border-border-light bg-background px-6 py-4 dark:border-border-light dark:bg-background">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 lg:items-end lg:justify-between ltr:lg:flex-row rtl:lg:flex-row-reverse">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
              {t("breadcrumb")}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("title")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">{t("subtitle")}</p>
          </div>

          <div className="w-full max-w-[380px] rounded-2xl border border-border-light bg-surface px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
              {t("breadcrumb")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white/90">
              {countLabel}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {t("showingOf", { count: filteredCount, total: totalCount })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
