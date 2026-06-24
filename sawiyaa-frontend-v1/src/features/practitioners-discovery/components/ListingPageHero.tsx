import { getTranslations } from "next-intl/server";

export default async function ListingPageHero() {
  const t = await getTranslations("practitioners-listing.page");

  return (
    <div className="border-b border-border-light bg-background px-6 py-4 dark:border-border-light dark:bg-background">
      <div className="mx-auto max-w-7xl">
        <div className="text-start">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            {t("breadcrumb")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">{t("subtitle")}</p>
        </div>
      </div>
    </div>
  );
}

